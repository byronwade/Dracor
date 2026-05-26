/**
 * AudioManager — ambient audio using the Web Audio API.
 * Generates a subtle low-frequency drone + filtered noise for atmosphere.
 * No external audio files required.
 */

import { SettingsManager } from './SettingsManager';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Oscillator drone nodes
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  // Noise nodes
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  private isPlaying = false;
  private settings: SettingsManager;

  constructor(settings: SettingsManager) {
    this.settings = settings;

    // React to settings changes automatically
    this.settings.onChange(() => {
      this.updateVolumes();
    });
  }

  /** Start the ambient drone. Safe to call multiple times. */
  startAmbient(): void {
    // Create or resume AudioContext (browser autoplay policy)
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }

    // Always try to resume — handles the case where a previous call
    // occurred before a user gesture and the context stayed suspended.
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Will succeed on next user gesture
      });
    }

    // If nodes are already wired up, nothing more to do
    if (this.isPlaying) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.startDrone();
    this.startNoise();
    this.updateVolumes();
    this.isPlaying = true;
  }

  /** Stop all ambient audio. */
  stopAmbient(): void {
    if (!this.isPlaying) return;

    if (this.droneOsc) {
      try { this.droneOsc.stop(); } catch { /* already stopped */ }
      this.droneOsc.disconnect();
      this.droneOsc = null;
    }
    if (this.droneGain) {
      this.droneGain.disconnect();
      this.droneGain = null;
    }
    if (this.noiseSource) {
      try { this.noiseSource.stop(); } catch { /* already stopped */ }
      this.noiseSource.disconnect();
      this.noiseSource = null;
    }
    if (this.noiseGain) {
      this.noiseGain.disconnect();
      this.noiseGain = null;
    }
    if (this.noiseFilter) {
      this.noiseFilter.disconnect();
      this.noiseFilter = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    this.isPlaying = false;
  }

  /** Update all gain nodes from current settings. */
  updateVolumes(): void {
    if (!this.masterGain || !this.ctx) return;

    const s = this.settings.get();
    const effectiveVolume = s.musicMuted ? 0 : s.masterVolume * s.musicVolume;

    // Drone: very subtle base rumble
    if (this.droneGain) {
      this.droneGain.gain.setTargetAtTime(
        effectiveVolume * 0.12,
        this.ctx.currentTime,
        0.1
      );
    }

    // Noise: very subtle wind texture
    if (this.noiseGain) {
      this.noiseGain.gain.setTargetAtTime(
        effectiveVolume * 0.06,
        this.ctx.currentTime,
        0.1
      );
    }
  }

  /** Placeholder for future SFX playback. */
  playSfx(_name: string): void {
    // Future: load and play named sound effects using sfxVolume
    // For now, no-op
  }

  /** Clean up all audio resources. */
  dispose(): void {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close().catch(() => { /* ignore */ });
      this.ctx = null;
    }
  }

  // ── Internal ──────────────────────────────────────────────────────

  private startDrone(): void {
    if (!this.ctx || !this.masterGain) return;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneGain.connect(this.masterGain);

    // Low sine wave at 60 Hz — dark rumble
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.value = 60;
    this.droneOsc.connect(this.droneGain);
    this.droneOsc.start();

    // Add a second very quiet overtone for depth
    // (connected to same gain node so it shares volume control)
    const overtone = this.ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.value = 90;
    const overtoneGain = this.ctx.createGain();
    overtoneGain.gain.value = 0.3; // quieter than fundamental
    overtone.connect(overtoneGain);
    overtoneGain.connect(this.droneGain);
    overtone.start();
  }

  private startNoise(): void {
    if (!this.ctx || !this.masterGain) return;

    // Generate white noise buffer (2 seconds, looped)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    // Bandpass filter to shape white noise into wind-like texture
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.value = 400;
    this.noiseFilter.Q.value = 0.5;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    this.noiseSource.start();
  }
}
