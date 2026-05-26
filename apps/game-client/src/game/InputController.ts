export interface InputState {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  jump: boolean;
}

export interface MouseState {
  deltaX: number;
  deltaY: number;
  scrollDelta: number;
  middleDown: boolean;
  locked: boolean;
}

const LOG_PREFIX = '[Input]';

export class InputController {
  private keys: Set<string> = new Set();
  private jumpPressed = false;

  private _deltaX = 0;
  private _deltaY = 0;
  private _scrollDelta = 0;
  private _middleClicked = false;
  private _rightDown = false;
  private _locked = false;
  private _canvas: HTMLCanvasElement | null = null;
  private _pointerLockSupported = false;
  private _pointerLockAttempts = 0;
  private _pointerLockSuccesses = 0;

  private readonly _handleKeyDown: (e: KeyboardEvent) => void;
  private readonly _handleKeyUp: (e: KeyboardEvent) => void;
  private readonly _handleMouseDown: (e: MouseEvent) => void;
  private readonly _handleMouseUp: (e: MouseEvent) => void;
  private readonly _handleMouseMove: (e: MouseEvent) => void;
  private readonly _handleWheel: (e: WheelEvent) => void;
  private readonly _handleContextMenu: (e: Event) => void;
  private readonly _handlePointerLockChange: () => void;
  private readonly _handlePointerLockError: () => void;
  private readonly _handleCanvasClick: (e: MouseEvent) => void;

  constructor() {
    this._pointerLockSupported = 'pointerLockElement' in document;
    console.log(`${LOG_PREFIX} Pointer lock supported: ${this._pointerLockSupported}`);

    this._handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ') this.jumpPressed = true;
    };

    this._handleKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };

    this._handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) this._rightDown = true;
      if (e.button === 1) { this._middleClicked = true; e.preventDefault(); }
    };

    this._handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) this._rightDown = false;
    };

    this._handleMouseMove = (e: MouseEvent) => {
      if (this._locked) {
        this._deltaX += e.movementX;
        this._deltaY += e.movementY;
      } else if (this._rightDown) {
        this._deltaX += e.movementX;
        this._deltaY += e.movementY;
      }
    };

    this._handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this._scrollDelta += e.deltaY;
      e.preventDefault();
    };

    this._handleContextMenu = (e: Event) => { e.preventDefault(); };

    this._handlePointerLockChange = () => {
      const wasLocked = this._locked;
      this._locked = document.pointerLockElement === this._canvas;
      if (this._locked && !wasLocked) {
        this._pointerLockSuccesses++;
        console.log(`${LOG_PREFIX} Pointer LOCKED (success #${this._pointerLockSuccesses})`);
      } else if (!this._locked && wasLocked) {
        console.log(`${LOG_PREFIX} Pointer UNLOCKED (ESC or blur)`);
      }
    };

    this._handlePointerLockError = () => {
      console.warn(`${LOG_PREFIX} Pointer lock ERROR — browser denied the request`);
    };

    this._handleCanvasClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (this._locked) return;

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        console.log(`${LOG_PREFIX} Click on text input — skipping lock`);
        return;
      }

      if (!this._canvas) {
        console.warn(`${LOG_PREFIX} No canvas reference — cannot request pointer lock`);
        return;
      }

      this._pointerLockAttempts++;
      console.log(`${LOG_PREFIX} Requesting pointer lock (attempt #${this._pointerLockAttempts})`);

      try {
        const result = this._canvas.requestPointerLock();
        if (result && typeof (result as Promise<void>).then === 'function') {
          (result as Promise<void>).then(() => {
            console.log(`${LOG_PREFIX} Pointer lock promise resolved`);
          }).catch((err: Error) => {
            console.warn(`${LOG_PREFIX} Pointer lock promise rejected:`, err.message);
          });
        }
      } catch (err) {
        console.error(`${LOG_PREFIX} requestPointerLock threw:`, err);
      }
    };

    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    window.addEventListener('mousedown', this._handleMouseDown);
    window.addEventListener('mouseup', this._handleMouseUp);
    window.addEventListener('mousemove', this._handleMouseMove);
    window.addEventListener('wheel', this._handleWheel, { passive: false });
    window.addEventListener('contextmenu', this._handleContextMenu);
    document.addEventListener('pointerlockchange', this._handlePointerLockChange);
    document.addEventListener('pointerlockerror', this._handlePointerLockError);

    console.log(`${LOG_PREFIX} InputController initialized, waiting for canvas attachment`);
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this._canvas = canvas;
    canvas.addEventListener('click', this._handleCanvasClick);
    console.log(`${LOG_PREFIX} Canvas attached: ${canvas.id || '(no id)'}, ${canvas.width}x${canvas.height}`);
    console.log(`${LOG_PREFIX} Controls: LEFT-CLICK canvas to capture mouse, RIGHT-CLICK+drag as fallback, WASD to move, SCROLL to zoom`);
  }

  isPointerLocked(): boolean {
    return this._locked;
  }

  getInput(): InputState {
    let moveX = 0;
    let moveZ = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) moveZ += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) moveZ -= 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) moveX -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) moveX += 1;
    return { moveX, moveZ, sprint: this.keys.has('shift'), jump: this.jumpPressed ? (this.jumpPressed = false, true) : false };
  }

  consumeMouse(): MouseState {
    const state: MouseState = {
      deltaX: this._deltaX,
      deltaY: this._deltaY,
      scrollDelta: this._scrollDelta,
      middleDown: this._middleClicked,
      locked: this._locked,
    };
    this._deltaX = 0;
    this._deltaY = 0;
    this._scrollDelta = 0;
    this._middleClicked = false;
    return state;
  }

  dispose(): void {
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    window.removeEventListener('mousedown', this._handleMouseDown);
    window.removeEventListener('mouseup', this._handleMouseUp);
    window.removeEventListener('mousemove', this._handleMouseMove);
    window.removeEventListener('wheel', this._handleWheel);
    window.removeEventListener('contextmenu', this._handleContextMenu);
    document.removeEventListener('pointerlockchange', this._handlePointerLockChange);
    document.removeEventListener('pointerlockerror', this._handlePointerLockError);
    if (this._canvas) {
      this._canvas.removeEventListener('click', this._handleCanvasClick);
    }
    if (this._locked) {
      document.exitPointerLock();
    }
    this.keys.clear();
    console.log(`${LOG_PREFIX} InputController disposed (locks: ${this._pointerLockSuccesses}/${this._pointerLockAttempts} succeeded)`);
  }
}
