export interface BiomeDefinition {
  id: string;
  name: string;
  groundColor: [number, number, number];
  groundRoughness: number;
  foliageTypes: string[];
  rockTypes: string[];
  ambientParticles?: string;
  description: string;
}
