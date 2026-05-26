import { IRONVALE_ASSET_MANIFEST } from '@dracor/world-data';
import type { WorldAssetManifest, AssetEntry } from '@dracor/world-data';
import { MAX_ZONE_SIZE_MB } from '@dracor/asset-pipeline';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// Recommended size thresholds
const MAX_MESH_SIZE_MB = 5;
const MAX_TEXTURE_SIZE_MB = 2;

// Preferred compressed texture formats
const COMPRESSED_TEXTURE_FORMATS = new Set(['texture_ktx2', 'texture_basis']);

interface AssetAnalysis {
  totalAssets: number;
  totalSizeMB: number;
  meshCount: number;
  meshSizeMB: number;
  textureCount: number;
  textureSizeMB: number;
  audioCount: number;
  audioSizeMB: number;
  oversizedMeshes: AssetEntry[];
  oversizedTextures: AssetEntry[];
  uncompressedTextures: AssetEntry[];
  meshesWithLOD: Map<string, AssetEntry[]>;
  meshesWithoutLOD: AssetEntry[];
  score: number;
}

function getBaseMeshName(id: string): string {
  // Strip _lod1, _lod2, etc. to find the base mesh name
  return id.replace(/_lod\d+$/, '');
}

function analyzeAssets(manifest: WorldAssetManifest): AssetAnalysis {
  const allAssets: AssetEntry[] = [
    ...manifest.meshes,
    ...manifest.textures,
    ...manifest.audio,
  ];

  const totalSizeMB = allAssets.reduce((sum, a) => sum + a.sizeMB, 0);
  const meshSizeMB = manifest.meshes.reduce((sum, a) => sum + a.sizeMB, 0);
  const textureSizeMB = manifest.textures.reduce((sum, a) => sum + a.sizeMB, 0);
  const audioSizeMB = manifest.audio.reduce((sum, a) => sum + a.sizeMB, 0);

  // Find oversized assets
  const oversizedMeshes = manifest.meshes.filter(m => m.sizeMB > MAX_MESH_SIZE_MB);
  const oversizedTextures = manifest.textures.filter(t => t.sizeMB > MAX_TEXTURE_SIZE_MB);

  // Check texture compression
  const uncompressedTextures = manifest.textures.filter(
    t => !COMPRESSED_TEXTURE_FORMATS.has(t.type)
  );

  // Check LOD coverage for meshes
  const meshGroups = new Map<string, AssetEntry[]>();
  for (const mesh of manifest.meshes) {
    const baseName = getBaseMeshName(mesh.id);
    if (!meshGroups.has(baseName)) {
      meshGroups.set(baseName, []);
    }
    meshGroups.get(baseName)!.push(mesh);
  }

  const meshesWithLOD = new Map<string, AssetEntry[]>();
  const meshesWithoutLOD: AssetEntry[] = [];

  for (const [baseName, meshes] of meshGroups) {
    if (meshes.length > 1) {
      meshesWithLOD.set(baseName, meshes);
    } else {
      // Single mesh with no LOD variants
      const mesh = meshes[0];
      if (mesh.lodLevel === 0 || mesh.lodLevel === undefined) {
        meshesWithoutLOD.push(mesh);
      }
    }
  }

  // Calculate score (out of 10)
  let score = 10;

  // Deduct for oversized assets
  if (oversizedMeshes.length > 0) score -= Math.min(2, oversizedMeshes.length * 0.5);
  if (oversizedTextures.length > 0) score -= Math.min(2, oversizedTextures.length * 0.5);

  // Deduct for uncompressed textures
  if (uncompressedTextures.length > 0) {
    const ratio = uncompressedTextures.length / manifest.textures.length;
    score -= ratio * 2;
  }

  // Deduct for missing LOD
  if (meshesWithoutLOD.length > 0) {
    const ratio = meshesWithoutLOD.length / meshGroups.size;
    score -= ratio * 2;
  }

  // Deduct if total size exceeds budget
  if (totalSizeMB > MAX_ZONE_SIZE_MB) {
    score -= 2;
  }

  score = Math.max(0, Math.round(score * 10) / 10);

  return {
    totalAssets: allAssets.length,
    totalSizeMB,
    meshCount: manifest.meshes.length,
    meshSizeMB,
    textureCount: manifest.textures.length,
    textureSizeMB,
    audioCount: manifest.audio.length,
    audioSizeMB,
    oversizedMeshes,
    oversizedTextures,
    uncompressedTextures,
    meshesWithLOD,
    meshesWithoutLOD,
    score,
  };
}

