import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const SRC = join(REPO_ROOT, "apps/game-client/public/models");
const DST = join(REPO_ROOT, "apps/web/public/models");

const SUBDIRS = ["characters", "weapons"];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".glb") || entry.endsWith(".gltf")) out.push(full);
  }
  return out;
}

let copied = 0;
let skipped = 0;

for (const sub of SUBDIRS) {
  const srcRoot = join(SRC, sub);
  for (const srcFile of walk(srcRoot)) {
    const rel = relative(SRC, srcFile);
    const dstFile = join(DST, rel);

    const srcStat = statSync(srcFile);
    if (existsSync(dstFile)) {
      const dstStat = statSync(dstFile);
      if (srcStat.size === dstStat.size && srcStat.mtimeMs <= dstStat.mtimeMs) {
        skipped++;
        continue;
      }
    }

    mkdirSync(dirname(dstFile), { recursive: true });
    cpSync(srcFile, dstFile);
    console.log(`  copied  ${rel}`);
    copied++;
  }
}

console.log(`\nsync-public-assets: ${copied} copied, ${skipped} up-to-date`);
