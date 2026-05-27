export interface NavmeshConfig {
  cellSize?: number;
  cellHeight?: number;
}

const AGENT_RADIUS = 0.35;
const AGENT_HEIGHT = 1.8;
const AGENT_MAX_CLIMB = 0.35;
const AGENT_MAX_SLOPE = 55;

export function getNavmeshParams(config?: NavmeshConfig) {
  return {
    cs: config?.cellSize ?? 0.2,
    ch: config?.cellHeight ?? 0.2,
    walkableSlopeAngle: AGENT_MAX_SLOPE,
    walkableHeight: Math.ceil(AGENT_HEIGHT / (config?.cellHeight ?? 0.2)),
    walkableClimb: Math.ceil(AGENT_MAX_CLIMB / (config?.cellHeight ?? 0.2)),
    walkableRadius: Math.ceil(AGENT_RADIUS / (config?.cellSize ?? 0.2)),
    maxEdgeLen: 12,
    maxSimplificationError: 1.3,
    minRegionArea: 8,
    mergeRegionArea: 20,
    maxVertsPerPoly: 6,
    detailSampleDist: 6,
    detailSampleMaxError: 1,
  };
}
