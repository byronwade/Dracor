import { IRONVALE_OUTSKIRTS } from '@dracor/world-data';
import { validateZoneManifest } from '@dracor/asset-pipeline';

// ANSI color codes
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

interface CheckResult {
  name: string;
  passed: boolean;
  detail?: string;
}

function runChecks(zone: typeof IRONVALE_OUTSKIRTS): CheckResult[] {
  const results: CheckResult[] = [];

  // 1. Zone has an id and name
  results.push({
    name: 'Zone has an id and name',
    passed: typeof zone.id === 'string' && zone.id.length > 0 &&
            typeof zone.name === 'string' && zone.name.length > 0,
    detail: `id="${zone.id}", name="${zone.name}"`,
  });

  // 2. Terrain has at least one chunk
  results.push({
    name: 'Terrain has at least one chunk',
    passed: Array.isArray(zone.terrain.chunks) && zone.terrain.chunks.length > 0,
    detail: `${zone.terrain.chunks.length} chunks found`,
  });

  // 3. All terrain chunks have unique IDs
  const chunkIds = zone.terrain.chunks.map(c => c.id);
  const uniqueChunkIds = new Set(chunkIds);
  results.push({
    name: 'All terrain chunks have unique IDs',
    passed: chunkIds.length === uniqueChunkIds.size,
    detail: `${chunkIds.length} chunks, ${uniqueChunkIds.size} unique IDs`,
  });

  // 4. Player spawn exists and has valid coordinates
  const spawn = zone.playerSpawn;
  results.push({
    name: 'Player spawn exists and has valid coordinates',
    passed: spawn != null &&
            typeof spawn.x === 'number' && typeof spawn.y === 'number' && typeof spawn.z === 'number' &&
            isFinite(spawn.x) && isFinite(spawn.y) && isFinite(spawn.z),
    detail: spawn ? `position=(${spawn.x}, ${spawn.y}, ${spawn.z})` : 'missing',
  });

  // 5. All foliage groups have positive counts
  const foliagePositive = zone.foliage.every(f => typeof f.count === 'number' && f.count > 0);
  results.push({
    name: 'All foliage groups have positive counts',
    passed: foliagePositive,
    detail: zone.foliage.map(f => `${f.id}: ${f.count}`).join(', '),
  });

  // 6. All rock groups have positive counts
  const rocksPositive = zone.rocks.every(r => typeof r.count === 'number' && r.count > 0);
  results.push({
    name: 'All rock groups have positive counts',
    passed: rocksPositive,
    detail: zone.rocks.map(r => `${r.id}: ${r.count}`).join(', '),
  });

  // 7. Roads have at least 2 points each
  const roadsValid = zone.roads.every(r => Array.isArray(r.points) && r.points.length >= 2);
  results.push({
    name: 'Roads have at least 2 points each',
    passed: roadsValid,
    detail: zone.roads.map(r => `${r.id}: ${r.points.length} points`).join(', '),
  });

  // 8. Landmarks have positions
  const landmarksValid = zone.landmarks.every(
    l => l.position != null &&
         typeof l.position.x === 'number' &&
         typeof l.position.y === 'number' &&
         typeof l.position.z === 'number'
  );
  results.push({
    name: 'Landmarks have positions',
    passed: landmarksValid,
    detail: `${zone.landmarks.length} landmarks checked`,
  });

  // 9. Lighting preset is specified
  results.push({
    name: 'Lighting preset is specified',
    passed: typeof zone.lightingPreset === 'string' && zone.lightingPreset.length > 0,
    detail: `preset="${zone.lightingPreset}"`,
  });

  // 10. Fog preset is specified
  results.push({
    name: 'Fog preset is specified',
    passed: typeof zone.fogPreset === 'string' && zone.fogPreset.length > 0,
    detail: `preset="${zone.fogPreset}"`,
  });

  // 11. Bounds are valid (max > min)
  const bounds = zone.bounds;
  results.push({
    name: 'Bounds are valid (max > min)',
    passed: bounds.maxX > bounds.minX && bounds.maxZ > bounds.minZ,
    detail: `X: [${bounds.minX}, ${bounds.maxX}], Z: [${bounds.minZ}, ${bounds.maxZ}]`,
  });

  // 12. No duplicate spawn point IDs
  const spawnIds = zone.spawns.map(s => s.id);
  const uniqueSpawnIds = new Set(spawnIds);
  results.push({
    name: 'No duplicate spawn point IDs',
    passed: spawnIds.length === uniqueSpawnIds.size,
    detail: `${spawnIds.length} spawns, ${uniqueSpawnIds.size} unique IDs`,
  });

  // 13. All spawn types are valid
  const validSpawnTypes = new Set(['player', 'npc', 'enemy', 'item', 'event']);
  const allSpawnTypesValid = zone.spawns.every(s => validSpawnTypes.has(s.type));
  results.push({
    name: 'All spawn types are valid (player|npc|enemy|item|event)',
    passed: allSpawnTypesValid,
    detail: `types found: ${[...new Set(zone.spawns.map(s => s.type))].join(', ')}`,
  });

  return results;
}

function main(): void {
  console.log('');
  console.log(`${BOLD}${CYAN}=== Dracor World Validator ===${RESET}`);
  console.log('');
  console.log(`Validating zone: ${BOLD}${IRONVALE_OUTSKIRTS.name}${RESET} (${IRONVALE_OUTSKIRTS.id})`);
  console.log('');

  // Run the asset-pipeline validator for additional context
  const pipelineResult = validateZoneManifest(IRONVALE_OUTSKIRTS);
  if (pipelineResult.warnings.length > 0) {
    console.log(`${YELLOW}Pipeline warnings:${RESET}`);
    for (const warning of pipelineResult.warnings) {
      console.log(`  ${YELLOW}!${RESET} ${warning}`);
    }
    console.log('');
  }
  if (pipelineResult.errors.length > 0) {
    console.log(`${RED}Pipeline errors:${RESET}`);
    for (const error of pipelineResult.errors) {
      console.log(`  ${RED}x${RESET} ${error}`);
    }
    console.log('');
  }

  // Run the granular checks
  const checks = runChecks(IRONVALE_OUTSKIRTS);
  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;

  console.log(`${BOLD}Validation Checks:${RESET}`);
  console.log('');

  for (const check of checks) {
    const icon = check.passed ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    console.log(`  ${icon} ${check.name}`);
    if (check.detail && !check.passed) {
      console.log(`      ${YELLOW}${check.detail}${RESET}`);
    }
  }

  console.log('');
  console.log(`${BOLD}Summary:${RESET} ${passed}/${total} checks passed`);

  // Also include pipeline validation status in final result
  const allPassed = passed === total && pipelineResult.valid;

  console.log('');
  if (allPassed) {
    console.log(`${GREEN}${BOLD}✓ World validation PASSED${RESET}`);
    console.log('');
  } else {
    console.log(`${RED}${BOLD}✗ World validation FAILED${RESET}`);
    console.log('');
    process.exit(1);
  }
}

main();
