import type { SkySettings, AtmosphereSettings, TimeOfDayState, WeatherState, Color3 } from './types';

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function lerpColor(a: Color3, b: Color3, t: number): Color3 {
  const ct = clamp01(t);
  return { r: a.r + (b.r - a.r) * ct, g: a.g + (b.g - a.g) * ct, b: a.b + (b.b - a.b) * ct };
}

function mulColor(a: Color3, b: Color3): Color3 {
  return { r: a.r * b.r, g: a.g * b.g, b: a.b * b.b };
}

const DEG_TO_RAD = Math.PI / 180;

function isGoldenHour(time: TimeOfDayState): number {
  const t = time.worldTime;
  const dawn = Math.max(0, 1 - Math.abs(t - 0.25) / 0.08);
  const dusk = Math.max(0, 1 - Math.abs(t - 0.75) / 0.08);
  return Math.max(dawn, dusk);
}

export function computeSkyState(
  time: TimeOfDayState,
  weather: WeatherState,
  biomeSkytint?: Color3,
): { sky: SkySettings; atmosphere: AtmosphereSettings } {
  const daylight = time.daylight;
  const nightFactor = time.nightFactor;
  const golden = isGoldenHour(time);

  const ZENITH_DAY: Color3 = { r: 0.15, g: 0.35, b: 0.75 };
  const ZENITH_NIGHT: Color3 = { r: 0.01, g: 0.01, b: 0.04 };
  const ZENITH_GOLDEN: Color3 = { r: 0.45, g: 0.25, b: 0.40 };

  const HORIZON_DAY: Color3 = { r: 0.55, g: 0.70, b: 0.90 };
  const HORIZON_NIGHT: Color3 = { r: 0.05, g: 0.05, b: 0.10 };
  const HORIZON_GOLDEN: Color3 = { r: 1.0, g: 0.50, b: 0.18 };

  const GROUND_DAY: Color3 = { r: 0.12, g: 0.10, b: 0.08 };
  const GROUND_NIGHT: Color3 = { r: 0.04, g: 0.03, b: 0.03 };

  let zenith = lerpColor(ZENITH_NIGHT, ZENITH_DAY, daylight);
  zenith = lerpColor(zenith, ZENITH_GOLDEN, golden * 0.6);

  let horizon = lerpColor(HORIZON_NIGHT, HORIZON_DAY, daylight);
  horizon = lerpColor(horizon, HORIZON_GOLDEN, golden * 0.8);

  const ground = lerpColor(GROUND_NIGHT, GROUND_DAY, daylight);

  // Use raw (unclamped) altitudes so the sun/moon direction goes below the
  // horizon at night instead of being pinned to altitude=0.
  const sunAltRaw = Math.sin(Math.PI * (time.worldTime - 0.25) / 0.5) * 70;
  const moonAltRaw = -sunAltRaw + 10;

  const sunAzRad = time.sunAngle * DEG_TO_RAD;
  const sunAltRad = sunAltRaw * DEG_TO_RAD;
  const cosAlt = Math.cos(sunAltRad);
  const sunDirection = {
    x: -(cosAlt * Math.cos(sunAzRad)),
    y: -Math.sin(sunAltRad),
    z: -(cosAlt * Math.sin(sunAzRad)),
  };

  const moonAzRad = time.moonAngle * DEG_TO_RAD;
  const moonAltRad = moonAltRaw * DEG_TO_RAD;
  const cosMoonAlt = Math.cos(moonAltRad);
  const moonDirection = {
    x: -(cosMoonAlt * Math.cos(moonAzRad)),
    y: -Math.sin(moonAltRad),
    z: -(cosMoonAlt * Math.sin(moonAzRad)),
  };

  const SUN_DAY: Color3 = { r: 1.0, g: 0.95, b: 0.85 };
  const SUN_GOLDEN: Color3 = { r: 1.0, g: 0.45, b: 0.12 };
  const sunColor = lerpColor(SUN_DAY, SUN_GOLDEN, golden);

  let sunIntensity = daylight * 2.0;
  sunIntensity = Math.max(sunIntensity, golden * 0.8);

  const sunDiskSize = lerp(0.015, 0.04, golden);
  const sunGlowIntensity = lerp(0.3, 0.8, golden) * daylight;

  const moonColor: Color3 = { r: 0.60, g: 0.65, b: 0.80 };
  const moonIntensity = nightFactor * 0.3;
  const moonGlowIntensity = nightFactor * 0.15;

  const starVisibility = clamp01(nightFactor * 1.5 - golden * 0.5);

  let exposure = lerp(0.5, 1.0, daylight);
  exposure = Math.max(exposure, lerp(1.0, 1.2, golden));

  const weatherDark = weather.lightReduction * weather.intensity;
  if (weatherDark > 0) {
    const gray: Color3 = { r: 0.3, g: 0.32, b: 0.35 };
    zenith = lerpColor(zenith, gray, weatherDark * 0.6);
    horizon = lerpColor(horizon, gray, weatherDark * 0.4);
    sunIntensity *= 1 - weatherDark * 0.7;
    exposure *= 1 - weatherDark * 0.2;
  }

  const tint = biomeSkytint ?? { r: 1, g: 1, b: 1 };
  zenith = mulColor(zenith, tint);
  horizon = mulColor(horizon, tint);

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
    moonColor,
    moonIntensity,
    moonGlowIntensity,
    starVisibility,
    exposure,
    skyTint: tint,
    weatherInfluence: clamp01(weatherDark),
    cloudShadowInfluence: clamp01(weather.cloudCoverage * 0.6),
  };

  const atmosphere: AtmosphereSettings = {
    rayleighStrength: lerp(0.2, 0.8, daylight),
    mieStrength: lerp(0.05, 0.3, golden) + weather.fogBoost * 0.2,
    mieAnisotropy: lerp(0.3, 0.7, golden),
    atmosphereDensity: lerp(0.5, 1.0, daylight),
    horizonFalloff: lerp(2.0, 4.0, weather.fogBoost),
    skyExposure: exposure,
    scatterColor: lerpColor({ r: 0.3, g: 0.5, b: 1.0 }, { r: 1.0, g: 0.6, b: 0.2 }, golden),
  };

  return { sky, atmosphere };
}
