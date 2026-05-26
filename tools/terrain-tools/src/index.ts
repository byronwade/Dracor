import { IRONVALE_OUTSKIRTS } from '@dracor/world-data';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// Performance budget recommendations
const BUDGET = {
  maxChunks: 64,
  maxVertices: 500_000,
  maxTriangles: 1_000_000,
  maxMemoryMB: 256,
  bytesPerVertex: 32, // position (12) + normal (12) + uv (8)
  recommendedLODLevels: 3,
  streamingChunkThreshold: 16, // start streaming above this many chunks
};

function padRight(str: string, len: number): string {
  return str + ' '.repeat(Math.max(0, len - str.length));
}

function padLeft(str: string, len: number): string {
  return ' '.repeat(Math.max(0, len - str.length)) + str;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function main(): void {
  const zone = IRONVALE_OUTSKIRTS;
  const terrain = zone.terrain;
  const chunks = terrain.chunks;

  console.log('');
  console.log(`${BOLD}${CYAN}=== Dracor Terrain Analyzer ===${RESET}`);
  console.log('');
  console.log(`Zone: ${BOLD}${zone.name}${RESET} (${zone.id})`);
  console.log('');

  // Grid dimensions
  const gridXValues = chunks.map(c => c.gridX);
  const gridZValues = chunks.map(c => c.gridZ);
  const minGridX = Math.min(...gridXValues);
  const maxGridX = Math.max(...gridXValues);
  const minGridZ = Math.min(...gridZValues);
  const maxGridZ = Math.max(...gridZValues);
  const gridWidth = maxGridX - minGridX + 1;
  const gridDepth = maxGridZ - minGridZ + 1;

  // Use the first chunk as reference for size/resolution (they are uniform)
  const chunkSize = chunks[0].size;
  const chunkResolution = chunks[0].resolution;
  const lodLevels = chunks[0].lodLevels;

  // Computed metrics
  const numChunks = chunks.length;
  const totalArea = numChunks * chunkSize * chunkSize;
  const verticesPerChunk = chunkResolution * chunkResolution;
  const totalVertices = verticesPerChunk * numChunks;
  const trianglesPerChunk = (chunkResolution - 1) * (chunkResolution - 1) * 2;
  const totalTriangles = trianglesPerChunk * numChunks;
  const estimatedMemoryMB = (totalVertices * BUDGET.bytesPerVertex) / (1024 * 1024);

  // Terrain overview
  console.log(`${BOLD}Terrain Overview:${RESET}`);
  console.log(`${'─'.repeat(55)}`);
  console.log(`  ${padRight('Number of chunks', 30)} ${padLeft(String(numChunks), 20)}`);
  console.log(`  ${padRight('Grid dimensions', 30)} ${padLeft(`${gridWidth} x ${gridDepth}`, 20)}`);
  console.log(`  ${padRight('Chunk size', 30)} ${padLeft(`${chunkSize} x ${chunkSize} units`, 20)}`);
  console.log(`  ${padRight('Total terrain area', 30)} ${padLeft(`${formatNumber(totalArea)} units²`, 20)}`);
  console.log(`  ${padRight('Resolution per chunk', 30)} ${padLeft(`${chunkResolution} x ${chunkResolution}`, 20)}`);
  console.log(`  ${padRight('LOD levels', 30)} ${padLeft(String(lodLevels), 20)}`);
  console.log(`${'─'.repeat(55)}`);
  console.log('');

  // Geometry stats
  console.log(`${BOLD}Geometry Statistics:${RESET}`);
  console.log(`${'─'.repeat(55)}`);
  console.log(`  ${padRight('Vertices per chunk', 30)} ${padLeft(formatNumber(verticesPerChunk), 20)}`);
  console.log(`  ${padRight('Total vertices', 30)} ${padLeft(formatNumber(totalVertices), 20)}`);
  console.log(`  ${padRight('Triangles per chunk', 30)} ${padLeft(formatNumber(trianglesPerChunk), 20)}`);
  console.log(`  ${padRight('Total triangles', 30)} ${padLeft(formatNumber(totalTriangles), 20)}`);
  console.log(`  ${padRight('Est. memory (vertex data)', 30)} ${padLeft(`${estimatedMemoryMB.toFixed(2)} MB`, 20)}`);
  console.log(`${'─'.repeat(55)}`);
  console.log('');

  // Terrain configuration
  console.log(`${BOLD}Terrain Configuration:${RESET}`);
  console.log(`  Material ID:      ${terrain.materialId}`);
  console.log(`  Height scale:     ${terrain.heightScale}`);
  console.log(`  Base elevation:   ${terrain.baseElevation}`);
  console.log(`  Height data:      ${chunks[0].heightData}`);
  console.log('');

  // Performance budget analysis
  console.log(`${BOLD}Performance Budget Analysis:${RESET}`);
  console.log(`${'─'.repeat(55)}`);

  // Chunk count check
  const chunksOk = numChunks <= BUDGET.maxChunks;
  const chunksIcon = chunksOk ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`  ${chunksIcon} ${padRight('Chunk count', 25)} ${padLeft(`${numChunks}/${BUDGET.maxChunks}`, 22)}`);

  // Vertex count check
  const verticesOk = totalVertices <= BUDGET.maxVertices;
  const verticesIcon = verticesOk ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`  ${verticesIcon} ${padRight('Total vertices', 25)} ${padLeft(`${formatNumber(totalVertices)}/${formatNumber(BUDGET.maxVertices)}`, 22)}`);

  // Triangle count check
  const trianglesOk = totalTriangles <= BUDGET.maxTriangles;
  const trianglesIcon = trianglesOk ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`  ${trianglesIcon} ${padRight('Total triangles', 25)} ${padLeft(`${formatNumber(totalTriangles)}/${formatNumber(BUDGET.maxTriangles)}`, 22)}`);

  // Memory check
  const memoryOk = estimatedMemoryMB <= BUDGET.maxMemoryMB;
  const memoryIcon = memoryOk ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`  ${memoryIcon} ${padRight('Estimated memory', 25)} ${padLeft(`${estimatedMemoryMB.toFixed(1)}/${BUDGET.maxMemoryMB} MB`, 22)}`);

  // LOD levels check
  const lodOk = lodLevels >= BUDGET.recommendedLODLevels;
  const lodIcon = lodOk ? `${GREEN}✓${RESET}` : `${YELLOW}!${RESET}`;
  console.log(`  ${lodIcon} ${padRight('LOD levels', 25)} ${padLeft(`${lodLevels}/${BUDGET.recommendedLODLevels} recommended`, 22)}`);

  console.log(`${'─'.repeat(55)}`);

  const allWithinBudget = chunksOk && verticesOk && trianglesOk && memoryOk;
  if (allWithinBudget) {
    console.log(`  ${GREEN}${BOLD}Within performance budget${RESET}`);
  } else {
    console.log(`  ${RED}${BOLD}Exceeds performance budget${RESET}`);
  }
  console.log('');

  // LOD strategy recommendation
  console.log(`${BOLD}LOD Strategy:${RESET}`);
  if (lodLevels >= 3) {
    console.log(`  ${GREEN}✓${RESET} ${lodLevels} LOD levels configured - good for draw distance management`);
  } else if (lodLevels >= 2) {
    console.log(`  ${YELLOW}!${RESET} Only ${lodLevels} LOD levels - consider adding a 3rd level for far-distance rendering`);
  } else {
    console.log(`  ${RED}✗${RESET} Only ${lodLevels} LOD level - terrain will not degrade with distance`);
    console.log(`    Recommendation: Add at least 3 LOD levels (full, half, quarter resolution)`);
  }

  // LOD vertex/triangle estimates
  console.log(`  LOD breakdown (estimated):`);
  for (let lod = 0; lod < lodLevels; lod++) {
    const divisor = Math.pow(2, lod);
    const lodRes = Math.max(2, Math.floor(chunkResolution / divisor));
    const lodVerts = lodRes * lodRes * numChunks;
    const lodTris = (lodRes - 1) * (lodRes - 1) * 2 * numChunks;
    console.log(`    LOD ${lod}: ${formatNumber(lodVerts)} vertices, ${formatNumber(lodTris)} triangles (${lodRes}x${lodRes} per chunk)`);
  }
  console.log('');

  // Streaming recommendations
  console.log(`${BOLD}Streaming Recommendations:${RESET}`);
  if (numChunks > BUDGET.streamingChunkThreshold) {
    console.log(`  ${YELLOW}!${RESET} ${numChunks} chunks exceeds streaming threshold (${BUDGET.streamingChunkThreshold})`);
    console.log(`    - Enable chunk streaming to load/unload terrain dynamically`);
    console.log(`    - Load radius: ~${Math.ceil(gridWidth / 2)} chunks from camera`);
    console.log(`    - Unload radius: ~${Math.ceil(gridWidth / 2) + 1} chunks from camera`);
    console.log(`    - Priority load: chunks near player spawn (${zone.playerSpawn.x}, ${zone.playerSpawn.z})`);
  } else {
    console.log(`  ${GREEN}✓${RESET} Chunk count (${numChunks}) is below streaming threshold (${BUDGET.streamingChunkThreshold})`);
    console.log(`    Full terrain can be loaded into memory at once`);
  }

  // World bounds vs terrain coverage
  const boundsWidth = zone.bounds.maxX - zone.bounds.minX;
  const boundsDepth = zone.bounds.maxZ - zone.bounds.minZ;
  const boundsArea = boundsWidth * boundsDepth;
  const coverage = (totalArea / boundsArea) * 100;
  console.log('');
  console.log(`${BOLD}Coverage:${RESET}`);
  console.log(`  Zone bounds:     ${boundsWidth} x ${boundsDepth} (${formatNumber(boundsArea)} units²)`);
  console.log(`  Terrain area:    ${formatNumber(totalArea)} units²`);
  console.log(`  Coverage:        ${coverage.toFixed(1)}%`);
  console.log('');

  console.log(`${BOLD}${CYAN}Terrain analysis complete${RESET}`);
  console.log('');
}

main();
