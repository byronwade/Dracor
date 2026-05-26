import {
  SkySettings,
  AtmosphereSettings,
  TimeOfDayState,
  WeatherState,
  Color3,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a value to [0, 1]. */
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Hermite smoothstep: smooth transition between 0 and 1 over [edge0, edge1]. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Linear interpolate between two scalars. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear interpolate between two Color3 values. */
function lerpColor(a: Color3, b: Color3, t: number): Color3 {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

/** Multiply two Color3 values component-wise. */
function mulColor(a: Color3, b: Color3): Color3 {
  return { r: a.r * b.r, g: a.g * b.g, b: a.b * b.b };
}

// ---------------------------------------------------------------------------
// Time-of-day transition weights
//
// worldTime is 0..1 where:
//   0.00 = midnight
//   0.25 = dawn
//   0.50 = noon
//   0.75 = dusk
//   1.00 = midnight (next day)
//
// We derive five blend weights that sum to 1:
//   wNight, wDawn, wNoon, wDusk, wMidnight (same as wNight at wrap point)
// ---------------------------------------------------------------------------

interface TimeWeights {
  /** Full night weight (covers both midnight wings) */
  night: number;
  /** Dawn / sunrise weight */
  dawn: number;
  /** Noon / midday weight */
  noon: number;
  /** Dusk / sunset weight */
  dusk: number;
  /** Midnight specifically (subset of night — used for moon/stars peak) */
  midnight: number;
  /** Golden-hour weight = max(dawn, dusk) */
  goldenHour: number;
}

function computeTimeWeights(worldTime: number): TimeWeights {
  // Normalise to 0..1 (handles potential floating point overshoot)
  const t = ((worldTime % 1) + 1) % 1;

  // Key transition times
  const MIDNIGHT = 0.0;
  const DAWN_START = 0.18;   // ~4:20
  const DAWN_PEAK = 0.25;    // ~6:00
  const DAWN_END = 0.33;     // ~8:00
  const NOON_START = 0.40;   // ~9:30
  const NOON_PEAK = 0.50;    // ~12:00
  const NOON_END = 0.60;     // ~14:30
  const DUSK_START = 0.67;   // ~16:00
  const DUSK_PEAK = 0.75;    // ~18:00
  const DUSK_END = 0.83;     // ~20:00
  const NIGHT_FULL = 0.92;   // ~22:00

  // Dawn weight: bell curve centred on DAWN_PEAK
  const dawn =
    smoothstep(DAWN_START, DAWN_PEAK, t) *
    (1 - smoothstep(DAWN_PEAK, DAWN_END, t));

  // Noon weight: bell curve centred on NOON_PEAK
  const noon =
    smoothstep(NOON_START, NOON_PEAK, t) *
    (1 - smoothstep(NOON_PEAK, NOON_END, t));

  // Dusk weight: bell curve centred on DUSK_PEAK
  const dusk =
    smoothstep(DUSK_START, DUSK_PEAK, t) *
    (1 - smoothstep(DUSK_PEAK, DUSK_END, t));

  // Night weight: high outside golden-hour windows
  // Fades in after dusk, fades out before dawn.
  const nightAfterDusk = smoothstep(DUSK_END, NIGHT_FULL, t);
  const nightBeforeDawn = 1 - smoothstep(MIDNIGHT, DAWN_START, t);
  const night = Math.max(nightAfterDusk, nightBeforeDawn);

  // Midnight weight peaks at t=0 / t=1 boundary — use sine trick
  const distFromMidnight = Math.min(t, 1 - t); // 0 at midnight, 0.5 at noon
  const midnight = smoothstep(0.15, 0, distFromMidnight);

  const goldenHour = Math.max(dawn, dusk);

  return { night, dawn, noon, dusk, midnight, goldenHour };
}

// ---------------------------------------------------------------------------
// Reference color palettes
// ---------------------------------------------------------------------------

const ZENITH_NOON: Color3 = { r: 0.15, g: 0.30, b: 0.70 };
const ZENITH_NIGHT: Color3 = { r: 0.01, g: 0.01, b: 0.04 };
const ZENITH_DAWN: Color3 = { r: 0.55, g: 0.35, b: 0.45 }; // warm mauve-pink
const ZENITH_DUSK: Color3 = { r: 0.50, g: 0.28, b: 0.38 }; // slightly redder

const HORIZON_NOON: Color3 = { r: 0.50, g: 0.65, b: 0.85 };
const HORIZON_NIGHT: Color3 = { r: 0.06, g: 0.06, b: 0.10 };
const HORIZON_DAWN: Color3 = { r: 1.00, g: 0.50, b: 0.20 }; // gold-orange
const HORIZON_DUSK: Color3 = { r: 1.00, g: 0.38, b: 0.12 }; // deeper orange

const GROUND_NOON: Color3 = { r: 0.12, g: 0.10, b: 0.08 };
const GROUND_NIGHT: Color3 = { r: 0.04, g: 0.03, b: 0.03 };
const GROUND_GOLDEN: Color3 = { r: 0.20, g: 0.14, b: 0.08 }; // warm earth

const SUN_NOON: Color3 = { r: 1.00, g: 0.95, b: 0.85 };
const SUN_GOLDEN: Color3 = { r: 1.00, g: 0.40, b: 0.10 }; // deep orange

const MOON_COLOR: Color3 = { r: 0.60, g: 0.65, b: 0.80 };

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function computeSkyState(
  time: TimeOfDayState,
  weather: WeatherState,
  biomeSkytint?: Color3,
): { sky: SkySettings; atmosphere: AtmosphereSettings } {
  const w = computeTimeWeights(time.worldTime);

  // ------------------------------------------------------------------
  // Zenith color
  // ------------------------------------------------------------------
  // Start from night base, blend in golden-hour colours, then noon.
  let zenith = lerpColor(ZENITH_NIGHT, ZENITH_DAWN, w.dawn);
  zenith = lerpColor(zenith, ZENITH_DUSK, w.dusk);
  zenith = lerpColor(zenith, ZENITH_NOON, w.noon);

  // ------------------------------------------------------------------
  // Horizon color
  // ------------------------------------------------------------------
  let horizon = lerpColor(HORIZON_NIGHT, HORIZON_DAWN, w.dawn);
  horizon = lerpColor(horizon, HORIZON_DUSK, w.dusk);
  horizon = lerpColor(horizon, HORIZON_NOON, w.noon);

  // ------------------------------------------------------------------
  // Ground color
  // ------------------------------------------------------------------
  let ground = lerpColor(GROUND_NIGHT, GROUND_GOLDEN, w.goldenHour);
  ground = lerpColor(ground, GROUND_NOON, w.noon);

  // ------------------------------------------------------------------
  // Sun color & intensity
  // ------------------------------------------------------------------
  const sunColor = lerpColor(SUN_GOLDEN, SUN_NOON, w.noon);
  let sunIntensity = lerp(0.0, 2.0, w.noon);
  // Partial intensity during golden hours
  sunIntensity = Math.max(sunIntensity, lerp(0.0, 0.8, w.goldenHour));
  // Night: no sun
  sunIntensity *= 1 - w.night;

  // Sun disk & glow — larger/stronger at horizon
  const sunDiskSize = lerp(0.03, 0.015, w.noon);
  const sunGlowIntensity = lerp(0.8, 0.3, w.noon) * (1 - w.night);

  // ------------------------------------------------------------------
  // Moon
  // ------------------------------------------------------------------
  const moonIntensity = lerp(0.0, 0.30, w.midnight) + lerp(0.0, 0.10, w.night * (1 - w.midnight));
  const moonGlowIntensity = moonIntensity * 0.5;

  // Sun/moon directions derived from sunAltitude / moonAltitude
  // sunAltitude is in radians, negative when below horizon
  const sunElevation = time.sunAltitude;
  const moonElevation = time.moonAltitude;
  const sunDirection = {
    x: Math.cos(time.sunAngle) * Math.cos(sunElevation),
    y: Math.sin(sunElevation),
    z: Math.sin(time.sunAngle) * Math.cos(sunElevation),
  };
  const moonDirection = {
    x: Math.cos(time.moonAngle) * Math.cos(moonElevation),
    y: Math.sin(moonElevation),
    z: Math.sin(time.moonAngle) * Math.cos(moonElevation),
  };

  // ------------------------------------------------------------------
  // Star visibility
  // ------------------------------------------------------------------
  // Fully visible at midnight, zero at noon. Gradual fade through dusk/dawn.
  const starVisibility = clamp01(
    w.night * (1 - smoothstep(0.0, 0.3, w.goldenHour)),
  );

  // ------------------------------------------------------------------
  // Exposure
  // ------------------------------------------------------------------
  // Base: 1.0 at noon, 0.5 at night. Golden-hour boost to 1.2.
  let exposure = lerp(0.5, 1.0, w.noon);
  exposure = Math.max(exposure, lerp(exposure, 1.2, w.goldenHour));
  exposure = lerp(0.5, exposure, 1 - w.night * 0.5);

  // ------------------------------------------------------------------
  // Weather influence
  // ------------------------------------------------------------------
  const isOvercast = weather.type === 'overcast';
  const isRain = weather.type === 'rain' || weather.type === 'thunderstorm';
  const isSnow = weather.type === 'snow' || weather.type === 'blizzard';
  const isFoggy = weather.type === 'foggy';
  const isDust = weather.type === 'dust_storm' || weather.type === 'ash_storm';

  const weatherDarkness = weather.lightReduction * weather.intensity;

  if (isOvercast || isRain || isSnow) {
    // Desaturate and darken sky toward gray
    const grayZenith: Color3 = { r: 0.25, g: 0.27, b: 0.30 };
    const grayHorizon: Color3 = { r: 0.35, g: 0.36, b: 0.38 };
    const blend = clamp01(weatherDarkness * (isRain ? 1.0 : 0.7));
    zenith = lerpColor(zenith, grayZenith, blend);
    horizon = lerpColor(horizon, grayHorizon, blend);
  }

  if (isDust) {
    const dustZenith: Color3 = { r: 0.55, g: 0.42, b: 0.18 };
    const dustHorizon: Color3 = { r: 0.75, g: 0.55, b: 0.22 };
    const blend = clamp01(weather.intensity * 0.8);
    zenith = lerpColor(zenith, dustZenith, blend);
    horizon = lerpColor(horizon, dustHorizon, blend);
  }

  // Reduce sun intensity during overcast/rain
  const weatherSunReduction = isOvercast
    ? 0.5
    : isRain
    ? 0.75
    : isSnow
    ? 0.4
    : 0.0;
  sunIntensity *= 1 - clamp01(weatherSunReduction * weather.intensity);

  // weatherInfluence: 0 = clear, 1 = fully weather-controlled
  const weatherInfluence = clamp01(weatherDarkness);

  // cloudShadowInfluence
  const cloudShadowInfluence = clamp01(weather.cloudCoverage * 0.8);

  // ------------------------------------------------------------------
  // Biome sky tint — multiplied into zenith and horizon
  // ------------------------------------------------------------------
  const tintColor: Color3 = biomeSkytint ?? { r: 1, g: 1, b: 1 };
  zenith = mulColor(zenith, tintColor);
  horizon = mulColor(horizon, tintColor);

  const sky: SkySettings = {
    zenithColor: zenith,
    horizonColor: horizon,
    groundColor: ground,
    sunDirection,
    sunColor,
    sunIntensity,
    sunDiskSize,
    sunGlowIntensity,
    moonDirection,
    moonColor: MOON_COLOR,
    moonIntensity,
    moonGlowIntensity,
    starVisibility,
    exposure,
    skyTint: tintColor,
    weatherInfluence,
    cloudShadowInfluence,
  };

  // ------------------------------------------------------------------
  // Atmosphere settings
  // ------------------------------------------------------------------

  // Rayleigh peaks at full daylight, lower at night
  const rayleighDay = 0.8;
  const rayleighNight = 0.15;
  const rayleighStrength = lerp(rayleighNight, rayleighDay, 1 - w.night);

  // Mie increases at golden hour (haze, particles) and during rain/fog
  let mieStrength = lerp(0.05, 0.30, w.goldenHour);
  mieStrength = Math.max(mieStrength, lerp(0, 0.15, w.noon)); // slight haze at noon
  if (isRain || isFoggy) {
    mieStrength = Math.min(1.0, mieStrength + 0.25 * weather.intensity);
  }
  if (isDust) {
    mieStrength = Math.min(1.0, mieStrength + 0.45 * weather.intensity);
  }

  // Mie anisotropy: more directional at sunset, diffuse in fog
  let mieAnisotropy = lerp(0.3, 0.65, w.goldenHour);
  if (isFoggy || isRain) {
    mieAnisotropy = lerp(mieAnisotropy, 0.1, weather.intensity * 0.5);
  }

  // Atmosphere density: slightly thicker in bad weather
  const atmosphereDensity =
    1.0 + clamp01(weatherDarkness) * 0.3;

  // Horizon falloff: sharper on clear days, softer in fog
  let horizonFalloff = lerp(3.0, 1.5, w.goldenHour); // softer at golden hour
  if (isFoggy) {
    horizonFalloff = lerp(horizonFalloff, 0.8, weather.intensity * 0.6);
  }
  if (isRain) {
    horizonFalloff = lerp(horizonFalloff, 1.2, weather.intensity * 0.4);
  }

  // Sky exposure mirrors the main exposure but clamped differently
  const skyExposure = clamp01(exposure * 0.9);

  // Scatter color: blue at noon, orange at golden hour, gray in weather
  let scatterColor = lerpColor(
    { r: 0.4, g: 0.6, b: 1.0 },
    { r: 1.0, g: 0.55, b: 0.2 },
    w.goldenHour,
  );
  if (isOvercast || isRain) {
    scatterColor = lerpColor(
      scatterColor,
      { r: 0.55, g: 0.55, b: 0.58 },
      clamp01(weatherDarkness),
    );
  }

  const atmosphere: AtmosphereSettings = {
    rayleighStrength,
    mieStrength,
    mieAnisotropy,
    atmosphereDensity,
    horizonFalloff,
    skyExposure,
    scatterColor,
  };

  return { sky, atmosphere };
}
