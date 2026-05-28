import type { WeatherType, WeatherState, WeatherPreset } from './types';

// ---------------------------------------------------------------------------
// Deterministic LCG-based PRNG
// ---------------------------------------------------------------------------

function createRng(seed: number) {
  let state = seed >>> 0;
  return {
    next(): number {
      // LCG parameters from Numerical Recipes
      state = Math.imul(1664525, state) + 1013904223;
      state = state >>> 0;
      return state / 0x100000000;
    },
    range(min: number, max: number): number {
      return min + this.next() * (max - min);
    },
  };
}

// ---------------------------------------------------------------------------
// Weather presets
// ---------------------------------------------------------------------------

export const WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  clear: {
    name: 'Clear',
    type: 'clear',
    intensity: 0,
    windStrength: 0.1,
    windDirection: { x: 1, y: 0 },
    precipitation: 0,
    visibility: 1,
    cloudCoverage: 0.05,
    fogBoost: 0,
    lightReduction: 0,
    particleDensity: 0,
    wetness: 0,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 180,
    maxDuration: 300,
  },
  partly_cloudy: {
    name: 'Partly Cloudy',
    type: 'partly_cloudy',
    intensity: 0.3,
    windStrength: 0.2,
    windDirection: { x: 1, y: 0 },
    precipitation: 0,
    visibility: 0.9,
    cloudCoverage: 0.35,
    fogBoost: 0,
    lightReduction: 0.1,
    particleDensity: 0,
    wetness: 0,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 120,
    maxDuration: 300,
  },
  overcast: {
    name: 'Overcast',
    type: 'overcast',
    intensity: 0.6,
    windStrength: 0.3,
    windDirection: { x: 1, y: 0 },
    precipitation: 0,
    visibility: 0.7,
    cloudCoverage: 0.8,
    fogBoost: 0.2,
    lightReduction: 0.3,
    particleDensity: 0,
    wetness: 0,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 120,
    maxDuration: 240,
  },
  rain: {
    name: 'Rain',
    type: 'rain',
    intensity: 0.7,
    windStrength: 0.4,
    windDirection: { x: 1, y: 0 },
    precipitation: 0.6,
    visibility: 0.5,
    cloudCoverage: 0.9,
    fogBoost: 0,
    lightReduction: 0.4,
    particleDensity: 0.6,
    wetness: 0.7,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 120,
    maxDuration: 300,
  },
  thunderstorm: {
    name: 'Thunderstorm',
    type: 'thunderstorm',
    intensity: 1.0,
    windStrength: 0.8,
    windDirection: { x: 1, y: 0 },
    precipitation: 0.9,
    visibility: 0.3,
    cloudCoverage: 1.0,
    fogBoost: 0,
    lightReduction: 0.6,
    particleDensity: 0.9,
    wetness: 1.0,
    thunderChance: 0.3,
    transitionDuration: 30,
    minDuration: 60,
    maxDuration: 180,
  },
  snow: {
    name: 'Snow',
    type: 'snow',
    intensity: 0.5,
    windStrength: 0.3,
    windDirection: { x: 1, y: 0 },
    precipitation: 0.5,
    visibility: 0.5,
    cloudCoverage: 0.7,
    fogBoost: 0,
    lightReduction: 0.2,
    particleDensity: 0.5,
    wetness: 0,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 120,
    maxDuration: 300,
  },
  blizzard: {
    name: 'Blizzard',
    type: 'blizzard',
    intensity: 1.0,
    windStrength: 1.0,
    windDirection: { x: 1, y: 0 },
    precipitation: 1.0,
    visibility: 0.15,
    cloudCoverage: 1.0,
    fogBoost: 0,
    lightReduction: 0.7,
    particleDensity: 1.0,
    wetness: 0,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 60,
    maxDuration: 180,
  },
  foggy: {
    name: 'Foggy',
    type: 'foggy',
    intensity: 0.4,
    windStrength: 0.05,
    windDirection: { x: 1, y: 0 },
    precipitation: 0,
    visibility: 0.2,
    cloudCoverage: 0.5,
    fogBoost: 0.8,
    lightReduction: 0.3,
    particleDensity: 0,
    wetness: 0,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 120,
    maxDuration: 240,
  },
  dust_storm: {
    name: 'Dust Storm',
    type: 'dust_storm',
    intensity: 0.8,
    windStrength: 0.9,
    windDirection: { x: 1, y: 0 },
    precipitation: 0,
    visibility: 0.2,
    cloudCoverage: 0.3,
    fogBoost: 0.6,
    lightReduction: 0.5,
    particleDensity: 0.8,
    wetness: 0,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 60,
    maxDuration: 180,
  },
  ash_storm: {
    name: 'Ash Storm',
    type: 'ash_storm',
    intensity: 0.7,
    windStrength: 0.6,
    windDirection: { x: 1, y: 0 },
    precipitation: 0,
    visibility: 0.25,
    cloudCoverage: 0.6,
    fogBoost: 0.5,
    lightReduction: 0.55,
    particleDensity: 0.7,
    wetness: 0,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 60,
    maxDuration: 180,
  },
  magical_storm: {
    name: 'Magical Storm',
    type: 'magical_storm',
    intensity: 0.9,
    windStrength: 0.5,
    windDirection: { x: 1, y: 0 },
    precipitation: 0.3,
    visibility: 0.4,
    cloudCoverage: 0.7,
    fogBoost: 0,
    lightReduction: 0.2,
    particleDensity: 0.6,
    wetness: 0.2,
    thunderChance: 0,
    transitionDuration: 30,
    minDuration: 60,
    maxDuration: 120,
  },
};

