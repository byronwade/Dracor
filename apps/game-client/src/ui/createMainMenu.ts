/**
 * Main menu — shown before the game world loads.
 * Full viewport, solid dark background, hides to reveal the game canvas.
 * DOM-based, no Babylon.js dependency.
 */

export interface MainMenu {
  show: () => void;
  hide: () => void;
  dispose: () => void;
}

export function createMainMenu(
  playerName: string,
  callbacks: {
    onEnterWorld: () => void;
    onSettings: () => void;
  }
): MainMenu {
  // ── Style block (for keyframes + hover) ─────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    @keyframes main-menu-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(192, 72, 32, 0.4); }
      50% { box-shadow: 0 0 20px 4px rgba(192, 72, 32, 0.2); }
    }
    @keyframes main-menu-fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    #main-menu-overlay {
      position: fixed;
      inset: 0;
      background: #050505;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      pointer-events: auto;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    #main-menu-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      animation: main-menu-fade-in 600ms ease forwards;
    }
    #main-menu-overlay .mm-title {
      font-size: 56px;
      font-weight: 900;
      letter-spacing: 10px;
      background: linear-gradient(180deg, #f0a050, #c04820);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
      user-select: none;
      line-height: 1.1;
    }
    #main-menu-overlay .mm-subtitle {
      font-size: 16px;
      color: #888;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin: 0;
      font-weight: 300;
      user-select: none;
    }
    #main-menu-overlay .mm-zone {
      font-size: 12px;
      color: #555;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
      user-select: none;
    }
    #main-menu-overlay .mm-player {
      font-size: 13px;
      color: #a0a0a0;
      margin: 8px 0 0 0;
      user-select: none;
    }
    #main-menu-overlay .mm-player-name {
      color: #f0a050;
      font-weight: 600;
    }
    #main-menu-overlay .mm-enter-btn {
      margin-top: 24px;
      padding: 16px 48px;
      background: #c04820;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 2px;
      cursor: pointer;
      transition: background 200ms ease, transform 100ms ease;
      animation: main-menu-pulse 2.5s ease-in-out infinite;
      outline: none;
      font-family: inherit;
    }
    #main-menu-overlay .mm-enter-btn:hover {
      background: #d05830;
    }
    #main-menu-overlay .mm-enter-btn:active {
      transform: scale(0.97);
    }
    #main-menu-overlay .mm-settings-btn {
      margin-top: 4px;
      padding: 10px 32px;
      background: transparent;
      color: #a0a0a0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 1px;
      cursor: pointer;
      transition: background 200ms ease, border-color 200ms ease;
      outline: none;
      font-family: inherit;
    }
    #main-menu-overlay .mm-settings-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    #main-menu-overlay .mm-settings-btn:active {
      transform: scale(0.98);
    }
    #main-menu-overlay .mm-footer {
      position: absolute;
      bottom: 20px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 11px;
      color: #444;
      user-select: none;
      letter-spacing: 0.5px;
    }
    #main-menu-overlay .mm-footer a {
      color: #555;
      text-decoration: none;
      transition: color 200ms ease;
    }
    #main-menu-overlay .mm-footer a:hover {
      color: #888;
    }
  `;
  document.head.appendChild(style);

  // ── Overlay ─────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'main-menu-overlay';

  // ── Content ─────────────────────────────────────────────────────
  const content = document.createElement('div');
  content.id = 'main-menu-content';

  // Title
  const title = document.createElement('h1');
  title.className = 'mm-title';
  title.textContent = 'DRACOR';
  content.appendChild(title);

  // Subtitle
  const subtitle = document.createElement('p');
  subtitle.className = 'mm-subtitle';
  subtitle.textContent = 'First Road';
  content.appendChild(subtitle);

  // Zone
  const zone = document.createElement('p');
  zone.className = 'mm-zone';
  zone.textContent = 'Ironvale Outskirts';
  content.appendChild(zone);

  // Player name
  const playerEl = document.createElement('p');
  playerEl.className = 'mm-player';
  playerEl.innerHTML = '';
  const playerLabel = document.createTextNode('Playing as: ');
  const playerNameSpan = document.createElement('span');
  playerNameSpan.className = 'mm-player-name';
  playerNameSpan.textContent = playerName;
  playerEl.appendChild(playerLabel);
  playerEl.appendChild(playerNameSpan);
  content.appendChild(playerEl);

  // Enter button
  const enterBtn = document.createElement('button');
  enterBtn.className = 'mm-enter-btn';
  enterBtn.textContent = 'Enter Ironvale';
  enterBtn.addEventListener('click', () => {
    callbacks.onEnterWorld();
  });
  content.appendChild(enterBtn);

  // Settings button
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'mm-settings-btn';
  settingsBtn.textContent = 'Settings';
  settingsBtn.addEventListener('click', () => {
    callbacks.onSettings();
  });
  content.appendChild(settingsBtn);

  overlay.appendChild(content);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'mm-footer';
  const footerLink = document.createElement('a');
  footerLink.href = 'https://thedracor.com';
  footerLink.target = '_blank';
  footerLink.rel = 'noopener noreferrer';
  footerLink.textContent = 'thedracor.com';
  footer.appendChild(document.createTextNode('v0.2.0 | '));
  footer.appendChild(footerLink);
  overlay.appendChild(footer);

  document.body.appendChild(overlay);

  return {
    show() {
      overlay.style.display = 'flex';
    },
    hide() {
      overlay.style.display = 'none';
    },
    dispose() {
      style.remove();
      overlay.remove();
    },
  };
}
