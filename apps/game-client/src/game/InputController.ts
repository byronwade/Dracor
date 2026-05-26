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
}

export class InputController {
  private keys: Set<string> = new Set();
  private jumpPressed = false;

  private _deltaX = 0;
  private _deltaY = 0;
  private _scrollDelta = 0;
  private _middleClicked = false;
  private _rightDown = false;

  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;
  private readonly handleMouseDown: (e: MouseEvent) => void;
  private readonly handleMouseUp: (e: MouseEvent) => void;
  private readonly handleMouseMove: (e: MouseEvent) => void;
  private readonly handleWheel: (e: WheelEvent) => void;
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

    this.handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) this._rightDown = true;
      if (e.button === 1) { this._middleClicked = true; e.preventDefault(); }
    };

    this.handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) this._rightDown = false;
    };

    this.handleMouseMove = (e: MouseEvent) => {
      if (this._rightDown) {
        this._deltaX += e.movementX;
        this._deltaY += e.movementY;
      }
    };

    this.handleWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this._scrollDelta += e.deltaY;
      e.preventDefault();
    };

    this.handleContextMenu = (e: Event) => { e.preventDefault(); };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('contextmenu', this.handleContextMenu);
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
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    this.keys.clear();
  }
}
