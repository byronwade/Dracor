export interface InputState {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  jump: boolean;
}

export interface MouseState {
  locked: boolean;
  deltaX: number;
  deltaY: number;
  scrollDelta: number;
  middleDown: boolean;
}

export class InputController {
  private keys: Set<string> = new Set();
  private jumpPressed = false;

  private _deltaX = 0;
  private _deltaY = 0;
  private _scrollDelta = 0;
  private _middleClicked = false;
  private _locked = false;
  private canvas: HTMLCanvasElement | null = null;

  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;
  private readonly handleMouseMove: (e: MouseEvent) => void;
  private readonly handleWheel: (e: WheelEvent) => void;
  private readonly handleClick: (e: MouseEvent) => void;
  private readonly handlePointerLockChange: () => void;
  private readonly handleContextMenu: (e: Event) => void;

  constructor() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      this.keys.add(key);
      if (key === ' ') this.jumpPressed = true;
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (!this._locked) return;
      this._deltaX += e.movementX;
      this._deltaY += e.movementY;
    };

    this.handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this._scrollDelta += e.deltaY;
      e.preventDefault();
    };

    this.handleClick = (e: MouseEvent) => {
      if (e.button === 1) { this._middleClicked = true; e.preventDefault(); return; }
      if (!this._locked && this.canvas) {
        this.canvas.requestPointerLock();
      }
    };

    this.handlePointerLockChange = () => {
      this._locked = document.pointerLockElement === this.canvas;
    };

    this.handleContextMenu = (e: Event) => { e.preventDefault(); };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('mousedown', this.handleClick);
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
    const sprint = this.keys.has('shift');
    const jump = this.jumpPressed;
    this.jumpPressed = false;
    return { moveX, moveZ, sprint, jump };
  }

  consumeMouse(): MouseState {
    const state: MouseState = {
      locked: this._locked,
      deltaX: this._deltaX,
      deltaY: this._deltaY,
      scrollDelta: this._scrollDelta,
      middleDown: this._middleClicked,
    };
    this._deltaX = 0;
    this._deltaY = 0;
    this._scrollDelta = 0;
    this._middleClicked = false;
    return state;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.handleClick);
    }
    if (this._locked) {
      document.exitPointerLock();
    }
    this.keys.clear();
  }
}