// Natural weather progression graph: each type lists plausible next states
const WEATHER_TRANSITIONS: Record<WeatherType, WeatherType[]> = {
  clear:         ['clear', 'partly_cloudy', 'foggy'],
  partly_cloudy: ['clear', 'partly_cloudy', 'overcast'],
  overcast:      ['partly_cloudy', 'overcast', 'rain', 'foggy', 'snow', 'dust_storm'],
  rain:          ['overcast', 'rain', 'thunderstorm', 'foggy'],
  thunderstorm:  ['rain', 'overcast', 'thunderstorm', 'ash_storm', 'magical_storm'],
  snow:          ['overcast', 'snow', 'blizzard'],
  blizzard:      ['snow', 'blizzard'],
  foggy:         ['clear', 'overcast', 'foggy'],
  dust_storm:    ['clear', 'partly_cloudy', 'dust_storm'],
  ash_storm:     ['overcast', 'ash_storm', 'dust_storm'],
  magical_storm: ['clear', 'overcast', 'magical_storm'],
};

// ---------------------------------------------------------------------------
// Interpolation helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpState(from: WeatherState, to: WeatherState, t: number): WeatherState {
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    type:           clampedT < 0.5 ? from.type : to.type,
    intensity:      lerp(from.intensity,      to.intensity,      clampedT),
    windStrength:   lerp(from.windStrength,   to.windStrength,   clampedT),
    windDirection: {
      x: lerp(from.windDirection.x, to.windDirection.x, clampedT),
      y: lerp(from.windDirection.y, to.windDirection.y, clampedT),
    },
    precipitation:  lerp(from.precipitation,  to.precipitation,  clampedT),
    visibility:     lerp(from.visibility,      to.visibility,     clampedT),
    cloudCoverage:  lerp(from.cloudCoverage,  to.cloudCoverage,  clampedT),
    fogBoost:       lerp(from.fogBoost,        to.fogBoost,       clampedT),
    lightReduction: lerp(from.lightReduction, to.lightReduction, clampedT),
    particleDensity:lerp(from.particleDensity,to.particleDensity,clampedT),
    wetness:        lerp(from.wetness,         to.wetness,        clampedT),
    thunderChance:  lerp(from.thunderChance,   to.thunderChance,  clampedT),
  };
}

// ---------------------------------------------------------------------------
// WeatherSystem
// ---------------------------------------------------------------------------

