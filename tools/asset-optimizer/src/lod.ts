import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { basename } from 'path';

const LOD_RATIOS = [1.0, 0.5, 0.25];
const LOD_ERRORS = [0.0, 0.01, 0.05];

export async function generateLODs(inputPath: string, outputDir: string): Promise<string[]> {
  await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const outputs: string[] = [];

  for (let i = 0; i < LOD_RATIOS.length; i++) {
    const document = await io.read(inputPath);
    if (i > 0) {
      await document.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: LOD_RATIOS[i], error: LOD_ERRORS[i] }));
    }
    const outPath = `${outputDir}/${basename(inputPath).replace(/\.[^.]+$/, '')}_lod${i}.glb`;
    await io.write(outPath, document);
    outputs.push(outPath);
  }
  return outputs;
}