function padRight(str: string, len: number): string {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function padLeft(str: string, len: number): string {
  return ' '.repeat(Math.max(0, len - str.length)) + str;
}

function main(): void {
  console.log('');
  console.log(`${BOLD}${CYAN}=== Dracor Asset Optimizer ===${RESET}`);
  console.log('');
  console.log(`Analyzing: ${BOLD}${IRONVALE_ASSET_MANIFEST.zoneId}${RESET} (v${IRONVALE_ASSET_MANIFEST.version})`);
  console.log('');

  const analysis = analyzeAssets(IRONVALE_ASSET_MANIFEST);

  // Asset summary table
  console.log(`${BOLD}Asset Summary:${RESET}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`  ${padRight('Category', 14)} ${padLeft('Count', 6)} ${padLeft('Size (MB)', 10)}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`  ${padRight('Meshes', 14)} ${padLeft(String(analysis.meshCount), 6)} ${padLeft(analysis.meshSizeMB.toFixed(2), 10)}`);
  console.log(`  ${padRight('Textures', 14)} ${padLeft(String(analysis.textureCount), 6)} ${padLeft(analysis.textureSizeMB.toFixed(2), 10)}`);
  console.log(`  ${padRight('Audio', 14)} ${padLeft(String(analysis.audioCount), 6)} ${padLeft(analysis.audioSizeMB.toFixed(2), 10)}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`  ${BOLD}${padRight('Total', 14)} ${padLeft(String(analysis.totalAssets), 6)} ${padLeft(analysis.totalSizeMB.toFixed(2), 10)}${RESET}`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`  ${DIM}Zone budget: ${MAX_ZONE_SIZE_MB} MB${RESET}`);
  console.log('');

  // Warnings for oversized assets
  if (analysis.oversizedMeshes.length > 0 || analysis.oversizedTextures.length > 0) {
    console.log(`${BOLD}${YELLOW}Oversized Assets:${RESET}`);
    for (const mesh of analysis.oversizedMeshes) {
      console.log(`  ${RED}!${RESET} Mesh "${mesh.id}" is ${mesh.sizeMB} MB (max recommended: ${MAX_MESH_SIZE_MB} MB)`);
    }
    for (const tex of analysis.oversizedTextures) {
      console.log(`  ${RED}!${RESET} Texture "${tex.id}" is ${tex.sizeMB} MB (max recommended: ${MAX_TEXTURE_SIZE_MB} MB)`);
    }
    console.log('');
  } else {
    console.log(`${GREEN}✓${RESET} No oversized assets detected`);
    console.log('');
  }

  // Texture compression status
  console.log(`${BOLD}Texture Compression:${RESET}`);
  if (analysis.uncompressedTextures.length === 0) {
    console.log(`  ${GREEN}✓${RESET} All textures use compressed formats (KTX2/Basis)`);
  } else {
    console.log(`  ${YELLOW}!${RESET} ${analysis.uncompressedTextures.length} texture(s) not using compressed format:`);
    for (const tex of analysis.uncompressedTextures) {
      console.log(`      ${tex.id} (${tex.type})`);
    }
    console.log(`  ${DIM}Recommendation: Consider KTX2 compression for textures${RESET}`);
  }
  console.log('');

  // LOD coverage
  console.log(`${BOLD}LOD Coverage:${RESET}`);
  console.log(`  Meshes with LOD chain: ${GREEN}${analysis.meshesWithLOD.size}${RESET}`);
  for (const [baseName, meshes] of analysis.meshesWithLOD) {
    const levels = meshes.map(m => `L${m.lodLevel ?? 0}`).join(', ');
    console.log(`    ${GREEN}✓${RESET} ${baseName} [${levels}]`);
  }
  if (analysis.meshesWithoutLOD.length > 0) {
    console.log(`  Meshes without LOD: ${YELLOW}${analysis.meshesWithoutLOD.length}${RESET}`);
    for (const mesh of analysis.meshesWithoutLOD) {
      console.log(`    ${YELLOW}!${RESET} ${mesh.id} (${mesh.sizeMB} MB)`);
    }
    console.log(`  ${DIM}Recommendation: Add LOD levels for meshes > 1 MB to improve draw distance performance${RESET}`);
  } else {
    console.log(`  ${GREEN}✓${RESET} All meshes have LOD variants`);
  }
  console.log('');

  // Recommendations
  console.log(`${BOLD}Recommendations:${RESET}`);
  const recommendations: string[] = [];

  if (analysis.oversizedTextures.length > 0) {
    recommendations.push('Reduce texture sizes exceeding 2 MB or split into tiled atlases');
  }
  if (analysis.uncompressedTextures.length > 0) {
    recommendations.push('Convert uncompressed textures to KTX2 format for faster GPU upload');
  }
  if (analysis.meshesWithoutLOD.length > 0) {
    recommendations.push('Generate LOD meshes for assets lacking level-of-detail variants');
  }
  if (analysis.totalSizeMB > MAX_ZONE_SIZE_MB * 0.75) {
    recommendations.push(`Zone approaching size budget (${analysis.totalSizeMB.toFixed(1)}/${MAX_ZONE_SIZE_MB} MB) - consider streaming`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Assets are well-optimized for the current zone budget');
  }

  for (const rec of recommendations) {
    console.log(`  - ${rec}`);
  }
  console.log('');

  // Overall score
  const scoreColor = analysis.score >= 8 ? GREEN : analysis.score >= 5 ? YELLOW : RED;
  console.log(`${BOLD}Asset readiness: ${scoreColor}${analysis.score}/10${RESET}`);
  console.log('');
  console.log(`${DIM}Run with --fix to apply optimizations (coming soon)${RESET}`);
  console.log('');
}

main();
