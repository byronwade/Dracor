import type { AtmosphereState, WeatherType, BiomeAtmosphereProfile, Color3 } from './types';
import { createTimeSystem, type TimeSystem } from './time';
import { createWeatherSystem, type WeatherSystem } from './weather';
import { computeSkyState } from './skyCalculator';
import { computeFogState } from './fogCalculator';
import { computeCloudState } from './cloudCalculator';
import { BIOME_PROFILES } from './biomeProfiles';

export interface AtmosphereEngine {
  update(deltaSeconds: number): void;
  getState(): AtmosphereState;
  setTime(worldTime: number): void;
  setWeather(type: WeatherType, transitionTime?: number): void;
  setBiome(biomeId: string): void;
  getTimeSystem(): TimeSystem;
  getWeatherSystem(): WeatherSystem;
}

export function createAtmosphereEngine(options?: {
  initialTime?: number;
  dayLengthMinutes?: number;
  weatherSeed?: number;
  biomeId?: string;
}): AtmosphereEngine {
  const time = createTimeSystem(options?.initialTime, options?.dayLengthMinutes);
  const weather = createWeatherSystem(options?.weatherSeed);
  let currentBiome: BiomeAtmosphereProfile | undefined =
    options?.biomeId ? BIOME_PROFILES[options.biomeId] : undefined;

  let cachedState: AtmosphereState | null = null;

  function computeState(): AtmosphereState {
    const timeState = time.getState();
    const weatherState = weather.getState();

    const biomeSkyTint: Color3 | undefined = currentBiome?.skyTint;

    const { sky, atmosphere } = computeSkyState(timeState, weatherState, biomeSkyTint);
    const fog = computeFogState(timeState, weatherState, currentBiome);
    const clouds = computeCloudState(timeState, weatherState, currentBiome);

    const ambientColor: Color3 = {
      r: sky.zenithColor.r * 0.3 + sky.horizonColor.r * 0.2 + 0.05,
      g: sky.zenithColor.g * 0.3 + sky.horizonColor.g * 0.2 + 0.05,
      b: sky.zenithColor.b * 0.3 + sky.horizonColor.b * 0.2 + 0.08,
    };

    const ambientIntensity = 0.15 + timeState.daylight * 0.35 - weatherState.lightReduction * 0.1;

    const directionalColor: Color3 = { ...sky.sunColor };
    const directionalIntensity = sky.sunIntensity * (1 - weatherState.lightReduction * weatherState.intensity);

    return {
      time: timeState,
      sky,
      atmosphere,
      fog,
      clouds,
      weather: weatherState,
      ambientColor,
      ambientIntensity: Math.max(0.05, ambientIntensity),
      directionalColor,
      directionalIntensity: Math.max(0, directionalIntensity),
    };
  }

  return {
    update(deltaSeconds: number) {
      time.update(deltaSeconds);
      weather.update(deltaSeconds);
      cachedState = null;
    },

    getState(): AtmosphereState {
      if (!cachedState) cachedState = computeState();
      return cachedState;
    },

    setTime(worldTime: number) {
      time.setTime(worldTime);
      cachedState = null;
    },

    setWeather(type: WeatherType, transitionTime?: number) {
      weather.setWeather(type, transitionTime);
      cachedState = null;
    },

    setBiome(biomeId: string) {
      currentBiome = BIOME_PROFILES[biomeId] ?? currentBiome;
      cachedState = null;
    },

    getTimeSystem() { return time; },
    getWeatherSystem() { return weather; },
  };
}
