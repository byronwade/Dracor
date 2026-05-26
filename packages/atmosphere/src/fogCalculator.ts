import {
  FogSettings,
  DistanceFogSettings,
  HeightFogSettings,
  VolumetricFogSettings,
  TimeOfDayState,
  WeatherState,
  BiomeAtmosphereProfile,
  Color3,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: Color3, b: Color3, t: number): Color3 {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

// ---------------------------------------------------------------------------
// Time-of-day helpers (mirror of skyCalculator — kept local to avoid coupling)
// ---------------------------------------------------------------------------

/** Returns a 0-1 weight for golden hour (dawn ∪ dusk). */
function goldenHourWeight(worldTime: number): number {
  const t = ((worldTime % 1) + 1) % 1;
  const dawnW =
    smoothstep(0.18, 0.25, t) * (1 - smoothstep(0.25, 0.33, t));
  const duskW =
    smoothstep(0.67, 0.75, t) * (1 - smoothstep(0.75, 0.83, t));
  return Math.max(dawnW, duskW);
}

/** Returns a 0-1 weight for night. */
function nightWeight(worldTime: number): number {
  const t = ((worldTime % 1) + 1) % 1;
  const nightAfterDusk = smoothstep(0.83, 0.92, t);
  const nightBeforeDawn = 1 - smoothstep(0, 0.18, t);
  return Math.max(nightAfterDusk, nightBeforeDawn);
}

/** Returns a 0-1 weight for dawn specifically (not dusk). */
function dawnWeight(worldTime: number): number {
  const t = ((worldTime % 1) + 1) % 1;
  return smoothstep(0.18, 0.25, t) * (1 - smoothstep(0.25, 0.33, t));
}

/** Returns a 0-1 weight for dusk specifically. */
function duskWeight(worldTime: number): number {
  const t = ((worldTime % 1) + 1) % 1;
  return smoothstep(0.67, 0.75, t) * (1 - smoothstep(0.75, 0.83, t));
}

/** Returns a 0-1 weight for noon. */
function noonWeight(worldTime: number): number {
  const t = ((worldTime % 1) + 1) % 1;
  return (
    smoothstep(0.40, 0.50, t) * (1 - smoothstep(0.50, 0.60, t))
  );
}

// ---------------------------------------------------------------------------
// Reference fog colors
// ---------------------------------------------------------------------------

const FOG_COLOR_NOON: Color3 = { r: 0.70, g: 0.78, b: 0.88 };   // light sky-blue
const FOG_COLOR_GOLDEN: Color3 = { r: 0.85, g: 0.62, b: 0.38 }; // warm amber
const FOG_COLOR_NIGHT: Color3 = { r: 0.08, g: 0.08, b: 0.12 };  // dark blue-gray
const FOG_COLOR_RAIN: Color3 = { r: 0.45, g: 0.46, b: 0.50 };   // cool gray
const FOG_COLOR_DAWN_MIST: Color3 = { r: 0.78, g: 0.72, b: 0.68 }; // soft pink-white
const FOG_COLOR_DUSK_MIST: Color3 = { r: 0.80, g: 0.60, b: 0.45 }; // peach

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function computeFogState(
  time: TimeOfDayState,
  weather: WeatherState,
  biome?: BiomeAtmosphereProfile,
): FogSettings {
  const wt = time.worldTime;
  const golden = goldenHourWeight(wt);
  const night = nightWeight(wt);
  const noon = noonWeight(wt);
  const dawn = dawnWeight(wt);
  const dusk = duskWeight(wt);
  const isRain = weather.type === 'rain' || weather.type === 'thunderstorm';
  const isSnow = weather.type === 'snow';
  const isBlizzard = weather.type === 'blizzard';
  const isFoggy = weather.type === 'foggy';
  const isDust = weather.type === 'dust_storm' || weather.type === 'ash_storm';
  const isOvercast = weather.type === 'overcast';
  const weatherIntensity = weather.intensity;

  // -------------------------------------------------------------------------
  // Base horizon fog color (used by distance fog)
  // -------------------------------------------------------------------------
  // Blend between time-of-day colors
  let baseHorizonColor = lerpColor(FOG_COLOR_NIGHT, FOG_COLOR_NOON, noon);
  baseHorizonColor = lerpColor(baseHorizonColor, FOG_COLOR_GOLDEN, golden * 0.7);
  if (dawn > 0.05) {
    baseHorizonColor = lerpColor(baseHorizonColor, FOG_COLOR_DAWN_MIST, dawn * 0.5);
  }
  if (dusk > 0.05) {
    baseHorizonColor = lerpColor(baseHorizonColor, FOG_COLOR_DUSK_MIST, dusk * 0.5);
  }

  // Slightly mute for distance fog (not as vibrant as the sky horizon)
  const muteFactor = 0.85;
  let distFogColor: Color3 = {
    r: baseHorizonColor.r * muteFactor,
    g: baseHorizonColor.g * muteFactor,
    b: baseHorizonColor.b * muteFactor,
  };

  // Weather shifts fog color toward gray / cool
  if (isRain || isOvercast) {
    distFogColor = lerpColor(
      distFogColor,
      FOG_COLOR_RAIN,
      clamp01(weatherIntensity * (isRain ? 1.0 : 0.6)),
    );
  }
  if (isDust) {
    const dustFog: Color3 = { r: 0.70, g: 0.55, b: 0.28 };
    distFogColor = lerpColor(distFogColor, dustFog, clamp01(weatherIntensity * 0.8));
  }

  // Biome overrides fog color
  if (biome) {
    distFogColor = biome.fogColor;
  }

  // -------------------------------------------------------------------------
  // Distance fog
  // -------------------------------------------------------------------------
  const BASE_FOG_START = 100;
  const BASE_FOG_END = 400;

  let fogEnd = BASE_FOG_END;
  if (isRain) fogEnd = lerp(BASE_FOG_END, 250, clamp01(weatherIntensity));
  if (isBlizzard) fogEnd = lerp(BASE_FOG_END, 80, clamp01(weatherIntensity));
  if (isSnow) fogEnd = lerp(BASE_FOG_END, 180, clamp01(weatherIntensity));
  if (isFoggy) fogEnd = lerp(BASE_FOG_END, 120, clamp01(weatherIntensity * 0.9));
  if (isDust) fogEnd = lerp(BASE_FOG_END, 150, clamp01(weatherIntensity * 0.7));
  if (isOvercast) fogEnd = lerp(BASE_FOG_END, 320, clamp01(weatherIntensity * 0.5));
  if (biome) {
    // Biome visibility distance acts as a cap
    fogEnd = Math.min(fogEnd, biome.visibilityDistance);
  }

  const fogStart = Math.min(BASE_FOG_START, fogEnd * 0.3);

  // Exponential density derived from start/end for renderers that prefer it
  const fogDensity = 1 / Math.max(fogEnd - fogStart, 1);

  const distance: DistanceFogSettings = {
    start: fogStart,
    end: fogEnd,
    density: fogDensity,
    color: distFogColor,
    heightInfluence: lerp(0.0, 0.4, golden) + lerp(0.0, 0.2, night),
  };

  // -------------------------------------------------------------------------
  // Height fog color (slightly warmer / more saturated than distance fog)
  // -------------------------------------------------------------------------
  let heightFogColor = lerpColor(FOG_COLOR_NIGHT, FOG_COLOR_NOON, noon);
  heightFogColor = lerpColor(heightFogColor, FOG_COLOR_GOLDEN, golden);
  if (isRain) {
    heightFogColor = lerpColor(
      heightFogColor,
      { r: 0.40, g: 0.42, b: 0.47 },
      clamp01(weatherIntensity * 0.8),
    );
  }
  if (night > 0.5) {
    heightFogColor = lerpColor(
      heightFogColor,
      { r: 0.06, g: 0.07, b: 0.10 },
      smoothstep(0.5, 1.0, night),
    );
  }
  if (biome) {
    heightFogColor = lerpColor(heightFogColor, biome.fogColor, 0.6);
  }

  // -------------------------------------------------------------------------
  // Height fog density
  // -------------------------------------------------------------------------
  const BASE_HEIGHT_DENSITY = 0.01;
  let heightDensity = BASE_HEIGHT_DENSITY;

  // Dawn/dusk morning mist: 3× boost
  heightDensity = Math.max(heightDensity, BASE_HEIGHT_DENSITY * 3 * golden);

  // Rain: 2× boost
  if (isRain) {
    heightDensity = Math.max(
      heightDensity,
      BASE_HEIGHT_DENSITY * 2 * clamp01(weatherIntensity),
    );
  }

  // Snow/blizzard: 2.5× boost
  if (isSnow || isBlizzard) {
    heightDensity = Math.max(
      heightDensity,
      BASE_HEIGHT_DENSITY * 2.5 * clamp01(weatherIntensity),
    );
  }

  // Foggy: 4× boost
  if (isFoggy) {
    heightDensity = Math.max(
      heightDensity,
      BASE_HEIGHT_DENSITY * 4 * clamp01(weatherIntensity),
    );
  }

  // Biome density modifiers
  const isSwamp = biome?.biomeId.toLowerCase().includes('swamp');
  const isForest = biome?.biomeId.toLowerCase().includes('forest');
  if (isSwamp) {
    heightDensity *= lerp(1, 5, clamp01(biome!.fogDensity));
  } else if (biome) {
    heightDensity *= lerp(1, 2, clamp01(biome.fogDensity * 0.5));
  }

  // Valley and water boosts (pulled from biome profile if available)
  const waterBoost = biome
    ? lerp(1.0, 2.5, clamp01(biome.mistAmount))
    : 1.0 + golden * 0.5;
  const valleyBoost = 1.2 + golden * 0.8;

  const height: HeightFogSettings = {
    density: heightDensity,
    baseHeight: 0,
    falloff: 0.02, // fog thins above ~50m (1 / 50 = 0.02)
    color: heightFogColor,
    waterBoost,
    valleyBoost,
  };

  // -------------------------------------------------------------------------
  // Volumetric fog
  // -------------------------------------------------------------------------
  const BASE_VOL_DENSITY = 0.005;
  let volDensity = BASE_VOL_DENSITY;
  let scattering = 0.3;
  let anisotropy = 0.3;
  let lightShaftStrength = 0.0;
  let shadowedFogStrength = 0.2;

  // Sunset anisotropy boost
  anisotropy = lerp(0.3, 0.7, dusk);
  // Dawn slightly more anisotropic too
  anisotropy = Math.max(anisotropy, lerp(0.3, 0.55, dawn));

  // Dawn/dusk god rays
  if ((dawn > 0.1 || dusk > 0.1) && isForest) {
    lightShaftStrength = lerp(0, 0.8, Math.max(dawn, dusk));
    volDensity = BASE_VOL_DENSITY * 2;
  } else if (dawn > 0.15 || dusk > 0.15) {
    lightShaftStrength = lerp(0, 0.5, Math.max(dawn, dusk));
    volDensity = BASE_VOL_DENSITY * 1.5;
  }

  // Storm: high scattering
  if (weather.type === 'thunderstorm') {
    scattering = lerp(0.3, 0.9, clamp01(weatherIntensity));
    volDensity = lerp(BASE_VOL_DENSITY, 0.04, clamp01(weatherIntensity));
    lightShaftStrength = 0; // blocked by clouds
  } else if (isRain) {
    scattering = lerp(0.3, 0.6, clamp01(weatherIntensity));
    volDensity = lerp(BASE_VOL_DENSITY, 0.02, clamp01(weatherIntensity));
  } else if (isFoggy) {
    scattering = lerp(0.3, 0.75, clamp01(weatherIntensity));
    volDensity = lerp(BASE_VOL_DENSITY, 0.03, clamp01(weatherIntensity));
    anisotropy = lerp(anisotropy, 0.15, clamp01(weatherIntensity * 0.6));
  } else if (isDust) {
    scattering = lerp(0.3, 0.8, clamp01(weatherIntensity));
    volDensity = lerp(BASE_VOL_DENSITY, 0.025, clamp01(weatherIntensity));
    anisotropy = lerp(anisotropy, 0.6, clamp01(weatherIntensity * 0.5));
    lightShaftStrength = lerp(lightShaftStrength, 0.4, clamp01(weatherIntensity));
  }

  // Night: reduce volumetric (less light to scatter)
  volDensity *= lerp(1, 0.4, night);
  scattering *= lerp(1, 0.5, night);
  lightShaftStrength *= lerp(1, 0.0, night);

  // Shadow fog stronger in overcast / rain
  shadowedFogStrength = lerp(0.2, 0.6, clamp01(weather.cloudCoverage));

  // Volumetric quality: map to 0-1 (full quality at high density)
  const quality = clamp01(volDensity / 0.04);

  const enabled = volDensity > 0.001;

  const volumetric: VolumetricFogSettings = {
    enabled,
    density: volDensity,
    scattering,
    anisotropy,
    quality,
    lightShaftStrength,
    shadowedFogStrength,
  };

  return { distance, height, volumetric };
}
