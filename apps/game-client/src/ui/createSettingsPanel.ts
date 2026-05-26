/**
 * Settings panel — tabbed overlay for Audio, Graphics, Controls.
 * DOM-based, no Babylon.js dependency.
 * Changes apply immediately via SettingsManager.set().
 */

import { SettingsManager, type GameSettings } from '../systems/SettingsManager';

export interface SettingsPanel {
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  dispose: () => void;
}

type TabName = 'audio' | 'graphics' | 'controls';

const READ_ONLY_KEYBINDINGS = [
  { key: 'WASD', action: 'Move' },
  { key: 'Shift', action: 'Sprint' },
  { key: 'Space', action: 'Jump' },
  { key: 'Enter', action: 'Chat' },
  { key: 'F3', action: 'Dev Panel' },
  { key: 'ESC', action: 'Pause Menu' },
  { key: 'M', action: 'Toggle Minimap' },
];

export function createSettingsPanel(
  settings: SettingsManager,
  onClose: () => void
): SettingsPanel {
  let isOpen = false;
  let activeTab: TabName = 'audio';

  // ── Style block ─────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #settings-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      pointer-events: auto;
      opacity: 0;
      transition: opacity 200ms ease;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    #settings-overlay.visible {
      opacity: 1;
    }
    #settings-panel {
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(10, 10, 10, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
    }
    #settings-panel .settings-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #settings-panel .back-btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.15);
      color: #a0a0a0;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 200ms ease;
      font-family: inherit;
    }
    #settings-panel .back-btn:hover {
      background: rgba(255,255,255,0.08);
    }
    #settings-panel .settings-title {
      font-size: 20px;
      font-weight: 700;
      color: #e0e0e0;
      letter-spacing: 2px;
      margin: 0;
    }
    #settings-panel .tab-bar {
      display: flex;
      gap: 4px;
      background: rgba(255,255,255,0.03);
      border-radius: 6px;
      padding: 3px;
    }
    #settings-panel .tab-btn {
      flex: 1;
      padding: 8px 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: #666;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 200ms ease, color 200ms ease;
      letter-spacing: 0.5px;
      font-family: inherit;
    }
    #settings-panel .tab-btn:hover {
      color: #a0a0a0;
    }
    #settings-panel .tab-btn.active {
      background: rgba(240, 160, 80, 0.15);
      color: #f0a050;
    }
    #settings-panel .tab-content {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    #settings-panel .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 32px;
    }
    #settings-panel .setting-label {
      color: #a0a0a0;
      font-size: 14px;
      white-space: nowrap;
    }
    #settings-panel .setting-value {
      color: #f0a050;
      font-size: 12px;
      font-weight: 600;
      min-width: 36px;
      text-align: right;
    }
    #settings-panel .slider-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #settings-panel input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 160px;
      height: 6px;
      border-radius: 3px;
      background: rgba(255,255,255,0.1);
      outline: none;
      cursor: pointer;
    }
    #settings-panel input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #f0a050;
      border: 2px solid #c04820;
      cursor: pointer;
      transition: background 200ms ease;
    }
    #settings-panel input[type="range"]::-webkit-slider-thumb:hover {
      background: #ffb870;
    }
    #settings-panel input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #f0a050;
      border: 2px solid #c04820;
      cursor: pointer;
    }
    #settings-panel input[type="range"]::-moz-range-track {
      height: 6px;
      border-radius: 3px;
      background: rgba(255,255,255,0.1);
    }
    #settings-panel .toggle {
      position: relative;
      width: 40px;
      height: 22px;
      background: rgba(255,255,255,0.1);
      border-radius: 11px;
      cursor: pointer;
      transition: background 200ms ease;
      flex-shrink: 0;
      border: none;
      outline: none;
    }
    #settings-panel .toggle.on {
      background: rgba(192, 72, 32, 0.6);
    }
    #settings-panel .toggle-knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #888;
      transition: transform 200ms ease, background 200ms ease;
      pointer-events: none;
    }
    #settings-panel .toggle.on .toggle-knob {
      transform: translateX(18px);
      background: #f0a050;
    }
    #settings-panel select {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 4px;
      color: #e0e0e0;
      font-size: 13px;
      padding: 6px 10px;
      cursor: pointer;
      outline: none;
      font-family: inherit;
    }
    #settings-panel select:hover {
      border-color: rgba(255,255,255,0.25);
    }
    #settings-panel .keybindings-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }
    #settings-panel .kb-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    #settings-panel .kb-key {
      color: #f0a050;
      font-weight: 600;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      background: rgba(240, 160, 80, 0.1);
      padding: 2px 8px;
      border-radius: 3px;
    }
    #settings-panel .kb-action {
      color: #888;
    }
    #settings-panel .section-divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin: 4px 0;
    }
    #settings-panel .reset-btn {
      align-self: flex-start;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      color: #666;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 200ms ease, color 200ms ease;
      font-family: inherit;
    }
    #settings-panel .reset-btn:hover {
      background: rgba(255,255,255,0.06);
      color: #a0a0a0;
    }
  `;
  document.head.appendChild(style);

  // ── Overlay ─────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.style.display = 'none';

  // ── Panel container ─────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'settings-panel';

  // ── Header ──────────────────────────────────────────────────────
  const header = document.createElement('div');
  header.className = 'settings-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.innerHTML = '&#8592;';
  backBtn.title = 'Back';
  backBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closePanel();
  });
  header.appendChild(backBtn);

  const titleEl = document.createElement('h2');
  titleEl.className = 'settings-title';
  titleEl.textContent = 'Settings';
  header.appendChild(titleEl);

  panel.appendChild(header);

  // ── Tab bar ─────────────────────────────────────────────────────
  const tabBar = document.createElement('div');
  tabBar.className = 'tab-bar';

  const tabs: Array<{ name: TabName; label: string; btn: HTMLButtonElement }> = [
    { name: 'audio', label: 'Audio', btn: null! },
    { name: 'graphics', label: 'Graphics', btn: null! },
    { name: 'controls', label: 'Controls', btn: null! },
  ];

  for (const tab of tabs) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.textContent = tab.label;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeTab = tab.name;
      renderActiveTab();
    });
    tabBar.appendChild(btn);
    tab.btn = btn;
  }
  panel.appendChild(tabBar);

  // ── Tab content area ────────────────────────────────────────────
  const contentArea = document.createElement('div');
  contentArea.className = 'tab-content';
  panel.appendChild(contentArea);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // ── Helper: create a toggle button ──────────────────────────────
  function createToggle(
    initial: boolean,
    onChange: (val: boolean) => void
  ): HTMLButtonElement {
    const toggle = document.createElement('button');
    toggle.className = 'toggle' + (initial ? ' on' : '');
    toggle.type = 'button';

    const knob = document.createElement('div');
    knob.className = 'toggle-knob';
    toggle.appendChild(knob);

    let state = initial;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      state = !state;
      toggle.className = 'toggle' + (state ? ' on' : '');
      onChange(state);
    });

    return toggle;
  }

  // ── Helper: create a slider row ─────────────────────────────────
  function createSliderRow(
    label: string,
    min: number,
    max: number,
    step: number,
    initial: number,
    formatValue: (v: number) => string,
    onChange: (v: number) => void
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'setting-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'setting-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const group = document.createElement('div');
    group.className = 'slider-group';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(initial);

    const valueEl = document.createElement('span');
    valueEl.className = 'setting-value';
    valueEl.textContent = formatValue(initial);

    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = parseFloat(slider.value);
      valueEl.textContent = formatValue(val);
      onChange(val);
    });

    // Prevent game key handling while sliding
    slider.addEventListener('keydown', (e) => e.stopPropagation());
    slider.addEventListener('keyup', (e) => e.stopPropagation());

    group.appendChild(slider);
    group.appendChild(valueEl);
    row.appendChild(group);
    return row;
  }

  // ── Helper: create a toggle row ─────────────────────────────────
  function createToggleRow(
    label: string,
    initial: boolean,
    onChange: (val: boolean) => void
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'setting-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'setting-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    row.appendChild(createToggle(initial, onChange));
    return row;
  }

  // ── Render tab content ──────────────────────────────────────────
  function renderActiveTab(): void {
    // Update tab button active states
    for (const tab of tabs) {
      tab.btn.className = 'tab-btn' + (tab.name === activeTab ? ' active' : '');
    }

    contentArea.innerHTML = '';
    const s = settings.get();

    if (activeTab === 'audio') {
      renderAudioTab(s);
    } else if (activeTab === 'graphics') {
      renderGraphicsTab(s);
    } else {
      renderControlsTab(s);
    }
  }

  function renderAudioTab(s: GameSettings): void {
    contentArea.appendChild(
      createSliderRow(
        'Master Volume',
        0, 1, 0.01,
        s.masterVolume,
        (v) => `${Math.round(v * 100)}%`,
        (v) => settings.set('masterVolume', v)
      )
    );
    contentArea.appendChild(
      createSliderRow(
        'Music Volume',
        0, 1, 0.01,
        s.musicVolume,
        (v) => `${Math.round(v * 100)}%`,
        (v) => settings.set('musicVolume', v)
      )
    );
    contentArea.appendChild(
      createSliderRow(
        'SFX Volume',
        0, 1, 0.01,
        s.sfxVolume,
        (v) => `${Math.round(v * 100)}%`,
        (v) => settings.set('sfxVolume', v)
      )
    );

    const divider = document.createElement('hr');
    divider.className = 'section-divider';
    contentArea.appendChild(divider);

    contentArea.appendChild(
      createToggleRow('Mute Music', s.musicMuted, (v) =>
        settings.set('musicMuted', v)
      )
    );
  }

  function renderGraphicsTab(s: GameSettings): void {
    // Quality dropdown
    const qualityRow = document.createElement('div');
    qualityRow.className = 'setting-row';

    const qualityLabel = document.createElement('span');
    qualityLabel.className = 'setting-label';
    qualityLabel.textContent = 'Quality';
    qualityRow.appendChild(qualityLabel);

    const qualitySelect = document.createElement('select');
    const tiers: Array<{ value: GameSettings['qualityTier']; label: string }> = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'ultra', label: 'Ultra' },
    ];
    for (const tier of tiers) {
      const option = document.createElement('option');
      option.value = tier.value;
      option.textContent = tier.label;
      if (tier.value === s.qualityTier) option.selected = true;
      qualitySelect.appendChild(option);
    }
    qualitySelect.addEventListener('change', (e) => {
      e.stopPropagation();
      settings.set('qualityTier', qualitySelect.value as GameSettings['qualityTier']);
    });
    qualityRow.appendChild(qualitySelect);
    contentArea.appendChild(qualityRow);

    const divider = document.createElement('hr');
    divider.className = 'section-divider';
    contentArea.appendChild(divider);

    contentArea.appendChild(
      createToggleRow('Show Minimap', s.showMinimap, (v) =>
        settings.set('showMinimap', v)
      )
    );
    contentArea.appendChild(
      createToggleRow('Show HUD', s.showHud, (v) =>
        settings.set('showHud', v)
      )
    );
  }

  function renderControlsTab(s: GameSettings): void {
    contentArea.appendChild(
      createSliderRow(
        'Mouse Sensitivity',
        0.5, 2.0, 0.05,
        s.mouseSensitivity,
        (v) => v.toFixed(2),
        (v) => settings.set('mouseSensitivity', v)
      )
    );

    contentArea.appendChild(
      createToggleRow('Invert Y', s.invertY, (v) =>
        settings.set('invertY', v)
      )
    );

    const divider = document.createElement('hr');
    divider.className = 'section-divider';
    contentArea.appendChild(divider);

    // Keybindings header
    const kbHeader = document.createElement('span');
    kbHeader.className = 'setting-label';
    kbHeader.style.marginBottom = '4px';
    kbHeader.textContent = 'Keybindings';
    contentArea.appendChild(kbHeader);

    const kbList = document.createElement('div');
    kbList.className = 'keybindings-list';
    for (const binding of READ_ONLY_KEYBINDINGS) {
      const row = document.createElement('div');
      row.className = 'kb-row';

      const actionEl = document.createElement('span');
      actionEl.className = 'kb-action';
      actionEl.textContent = binding.action;

      const keyEl = document.createElement('span');
      keyEl.className = 'kb-key';
      keyEl.textContent = binding.key;

      row.appendChild(actionEl);
      row.appendChild(keyEl);
      kbList.appendChild(row);
    }
    contentArea.appendChild(kbList);
  }

  // ── ESC handler (capture phase — takes priority over pause menu) ──
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    }
  };
  window.addEventListener('keydown', handleKeyDown, true);

  // ── Absorb game keys while settings is open ─────────────────────
  const absorbGameKeys = (e: KeyboardEvent) => {
    if (!isOpen) return;
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

  // ── Click outside panel to close ────────────────────────────────
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePanel();
    }
  });

  // ── Re-render when settings change externally (e.g. reset) ──────
  settings.onChange(() => {
    if (isOpen) {
      renderActiveTab();
    }
  });

  // ── Open / Close ────────────────────────────────────────────────
  function openPanel(): void {
    if (isOpen) return;
    isOpen = true;
    activeTab = 'audio';
    overlay.style.display = 'flex';
    renderActiveTab();
    void overlay.offsetHeight;
    overlay.classList.add('visible');
  }

  function closePanel(): void {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('visible');
    setTimeout(() => {
      if (!isOpen) {
        overlay.style.display = 'none';
      }
    }, 200);
    onClose();
  }

  return {
    isOpen: () => isOpen,
    open: openPanel,
    close: closePanel,
    dispose() {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keydown', absorbGameKeys, true);
      window.removeEventListener('keyup', absorbGameKeys, true);
      style.remove();
      overlay.remove();
    },
  };
}
