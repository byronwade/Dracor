import { CloudSettings, TimeOfDayState, WeatherState, BiomeAtmosphereProfile } from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function computeCloudState(
  time: TimeOfDayState,
  weather: WeatherState,
  biome?: BiomeAtmosphereProfile,
): CloudSettings {
  const isThunderstorm = weather.type === 'thunderstorm';
  const isOvercast = weather.type === 'overcast' || weather.cloudCoverage > 0.75;
  const isStormy = isThunderstorm || weather.type === 'blizzard';
  const isClear = weather.type === 'clear' && weather.cloudCoverage < 0.25;

  // Coverage: weather is primary driver; biome cloudDensity nudges it up
  const biomeCloudBoost = biome ? biome.cloudDensity * 0.15 : 0;
  const coverage = clamp(weather.cloudCoverage + biomeCloudBoost, 0, 1);

  // Density: thicker during overcast/storm, thinner during clear
  let density: number;
  if (isStormy) {
    density = lerp(0.7, 1.0, weather.intensity);
  } else if (isOvercast) {
    density = lerp(0.5, 0.75, weather.cloudCoverage);
  } else if (isClear) {
    density = lerp(0.05, 0.2, weather.cloudCoverage);
  } else {
    density = lerp(0.2, 0.55, weather.cloudCoverage);
  }

  // Altitude: base 500m; storm clouds lower; wispy high-altitude at 800m
  let altitude: number;
  if (isStormy) {
    altitude = lerp(500, 300, weather.intensity);
  } else if (isClear) {
    altitude = lerp(500, 800, 1 - weather.cloudCoverage);
  } else {
    altitude = 500;
  }

  // Speed: wind strength * 20 m/s
  const speed = weather.windStrength * 20;

  // Direction: directly from weather wind direction
  const direction = { x: weather.windDirection.x, y: weather.windDirection.y };

  // Sharpness: 0.5 base; sharper when clear, softer when overcast
  let sharpness: number;
  if (isClear) {
    sharpness = lerp(0.5, 0.8, 1 - weather.cloudCoverage);
  } else if (isOvercast) {
    sharpness = lerp(0.2, 0.5, 1 - weather.cloudCoverage);
  } else {
    sharpness = 0.5;
  }

  // Shadow strength: 0.3 base, up to 0.7 in heavy overcast; zero at night
  let shadowStrength: number;
  if (time.nightFactor > 0.8) {
    shadowStrength = 0;
  } else {
    const overcastFactor = clamp((weather.cloudCoverage - 0.5) / 0.5, 0, 1);
    const rawShadow = lerp(0.3, 0.7, overcastFactor);
    shadowStrength = rawShadow * (1 - time.nightFactor);
  }

  // Storm darkness: 0 normally, ramps up to 0.8 during thunderstorms
  const stormDarkness = isThunderstorm
    ? lerp(0, 0.8, weather.intensity)
    : 0;

  // Cloud color: varies by time of day and weather conditions
  let color = { r: 1.0, g: 1.0, b: 1.0 };
  if (isStormy) {
    // Dark gray storm clouds
    const grayValue = lerp(0.8, 0.4, weather.intensity);
    color = { r: grayValue, g: grayValue, b: grayValue + 0.05 };
  } else if (time.period === 'sunset' || time.period === 'dusk') {
    // Warm gold/pink at sunset
    const t = time.periodProgress;
    color = {
      r: lerp(1.0, 0.88, t),
      g: lerp(0.88, 0.62, t),
      b: lerp(0.72, 0.58, t),
    };
  } else if (time.period === 'dawn') {
    // Soft pink-gold at dawn
    const t = time.periodProgress;
    color = {
      r: lerp(0.85, 1.0, t),
      g: lerp(0.65, 0.9, t),
      b: lerp(0.7, 0.88, t),
    };
  } else if (time.nightFactor > 0.5) {
    // Dark blue-gray at night
    const nightT = clamp((time.nightFactor - 0.5) / 0.5, 0, 1);
    color = {
      r: lerp(0.85, 0.22, nightT),
      g: lerp(0.88, 0.24, nightT),
      b: lerp(0.92, 0.32, nightT),
    };
  } else if (time.period === 'noon') {
    // Bright white at noon
    color = { r: 1.0, g: 1.0, b: 1.0 };
  } else {
    // Default white/light gray
    color = { r: 0.95, g: 0.96, b: 0.98 };
  }

  // High cloud opacity: normally 0.2, drops to 0 in overcast (occluded by low clouds)
  const highCloudOpacity = isOvercast ? 0 : lerp(0.2, 0, clamp((weather.cloudCoverage - 0.5) / 0.5, 0, 1));

  // Low cloud opacity: 0 when clear, ramps up with coverage
  const lowCloudOpacity = clamp((weather.cloudCoverage - 0.2) / 0.6, 0, 1);

  return {
    coverage,
    density,
    altitude,
    speed,
    direction,
    sharpness,
    shadowStrength,
    stormDarkness,
    highCloudOpacity,
    lowCloudOpacity,
    color,
  };
}
