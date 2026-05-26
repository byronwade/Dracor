export interface MeshBudget {
  maxTrianglesPerMesh: number;
  maxTotalTriangles: number;
  maxVerticesPerMesh: number;
  lodRequired: boolean;
  maxLodLevels: number;
  instancedThreshold: number;
}

export function getMeshBudget(qualityTier: string): MeshBudget {
  switch (qualityTier) {
    case 'low':
      return {
        maxTrianglesPerMesh: 5_000,
        maxTotalTriangles: 200_000,
        maxVerticesPerMesh: 3_000,
        lodRequired: true,
        maxLodLevels: 2,
        instancedThreshold: 5,
      };
    case 'medium':
      return {
        maxTrianglesPerMesh: 15_000,
        maxTotalTriangles: 500_000,
        maxVerticesPerMesh: 10_000,
        lodRequired: true,
        maxLodLevels: 3,
        instancedThreshold: 10,
      };
    case 'high':
      return {
        maxTrianglesPerMesh: 50_000,
        maxTotalTriangles: 1_500_000,
        maxVerticesPerMesh: 30_000,
        lodRequired: true,
        maxLodLevels: 4,
        instancedThreshold: 20,
      };
    case 'ultra':
      return {
        maxTrianglesPerMesh: 100_000,
        maxTotalTriangles: 3_000_000,
        maxVerticesPerMesh: 60_000,
        lodRequired: false,
        maxLodLevels: 5,
        instancedThreshold: 50,
      };
    default:
      return {
        maxTrianglesPerMesh: 15_000,
        maxTotalTriangles: 500_000,
        maxVerticesPerMesh: 10_000,
        lodRequired: true,
        maxLodLevels: 3,
        instancedThreshold: 10,
      };
  }
}
