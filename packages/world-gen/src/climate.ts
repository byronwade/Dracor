import { createFractalNoise2D, createWarpedNoise2D, type NoiseFn2D } from './noise';
import { type WorldSeed } from './seed';
import { HALF_WORLD } from './config';

export type ClimateFn = (worldX: number, worldZ: number) => number;

export interface ClimateMap {
  getTemperature: ClimateFn;  // 0 = freezing, 1 = scorching
  getMoisture: ClimateFn;     // 0 = arid, 1 = saturated
}

export function createClimateMap(
  worldSeed: WorldSeed,
  getElevation: (wx: number, wz: number) => number,
  getContinental: (wx: number, wz: number) => number
): ClimateMap {
  // Temperature:
  // - Base: latitude gradient (north = cold, south = warm, using worldZ)
  // - Reduced by elevation (mountains are cold)
  // - Noise variation for local climates
  // - Continental interior slightly more extreme

  const tempSeed = worldSeed.getLayerSeed('temperature');
  const tempNoise = createWarpedNoise2D(tempSeed, 4, 0.25);
  const tempFreq = 0.0003;

  const getTemperature = (worldX: number, worldZ: number): number => {
    // Latitude gradient: Z goes from -4096 (north/cold) to +4096 (south/warm)
    const latFactor = (worldZ + HALF_WORLD) / (HALF_WORLD * 2); // 0=north, 1=south
    const baseTemp = 0.2 + latFactor * 0.6; // range 0.2 to 0.8

    // Elevation cooling: -0.003 per meter above sea level
    const elev = getElevation(worldX, worldZ);
    const elevCooling = Math.max(0, elev) * 0.003;

    // Noise variation
    const noise = tempNoise(worldX * tempFreq, worldZ * tempFreq) * 0.15;

    // Continental effect: interior is more extreme
    const cont = getContinental(worldX, worldZ);
    const interiorBoost = cont > 0.7 ? (cont - 0.7) * 0.3 : 0;

    return clamp01(baseTemp - elevCooling + noise + interiorBoost);
  };

  // Moisture:
  // - Higher near ocean (low continental value)
  // - Higher at lower elevations
  // - Reduced in rain shadow (downwind of mountains)
  // - Noise variation for local wet/dry areas

  const moistSeed = worldSeed.getLayerSeed('moisture');
  const moistNoise = createFractalNoise2D(moistSeed, 5, 2.0, 0.5);
  const moistFreq = 0.0004;

  const getMoisture = (worldX: number, worldZ: number): number => {
    // Ocean proximity: closer to coast = more moisture
    const cont = getContinental(worldX, worldZ);
    const oceanProximity = 1 - Math.min(1, Math.max(0, (cont - 0.35) / 0.5));
    const baseMoist = 0.3 + oceanProximity * 0.4;

    // Elevation: valleys are wetter, peaks are drier
    const elev = getElevation(worldX, worldZ);
    const elevEffect = -Math.max(0, elev) * 0.002 + Math.max(0, -elev) * 0.01;

    // Noise
    const noise = moistNoise(worldX * moistFreq, worldZ * moistFreq) * 0.25;

    // Temperature interaction: hot + dry tends to stay dry
    const temp = getTemperature(worldX, worldZ);
    const heatDrying = temp > 0.7 ? -(temp - 0.7) * 0.3 : 0;

    return clamp01(baseMoist + elevEffect + noise + heatDrying);
  };

  return { getTemperature, getMoisture };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
