export interface Color3 {
  r: number;
  g: number;
  b: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type TimePeriod = 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'dusk' | 'night' | 'midnight';

export type WeatherType =
  | 'clear'
  | 'partly_cloudy'
  | 'overcast'
  | 'rain'
  | 'thunderstorm'
  | 'snow'
  | 'blizzard'
  | 'foggy'
  | 'dust_storm'
  | 'ash_storm'
  | 'magical_storm';

export type QualityMode = 'low' | 'medium' | 'high' | 'ultra' | 'cinematic';

export interface SkySettings {
  zenithColor: Color3;
  horizonColor: Color3;
  groundColor: Color3;
  sunDirection: Vec3;
  sunColor: Color3;
  sunIntensity: number;
  sunDiskSize: number;
  sunGlowIntensity: number;
  moonDirection: Vec3;
  moonColor: Color3;
  moonIntensity: number;
  moonGlowIntensity: number;
  starVisibility: number;
  exposure: number;
  skyTint: Color3;
  weatherInfluence: number;
  cloudShadowInfluence: number;
}

export interface AtmosphereSettings {
  rayleighStrength: number;
  mieStrength: number;
  mieAnisotropy: number;
  atmosphereDensity: number;
  horizonFalloff: number;
  skyExposure: number;
  scatterColor: Color3;
}

export interface DistanceFogSettings {
  start: number;
  end: number;
  density: number;
  color: Color3;
  heightInfluence: number;
}

export interface HeightFogSettings {
  density: number;
  baseHeight: number;
  falloff: number;
  color: Color3;
  waterBoost: number;
  valleyBoost: number;
}

export interface VolumetricFogSettings {
  enabled: boolean;
  density: number;
  scattering: number;
  anisotropy: number;
  quality: number;
  lightShaftStrength: number;
  shadowedFogStrength: number;
}

export interface FogSettings {
  distance: DistanceFogSettings;
  height: HeightFogSettings;
  volumetric: VolumetricFogSettings;
}

export type LocalFogType =
  | 'swamp'
  | 'cave'
  | 'river_mist'
  | 'waterfall_mist'
  | 'poison'
  | 'magical'
  | 'dust_storm'
  | 'snow_haze'
  | 'ocean_mist';

export interface LocalFogVolume {
  type: LocalFogType;
  position: Vec3;
  radius: number;
  height: number;
  density: number;
  color: Color3;
  animationSpeed: number;
}

export interface CloudSettings {
  coverage: number;
  density: number;
  altitude: number;
  speed: number;
  direction: Vec2;
  sharpness: number;
  shadowStrength: number;
  stormDarkness: number;
  highCloudOpacity: number;
  lowCloudOpacity: number;
  color: Color3;
}

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  windStrength: number;
  windDirection: Vec2;
  precipitation: number;
  visibility: number;
  wetness: number;
  cloudCoverage: number;
  fogBoost: number;
  lightReduction: number;
  particleDensity: number;
  thunderChance: number;
}

export interface WeatherPreset extends WeatherState {
  name: string;
  transitionDuration: number;
  minDuration: number;
  maxDuration: number;
}

export interface BiomeAtmosphereProfile {
  biomeId: string;
  skyTint: Color3;
  fogColor: Color3;
  fogDensity: number;
  fogHeight: number;
  mistAmount: number;
  cloudDensity: number;
  cloudType: 'clear' | 'wispy' | 'scattered' | 'overcast' | 'stormy';
  humidity: number;
  dustAmount: number;
  rainChance: number;
  stormChance: number;
  snowChance: number;
  windStrength: number;
  particleAtmosphere: string;
  visibilityDistance: number;
  sunsetColorBias: Color3;
  nightBrightness: number;
}

export interface TimeOfDayState {
  worldTime: number;
  period: TimePeriod;
  periodProgress: number;
  sunAngle: number;
  sunAltitude: number;
  moonAngle: number;
  moonAltitude: number;
  daylight: number;
  nightFactor: number;
}

export interface AtmosphereState {
  time: TimeOfDayState;
  sky: SkySettings;
  atmosphere: AtmosphereSettings;
  fog: FogSettings;
  clouds: CloudSettings;
  weather: WeatherState;
  ambientColor: Color3;
  ambientIntensity: number;
  directionalColor: Color3;
  directionalIntensity: number;
}

export interface VisibilitySettings {
  farClipDistance: number;
  fogStartDistance: number;
  fogEndDistance: number;
  objectCullDistance: number;
  terrainLODDistance: number;
  foliageCullDistance: number;
}

export interface QualityAtmosphereSettings {
  volumetricFogEnabled: boolean;
  volumetricFogSamples: number;
  cloudResolution: number;
  fogSampleCount: number;
  skyResolution: number;
  shadowInteraction: boolean;
  maxLocalFogVolumes: number;
  particleDensityMultiplier: number;
}

export interface ISkyRenderer {
  update(state: AtmosphereState): void;
  dispose(): void;
}

export interface IFogRenderer {
  update(state: AtmosphereState, cameraPosition: Vec3): void;
  dispose(): void;
}

export interface ICloudRenderer {
  update(state: AtmosphereState): void;
  dispose(): void;
}

export interface IAtmosphereRenderer {
  sky: ISkyRenderer;
  fog: IFogRenderer;
  clouds: ICloudRenderer;
  update(state: AtmosphereState, cameraPosition: Vec3): void;
  dispose(): void;
}
