export interface LightingPreset {
  name: string;
  ambientColor: [number, number, number];
  sunColor: [number, number, number];
  sunDirection: [number, number, number];
  sunIntensity: number;
  ambientIntensity: number;
  shadowsEnabled: boolean;
}

export const LIGHTING_PRESETS: Record<string, LightingPreset> = {
  ironvale_dusk: {
    name: 'ironvale_dusk',
    ambientColor: [0.15, 0.1, 0.08],
    sunColor: [1.0, 0.7, 0.35],
    sunDirection: [-0.6, -0.3, -0.75],
    sunIntensity: 1.8,
    ambientIntensity: 0.4,
    shadowsEnabled: true,
  },
  ironvale_overcast: {
    name: 'ironvale_overcast',
    ambientColor: [0.25, 0.27, 0.3],
    sunColor: [0.6, 0.62, 0.65],
    sunDirection: [0.0, -1.0, -0.3],
    sunIntensity: 0.6,
    ambientIntensity: 0.7,
    shadowsEnabled: false,
  },
  dungeon_dark: {
    name: 'dungeon_dark',
    ambientColor: [0.03, 0.02, 0.04],
    sunColor: [0.0, 0.0, 0.0],
    sunDirection: [0.0, -1.0, 0.0],
    sunIntensity: 0.0,
    ambientIntensity: 0.15,
    shadowsEnabled: false,
  },
  moonlit: {
    name: 'moonlit',
    ambientColor: [0.05, 0.06, 0.1],
    sunColor: [0.4, 0.45, 0.7],
    sunDirection: [-0.3, -0.8, -0.5],
    sunIntensity: 0.5,
    ambientIntensity: 0.25,
    shadowsEnabled: true,
  },
};
