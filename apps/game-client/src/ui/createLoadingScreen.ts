/**
 * Full-screen loading screen shown during scene initialization.
 * Displays game title, progress bar, and current loading step.
 */

export interface LoadingScreen {
  updateStatus(message: string): void;
  updateProgress(percent: number): void;
  hide(): void;
  dispose(): void;
}

export function createLoadingScreen(): LoadingScreen {
  let dotInterval: ReturnType<typeof setInterval> | null = null;

  const overlay = document.createElement('div');
  overlay.id = 'loading-screen';
  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #0a0a12 0%, #111122 50%, #0d0d1a 100%);
    z-index: 2000;
    transition: opacity 0.5s ease;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    user-select: none;
  `;

  // Title
  const title = document.createElement('div');
  title.style.cssText = `
    color: rgba(240, 200, 120, 0.9);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    margin-bottom: 4px;
  `;
  title.textContent = 'Dracor';
  overlay.appendChild(title);

  // Subtitle
  const subtitle = document.createElement('div');
  subtitle.style.cssText = `
    color: rgba(200, 180, 140, 0.5);
    font-size: 12px;
    letter-spacing: 6px;
    text-transform: uppercase;
    margin-bottom: 40px;
  `;
  subtitle.textContent = 'First Road';
  overlay.appendChild(subtitle);

  // Progress bar track
  const track = document.createElement('div');
  track.style.cssText = `
    width: 280px;
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 16px;
  `;

  const fill = document.createElement('div');
  fill.style.cssText = `
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, rgba(240, 200, 120, 0.6), rgba(240, 200, 120, 0.9));
    border-radius: 2px;
    transition: width 0.3s ease;
  `;
  track.appendChild(fill);
  overlay.appendChild(track);

  // Status text
  const status = document.createElement('div');
  status.style.cssText = `
    color: rgba(200, 200, 220, 0.5);
    font-size: 11px;
    letter-spacing: 1px;
    min-height: 16px;
  `;
  status.textContent = 'Initializing...';
  overlay.appendChild(status);

  document.body.appendChild(overlay);

  // Animated dots for the status text
  let dotCount = 0;
  let baseMessage = 'Initializing';
  dotInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    status.textContent = baseMessage + '.'.repeat(dotCount);
  }, 400);

  return {
    updateStatus(message: string): void {
      // Strip trailing dots for the animation
      baseMessage = message.replace(/\.+$/, '');
      dotCount = 0;
      status.textContent = baseMessage;
    },

    updateProgress(percent: number): void {
      const clamped = Math.max(0, Math.min(100, percent));
      fill.style.width = `${clamped}%`;
    },

    hide(): void {
      if (dotInterval !== null) {
        clearInterval(dotInterval);
        dotInterval = null;
      }
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 500);
    },

    dispose(): void {
      if (dotInterval !== null) {
        clearInterval(dotInterval);
        dotInterval = null;
      }
      overlay.remove();
    },
  };
}
