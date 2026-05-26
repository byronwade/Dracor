export interface StreamingCell {
  id: string;
  gridX: number;
  gridZ: number;
  size: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assets: string[];
  loadDistance: number;
  unloadDistance: number;
}
