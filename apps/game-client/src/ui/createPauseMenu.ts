/**
 * Pause menu overlay — ESC toggles open/close.
 * DOM-based, no Babylon.js dependency.
 */

import type { SettingsManager } from '../systems/SettingsManager';

export interface PauseMenu {
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  dispose: () => void;
}

const KEYBINDINGS = [
  { key: 'WASD', action: 'Move' },
  { key: 'Shift', action: 'Sprint' },
  { key: 'Space', action: 'Jump' },
  { key: 'Enter', action: 'Chat' },
  { key: 'F3', action: 'Dev Panel' },
  { key: 'ESC', action: 'Pause Menu' },
  { key: 'M', action: 'Toggle Minimap' },
];

export function createPauseMenu(
  _settings: SettingsManager,
  callbacks: {
    onResume: () => void;
    onSettings: () => void;
    onReturnToSite: () => void;
  }
): PauseMenu {
  let open = false;
  let controlsVisible = false;

  // ── Style block (for keyframes + hover pseudo-classes) ──────────
  const style = document.createElement('style');
  style.textContent = `
    #pause-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      pointer-events: auto;
      opacity: 0;
      transition: opacity 200ms ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    #pause-overlay.visible {
      opacity: 1;
    }
    #pause-content {
      max-width: 400px;
      width: 90%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    #pause-overlay .pause-title {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 6px;
      background: linear-gradient(180deg, #f0a050, #c04820);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
      user-select: none;
    }
    #pause-overlay .pause-subtitle {
      font-size: 14px;
      color: #666;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin: 0 0 12px 0;
      user-select: none;
    }
    #pause-overlay .pause-btn {
      width: 100%;
      padding: 12px 0;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 1px;
      cursor: pointer;
      transition: background 200ms ease, border-color 200ms ease, transform 100ms ease;
      outline: none;
      font-family: inherit;
    }
    #pause-overlay .pause-btn:active {
      transform: scale(0.98);
    }
    #pause-overlay .btn-primary {
      background: #c04820;
      color: #fff;
      border: 1px solid transparent;
    }
    #pause-overlay .btn-primary:hover {
      background: #d05830;
    }
    #pause-overlay .btn-secondary {
      background: transparent;
      color: #a0a0a0;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    #pause-overlay .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    #pause-overlay .btn-ghost {
      background: transparent;
      color: #666;
      border: 1px solid transparent;
    }
    #pause-overlay .btn-ghost:hover {
      color: #a0a0a0;
      background: rgba(255, 255, 255, 0.04);
    }
    #pause-overlay .controls-list {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #pause-overlay .control-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    #pause-overlay .control-key {
      color: #f0a050;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      background: rgba(240, 160, 80, 0.1);
      padding: 2px 8px;
      border-radius: 3px;
    }
    #pause-overlay .control-action {
      color: #888;
    }
  `;
  document.head.appendChild(style);

  // ── Overlay ─────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'pause-overlay';
  overlay.style.display = 'none';

  // ── Content container ───────────────────────────────────────────
  const content = document.createElement('div');
  content.id = 'pause-content';

  // Title
  const title = document.createElement('h1');
  title.className = 'pause-title';
  title.textContent = 'DRACOR';
  content.appendChild(title);

  // Subtitle
  const subtitle = document.createElement('p');
  subtitle.className = 'pause-subtitle';
  subtitle.textContent = 'PAUSED';
  content.appendChild(subtitle);

  // Resume button
  const resumeBtn = document.createElement('button');
  resumeBtn.className = 'pause-btn btn-primary';
  resumeBtn.textContent = 'Resume';
  resumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenu();
    callbacks.onResume();
  });
  content.appendChild(resumeBtn);

  // Settings button
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'pause-btn btn-secondary';
  settingsBtn.textContent = 'Settings';
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onSettings();
  });
  content.appendChild(settingsBtn);

  // Controls button
  const controlsBtn = document.createElement('button');
  controlsBtn.className = 'pause-btn btn-secondary';
  controlsBtn.textContent = 'Controls';
  controlsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    controlsVisible = !controlsVisible;
    controlsList.style.display = controlsVisible ? 'flex' : 'none';
  });
  content.appendChild(controlsBtn);

  // Controls list (initially hidden)
  const controlsList = document.createElement('div');
  controlsList.className = 'controls-list';
  controlsList.style.display = 'none';
  for (const binding of KEYBINDINGS) {
    const row = document.createElement('div');
    row.className = 'control-row';

    const keyEl = document.createElement('span');
    keyEl.className = 'control-key';
    keyEl.textContent = binding.key;

    const actionEl = document.createElement('span');
    actionEl.className = 'control-action';
    actionEl.textContent = binding.action;

    row.appendChild(actionEl);
    row.appendChild(keyEl);
    controlsList.appendChild(row);
  }
  content.appendChild(controlsList);

  // Return to Website button
  const returnBtn = document.createElement('button');
  returnBtn.className = 'pause-btn btn-ghost';
  returnBtn.textContent = 'Return to Website';
  returnBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onReturnToSite();
  });
  content.appendChild(returnBtn);

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // ── Click outside content to close ──────────────────────────────
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeMenu();
      callbacks.onResume();
    }
  });

  // ── ESC key handler (normal phase — settings panel captures first) ──
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    // Skip when typing in text fields
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      closeMenu();
      callbacks.onResume();
    } else {
      openMenu();
    }
  };
  window.addEventListener('keydown', handleKeyDown);

  // ── Absorb game keys while paused (WASD, Space, Shift) ─────────
  const absorbGameKeys = (e: KeyboardEvent) => {
    if (!open) return;
    const key = e.key.toLowerCase();
    if (
      key === 'w' || key === 'a' || key === 's' || key === 'd' ||
      key === ' ' || key === 'shift' ||
      key === 'arrowup' || key === 'arrowdown' ||
      key === 'arrowleft' || key === 'arrowright'
    ) {
      e.stopPropagation();
    }
  };
  window.addEventListener('keydown', absorbGameKeys, true);
  window.addEventListener('keyup', absorbGameKeys, true);

  // ── Open / Close helpers ────────────────────────────────────────
  function openMenu(): void {
    if (open) return;
    open = true;
    controlsVisible = false;
    controlsList.style.display = 'none';
    overlay.style.display = 'flex';
    // Force reflow before adding visible class for transition
    void overlay.offsetHeight;
    overlay.classList.add('visible');
  }

  function closeMenu(): void {
    if (!open) return;
    open = false;
    overlay.classList.remove('visible');
    // Wait for fade out transition
    setTimeout(() => {
      if (!open) {
        overlay.style.display = 'none';
      }
    }, 200);
  }

  return {
    isOpen: () => open,
    open: openMenu,
    close: closeMenu,
    dispose() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', absorbGameKeys, true);
      window.removeEventListener('keyup', absorbGameKeys, true);
      style.remove();
      overlay.remove();
    },
  };
}
