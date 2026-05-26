/**
 * Connection status pill/badge in the top-right corner.
 * Shows connection state transitions: connecting, connected, reconnecting, offline, disconnected.
 */

export type ConnectionStatusType = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'disconnected';

export interface ConnectionStatus {
  show(status: ConnectionStatusType, attempt?: number): void;
  dispose(): void;
}

const STATUS_CONFIG: Record<ConnectionStatusType, { label: string; bg: string; color: string; dot: string }> = {
  connecting: {
    label: 'Connecting...',
    bg: 'rgba(30, 30, 50, 0.85)',
    color: '#a0b0d0',
    dot: '#6080c0',
  },
  connected: {
    label: 'Connected',
    bg: 'rgba(20, 40, 20, 0.85)',
    color: '#80c080',
    dot: '#40a040',
  },
  reconnecting: {
    label: 'Reconnecting...',
    bg: 'rgba(50, 40, 10, 0.85)',
    color: '#d0b060',
    dot: '#c09030',
  },
  offline: {
    label: 'Offline Mode',
    bg: 'rgba(50, 20, 20, 0.85)',
    color: '#d08080',
    dot: '#a04040',
  },
  disconnected: {
    label: 'Connection Lost',
    bg: 'rgba(50, 20, 20, 0.85)',
    color: '#d08080',
    dot: '#c04040',
  },
};

export function createConnectionStatus(): ConnectionStatus {
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;
  let pulseInterval: ReturnType<typeof setInterval> | null = null;

  const container = document.createElement('div');
  container.id = 'connection-status';
  container.style.cssText = `
    position: absolute;
    top: 12px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 12px;
    font-weight: 500;
    pointer-events: none;
    user-select: none;
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 1000;
  `;

  const dot = document.createElement('div');
  dot.style.cssText = `
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  `;

  const label = document.createElement('span');

  container.appendChild(dot);
  container.appendChild(label);
  document.body.appendChild(container);

  function clearTimers(): void {
    if (fadeTimer !== null) {
      clearTimeout(fadeTimer);
      fadeTimer = null;
    }
    if (pulseInterval !== null) {
      clearInterval(pulseInterval);
      pulseInterval = null;
    }
  }

  function startPulse(dotColor: string): void {
    let bright = true;
    pulseInterval = setInterval(() => {
      bright = !bright;
      dot.style.backgroundColor = bright ? dotColor : 'transparent';
    }, 600);
  }

  return {
    show(status: ConnectionStatusType, attempt?: number): void {
      clearTimers();

      const config = STATUS_CONFIG[status];
      container.style.background = config.bg;
      container.style.color = config.color;
      container.style.border = `1px solid ${config.color}33`;
      dot.style.backgroundColor = config.dot;

      let text = config.label;
      if (status === 'reconnecting' && attempt !== undefined) {
        text = `Reconnecting... (attempt ${attempt}/5)`;
      }
      label.textContent = text;

      container.style.opacity = '1';

      if (status === 'connecting' || status === 'reconnecting') {
        startPulse(config.dot);
      }

      if (status === 'connected') {
        fadeTimer = setTimeout(() => {
          container.style.opacity = '0';
          fadeTimer = null;
        }, 2000);
      }
    },

    dispose(): void {
      clearTimers();
      container.remove();
    },
  };
}
