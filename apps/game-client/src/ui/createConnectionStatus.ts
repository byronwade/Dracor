import type { ConnectionState } from '../networking/networkTypes';
import { ENV } from '../env';

export interface ConnectionStatusUI {
  setState: (state: ConnectionState) => void;
  setRoomInfo: (roomName: string, playerCount: number) => void;
  setQualityTier: (tier: string) => void;
  dispose: () => void;
}

export function createConnectionStatus(): ConnectionStatusUI {
  const container = document.createElement('div');
  container.id = 'connection-status';
  container.style.cssText = `
    position: absolute;
    top: 40px;
    right: 16px;
    background: rgba(0, 0, 0, 0.65);
    padding: 6px 10px;
    border-radius: 6px;
    pointer-events: none;
    user-select: none;
    font-family: 'Courier New', monospace;
    font-size: 10px;
    line-height: 1.7;
    color: #808080;
    border: 1px solid rgba(255, 255, 255, 0.06);
    min-width: 180px;
  `;

  const rows: Record<string, HTMLElement> = {};

  function addRow(key: string, label: string, value: string, valueColor?: string): void {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.gap = '12px';

    const labelEl = document.createElement('span');
    labelEl.style.color = '#606060';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.style.color = valueColor || '#a0a0a0';
    valueEl.textContent = value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    container.appendChild(row);
    rows[key] = valueEl;
  }

  addRow('host', 'Host', window.location.host);
  addRow('server', 'Server', ENV.gameServerUrl.replace(/^wss?:\/\//, ''));
  addRow('status', 'Status', 'Disconnected', '#cc4444');
  addRow('room', 'Room', '—');
  addRow('players', 'Players', '—');
  addRow('quality', 'Quality', '—');

  document.body.appendChild(container);

  const stateConfig: Record<ConnectionState, { color: string; text: string }> = {
    connected: { color: '#44cc44', text: 'Connected' },
    connecting: { color: '#cccc44', text: 'Connecting...' },
    disconnected: { color: '#cc4444', text: 'Disconnected' },
  };

  return {
    setState(state: ConnectionState) {
      const cfg = stateConfig[state];
      rows['status'].style.color = cfg.color;
      rows['status'].textContent = cfg.text;
    },
    setRoomInfo(roomName: string, playerCount: number) {
      rows['room'].textContent = roomName || '—';
      rows['players'].textContent = playerCount > 0 ? String(playerCount) : '—';
    },
    setQualityTier(tier: string) {
      rows['quality'].textContent = tier;
      rows['quality'].style.color = tier === 'ultra' ? '#44cc44'
        : tier === 'high' ? '#80cc80'
        : tier === 'medium' ? '#cccc44'
        : '#cc8844';
    },
    dispose() {
      container.remove();
    },
  };
}
