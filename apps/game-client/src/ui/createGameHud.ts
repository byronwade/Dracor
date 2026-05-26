/**
 * Minimal HUD overlay: player name, zone name, health bar placeholder.
 * DOM-based for crisp text rendering.
 */
export interface GameHud {
  setPlayerName: (name: string) => void;
  setZoneName: (zone: string) => void;
  setHealth: (current: number, max: number) => void;
  dispose: () => void;
}

export function createGameHud(): GameHud {
  // Container
  const container = document.createElement('div');
  container.id = 'game-hud';
  container.style.cssText = `
    position: absolute;
    top: 12px;
    left: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: none;
    user-select: none;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  `;

  // Zone name (top label, atmospheric)
  const zoneEl = document.createElement('div');
  zoneEl.style.cssText = `
    color: rgba(200, 180, 140, 0.7);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 300;
  `;
  zoneEl.textContent = 'IRONVALE OUTSKIRTS';
  container.appendChild(zoneEl);

  // Player name
  const nameEl = document.createElement('div');
  nameEl.style.cssText = `
    color: rgba(240, 200, 120, 0.9);
    font-size: 14px;
    font-weight: 600;
  `;
  nameEl.textContent = 'Wanderer';
  container.appendChild(nameEl);

  // Health row: bar + numeric text
  const healthRow = document.createElement('div');
  healthRow.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  const healthContainer = document.createElement('div');
  healthContainer.style.cssText = `
    width: 140px;
    height: 6px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;

  const healthFill = document.createElement('div');
  healthFill.style.cssText = `
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #206020, #40a040);
    border-radius: 3px;
    transition: width 0.3s ease;
  `;
  healthContainer.appendChild(healthFill);
  healthRow.appendChild(healthContainer);

  const healthText = document.createElement('div');
  healthText.style.cssText = `
    color: rgba(200, 160, 160, 0.7);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  `;
  healthText.textContent = '100/100';
  healthRow.appendChild(healthText);

  container.appendChild(healthRow);

  document.body.appendChild(container);

  return {
    setPlayerName(name: string) {
      nameEl.textContent = name;
    },
    setZoneName(zone: string) {
      zoneEl.textContent = zone.toUpperCase();
    },
    setHealth(current: number, max: number) {
      const pct = Math.max(0, Math.min(100, (current / max) * 100));
      healthFill.style.width = `${pct}%`;
      healthText.textContent = `${Math.round(current)}/${Math.round(max)}`;

      if (pct > 60) {
        healthFill.style.background = 'linear-gradient(90deg, #206020, #40a040)';
      } else if (pct > 30) {
        healthFill.style.background = 'linear-gradient(90deg, #8b6b20, #c0a040)';
      } else {
        healthFill.style.background = 'linear-gradient(90deg, #8b2020, #c04040)';
      }
    },
    dispose() {
      container.remove();
    },
  };
}
