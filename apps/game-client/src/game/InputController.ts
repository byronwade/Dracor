/**
 * Input state from keyboard: WASD/Arrows, Shift (sprint), Space (jump).
 * Ignores input when a text field is focused (e.g. chat).
 */
export interface InputState {
  moveX: number;   // -1 (left) to +1 (right)
  moveZ: number;   // -1 (back) to +1 (forward)
  sprint: boolean;
  jump: boolean;
}

export class InputController {
  private keys: Set<string> = new Set();
  private jumpPressed = false;
  private readonly handleKeyDown: (e: KeyboardEvent) => void;
  private readonly handleKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.handleKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in text fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      this.keys.add(key);

      // Track jump edge (only on keydown, consumed once)
      if (key === ' ') {
        this.jumpPressed = true;
      }
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Get current input state and consume one-shot inputs (jump).
   */
  getInput(): InputState {
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) moveZ += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) moveZ -= 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) moveX -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) moveX += 1;

    const sprint = this.keys.has('shift');
    const jump = this.jumpPressed;
    this.jumpPressed = false; // Consume the jump

    return { moveX, moveZ, sprint, jump };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.keys.clear();
  }
}
