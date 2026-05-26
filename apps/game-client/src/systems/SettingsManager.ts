/**
 * SettingsManager — persists all game settings to localStorage.
 * Notifies listeners on every change so UI and systems stay in sync.
 */

export interface GameSettings {
  // Audio
  masterVolume: number;    // 0-1
  musicVolume: number;     // 0-1
  sfxVolume: number;       // 0-1
  musicMuted: boolean;

  // Graphics
  qualityTier: 'low' | 'medium' | 'high' | 'ultra';
  showMinimap: boolean;
  showHud: boolean;
  fovMultiplier: number;   // 0.8-1.2

  // Controls
  mouseSensitivity: number; // 0.5-2.0
  invertY: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  musicMuted: false,
  qualityTier: 'high',
  showMinimap: true,
  showHud: true,
  fovMultiplier: 1.0,
  mouseSensitivity: 1.0,
  invertY: false,
};

const STORAGE_KEY = 'dracor_settings';

export class SettingsManager {
  private settings: GameSettings;
  private listeners: Array<(settings: GameSettings) => void> = [];

  constructor() {
    this.settings = this.load();
  }

  /** Return a shallow copy of the current settings. */
  get(): GameSettings {
    return { ...this.settings };
  }

  /** Update a single setting, persist, and notify listeners. */
  set<K extends keyof GameSettings>(key: K, value: GameSettings[K]): void {
    if (this.settings[key] === value) return;
    this.settings[key] = value;
    this.save();
    this.notify();
  }

  /** Register a listener that fires on every settings change. */
  onChange(listener: (settings: GameSettings) => void): void {
    this.listeners.push(listener);
  }

  /** Persist current settings to localStorage. */
  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
    }
  }

  /** Reset all settings to defaults, persist, and notify. */
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
    this.notify();
  }

  private load(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameSettings>;
        // Merge with defaults so new keys added in future versions get defaults
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Corrupted data — fall back to defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  private notify(): void {
    const snapshot = this.get();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
