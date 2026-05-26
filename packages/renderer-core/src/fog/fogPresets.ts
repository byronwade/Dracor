export interface FogPreset {
  name: string;
  mode: 'exp' | 'exp2' | 'linear';
  density: number;
  color: [number, number, number];
  start?: number;
  end?: number;
}

export const FOG_PRESETS: Record<string, FogPreset> = {
  ironvale_mist: {
    name: 'ironvale_mist',
    mode: 'exp2',
    density: 0.012,
    color: [0.3, 0.32, 0.38],
  },
  dense_fog: {
    name: 'dense_fog',
    mode: 'exp2',
    density: 0.03,
    color: [0.7, 0.72, 0.73],
  },
  forest_haze: {
    name: 'forest_haze',
    mode: 'exp',
    density: 0.008,
    color: [0.35, 0.45, 0.3],
  },
  clear: {
    name: 'clear',
    mode: 'linear',
    density: 0,
    color: [0.0, 0.0, 0.0],
    start: 500,
    end: 600,
  },
};
