import { Howl, Howler } from 'howler';
import type { SettingsManager, GameSettings } from '../systems/SettingsManager';
import { SOUNDS, type SoundCategory } from './soundRegistry';

interface ActiveSound {
  howl: Howl;
  id: number;
  category: SoundCategory;
}

export class AudioManager {
  private howls = new Map<string, Howl>();
  private activeSounds = new Map<string, ActiveSound>();
  private settings: SettingsManager;
  private categoryVolumes: Record<SoundCategory, number> = {
    ambient: 1, music: 1, sfx: 1, ui: 1,
  };

  constructor(settings: SettingsManager) {
    this.settings = settings;
    this.settings.onChange(() => this.updateVolumes());
    this.updateVolumes();
  }

  private getOrCreateHowl(soundId: string): Howl | null {
    if (this.howls.has(soundId)) return this.howls.get(soundId)!;
    const def = SOUNDS[soundId];
    if (!def) return null;
    const howl = new Howl({
      src: def.src,
      loop: def.loop ?? false,
      volume: def.volume ?? 1,
      html5: def.category === 'music',
    });
    this.howls.set(soundId, howl);
    return howl;
  }

  play(soundId: string, key?: string): string {
    const howl = this.getOrCreateHowl(soundId);
    if (!howl) return '';
    const def = SOUNDS[soundId];
    const id = howl.play();
    const activeKey = key || `${soundId}-${id}`;
    const catVol = this.categoryVolumes[def.category];
    howl.volume((def.volume ?? 1) * catVol, id);
    this.activeSounds.set(activeKey, { howl, id, category: def.category });
    return activeKey;
  }

  stop(key: string): void {
    const active = this.activeSounds.get(key);
    if (!active) return;
    active.howl.stop(active.id);
    this.activeSounds.delete(key);
  }

  setPosition(key: string, x: number, y: number, z: number): void {
    const active = this.activeSounds.get(key);
    if (!active) return;
    active.howl.pos(x, y, z, active.id);
  }

  setListenerPosition(x: number, y: number, z: number, fx: number, fy: number, fz: number): void {
    Howler.pos(x, y, z);
    Howler.orientation(fx, fy, fz, 0, 1, 0);
  }

  startAmbient(): void {
    this.play('music-ironvale', 'zone-music');
  }

  private updateVolumes(): void {
    const s: GameSettings = this.settings.get();
    const master = s.masterVolume;
    const muted = s.musicMuted;

    // Map existing GameSettings fields to category volumes.
    // ambient and ui share sfxVolume for now (no dedicated setting yet).
    this.categoryVolumes.ambient = (muted ? 0 : s.sfxVolume) * master;
    this.categoryVolumes.music = (muted ? 0 : s.musicVolume) * master;
    this.categoryVolumes.sfx = s.sfxVolume * master;
    this.categoryVolumes.ui = s.sfxVolume * master;

    Howler.volume(master);

    // Live-update volumes on currently playing sounds
    for (const [, active] of this.activeSounds) {
      const catVol = this.categoryVolumes[active.category];
      active.howl.volume(catVol, active.id);
    }
  }

  dispose(): void {
    for (const [, active] of this.activeSounds) {
      active.howl.stop(active.id);
    }
    this.activeSounds.clear();
    for (const [, howl] of this.howls) {
      howl.unload();
    }
    this.howls.clear();
  }
}