export interface WeatherSystem {
  /** Advance the weather simulation by `deltaSeconds`. */
  update(deltaSeconds: number): void;
  /** Force an immediate transition to a new weather type. */
  setWeather(type: WeatherType, transitionTime?: number): void;
  /** Return the current interpolated WeatherState. */
  getState(): WeatherState;
  /** Return the logical current WeatherType (target when transitioning). */
  getCurrentType(): WeatherType;
}

interface InternalState {
  currentPreset: WeatherPreset;
  targetPreset: WeatherPreset;
  /** 0 → 1 blend progress from currentPreset toward targetPreset. */
  blendProgress: number;
  /** Total seconds for the active transition. */
  transitionDuration: number;
  /** Seconds remaining before an automatic weather change fires. */
  autoChangeCooldown: number;
  /** Whether the user has manually set weather (suppresses auto-cycling). */
  manualOverride: boolean;
  /** Seconds until the manual override expires (0 = no expiry). */
  manualOverrideTimer: number;
}

export function createWeatherSystem(seed = 12345): WeatherSystem {
  const rng = createRng(seed);

  const initialPreset = WEATHER_PRESETS['clear'];

  const state: InternalState = {
    currentPreset:        { ...initialPreset },
    targetPreset:         { ...initialPreset },
    blendProgress:        1,
    transitionDuration:   initialPreset.transitionDuration,
    autoChangeCooldown:   rng.range(120, 300), // first change in 2-5 minutes
    manualOverride:       false,
    manualOverrideTimer:  0,
  };

  // Cached interpolated output — updated every call to update()
  let cachedState: WeatherState = { ...initialPreset };

  function pickNextWeather(fromType: WeatherType): WeatherType {
    const candidates = WEATHER_TRANSITIONS[fromType];
    const idx = Math.floor(rng.next() * candidates.length);
    return candidates[idx];
  }

  function beginTransitionTo(type: WeatherType, overrideDuration?: number): void {
    // Snapshot the current interpolated state as the new "from" so transitions
    // blend smoothly from wherever we are now.
    state.currentPreset  = { ...cachedState } as WeatherPreset;
    state.targetPreset   = { ...WEATHER_PRESETS[type] };
    state.blendProgress  = 0;
    state.transitionDuration = overrideDuration ?? state.targetPreset.transitionDuration;
  }

  function update(deltaSeconds: number): void {
    // Advance blend
    if (state.blendProgress < 1) {
      const step = state.transitionDuration > 0
        ? deltaSeconds / state.transitionDuration
        : 1;
      state.blendProgress = Math.min(1, state.blendProgress + step);
    }

    // Recompute cached interpolated state
    cachedState = lerpState(state.currentPreset, state.targetPreset, state.blendProgress);

    // Handle manual override expiry
    if (state.manualOverride && state.manualOverrideTimer > 0) {
      state.manualOverrideTimer -= deltaSeconds;
      if (state.manualOverrideTimer <= 0) {
        state.manualOverride      = false;
        state.manualOverrideTimer = 0;
        // Schedule next auto-change soon after override ends
        state.autoChangeCooldown = rng.range(60, 120);
      }
    }

    // Auto weather cycling
    if (!state.manualOverride) {
      state.autoChangeCooldown -= deltaSeconds;
      if (state.autoChangeCooldown <= 0) {
        const nextType = pickNextWeather(state.targetPreset.type);
        beginTransitionTo(nextType);
        const nextPreset = WEATHER_PRESETS[nextType];
        state.autoChangeCooldown = rng.range(nextPreset.minDuration, nextPreset.maxDuration);
      }
    }
  }

  function setWeather(type: WeatherType, transitionTime?: number): void {
    beginTransitionTo(type, transitionTime);
    state.manualOverride      = true;
    // Manual override lasts for the full duration of the new weather type
    const preset = WEATHER_PRESETS[type];
    state.manualOverrideTimer = rng.range(preset.minDuration, preset.maxDuration);
    state.autoChangeCooldown  = state.manualOverrideTimer + rng.range(60, 120);
  }

  function getState(): WeatherState {
    return { ...cachedState };
  }

  function getCurrentType(): WeatherType {
    return state.targetPreset.type;
  }

  return { update, setWeather, getState, getCurrentType };
}
