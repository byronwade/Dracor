import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, quantize, reorder, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder } from 'meshoptimizer';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

export async function optimizeAssets(inputDir: string, outputDir: string): Promise<void> {
  await MeshoptEncoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });

  const files = await findGltfFiles(inputDir);
  for (const file of files) {
    const document = await io.read(file);
    await document.transform(dedup(), weld(), reorder({ encoder: MeshoptEncoder }), quantize(), prune());
    const outName = basename(file, extname(file)) + '.glb';
    const outPath = join(outputDir, outName);
    await io.write(outPath, document);
    console.log(`Optimized: ${basename(file)} → ${outName}`);
  }
}

async function findGltfFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      const full = join(dir, entry);
      const s = await stat(full);
      if (s.isDirectory()) {
        results.push(...await findGltfFiles(full));
      } else if (/\.(gltf|glb)$/i.test(entry)) {
        results.push(full);
      }
    }
  } catch {
    // directory doesn't exist yet
  }
  return results;
}
