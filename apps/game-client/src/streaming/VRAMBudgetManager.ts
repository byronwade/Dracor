interface TrackedAsset {
  id: string;
  type: 'texture' | 'mesh';
  sizeMB: number;
  cellId: string;
  lastAccessTime: number;
}

export type EvictCallback = (asset: { id: string; type: 'texture' | 'mesh'; cellId: string; sizeMB: number }) => void;

export class VRAMBudgetManager {
  private assets = new Map<string, TrackedAsset>();
  private maxTotalMB: number;
  private currentTextureMB = 0;
  private currentMeshMB = 0;
  private onEvict: EvictCallback | null;

  constructor(maxTotalMB: number, onEvict?: EvictCallback) {
    this.maxTotalMB = maxTotalMB;
    this.onEvict = onEvict ?? null;
  }

  trackAsset(id: string, type: 'texture' | 'mesh', sizeMB: number, cellId: string): void {
    if (this.assets.has(id)) return;
    this.assets.set(id, { id, type, sizeMB, cellId, lastAccessTime: performance.now() });
    if (type === 'texture') this.currentTextureMB += sizeMB;
    else this.currentMeshMB += sizeMB;
  }

  touchAsset(id: string): void {
    const asset = this.assets.get(id);
    if (asset) asset.lastAccessTime = performance.now();
  }

  untrackAsset(id: string): void {
    const asset = this.assets.get(id);
    if (!asset) return;
    if (asset.type === 'texture') this.currentTextureMB -= asset.sizeMB;
    else this.currentMeshMB -= asset.sizeMB;
    this.assets.delete(id);
  }

  isOverBudget(): boolean {
    return this.currentTextureMB + this.currentMeshMB > this.maxTotalMB;
  }

  evictUntilUnderBudget(protectedCells: Set<string>): string[] {
    if (!this.isOverBudget()) return [];

    const evictable = [...this.assets.values()]
      .filter(a => !protectedCells.has(a.cellId))
      .sort((a, b) => a.lastAccessTime - b.lastAccessTime);

    const evicted: string[] = [];
    for (const asset of evictable) {
      if (!this.isOverBudget()) break;
      if (this.onEvict) {
        this.onEvict({ id: asset.id, type: asset.type, cellId: asset.cellId, sizeMB: asset.sizeMB });
      }
      this.untrackAsset(asset.id);
      evicted.push(asset.id);
    }
    return evicted;
  }

  getUsage(): { textureMB: number; meshMB: number; totalMB: number } {
    return {
      textureMB: Math.round(this.currentTextureMB * 10) / 10,
      meshMB: Math.round(this.currentMeshMB * 10) / 10,
      totalMB: Math.round((this.currentTextureMB + this.currentMeshMB) * 10) / 10,
    };
  }

  dispose(): void {
    this.assets.clear();
    this.currentTextureMB = 0;
    this.currentMeshMB = 0;
  }
}
