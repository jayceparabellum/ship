#!/usr/bin/env node
import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const distDir = process.env.AUDIT_DIST_DIR || 'web/dist';
const outFile = process.env.AUDIT_BUNDLE_OUT || '.audit/bundle-analysis.json';

function packageFromSource(source) {
  const normalized = source.replaceAll('\\', '/');
  const nodeModulesIndex = normalized.lastIndexOf('/node_modules/');
  if (nodeModulesIndex === -1) return null;
  const after = normalized.slice(nodeModulesIndex + '/node_modules/'.length);
  const parts = after.split('/');
  if (parts[0]?.startsWith('@')) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] || null;
}

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else files.push(full);
  }
  return files;
}

async function main() {
  const files = await walk(distDir);
  const assets = [];
  for (const file of files) {
    const fileStat = await stat(file);
    assets.push({
      file: file.replaceAll(path.sep, '/'),
      bytes: fileStat.size,
    });
  }

  const packageBytes = new Map();
  const sourceMaps = files.filter((file) => file.endsWith('.map'));
  for (const file of sourceMaps) {
    const map = JSON.parse(await readFile(file, 'utf8'));
    for (let index = 0; index < map.sources.length; index += 1) {
      const pkg = packageFromSource(map.sources[index]);
      if (!pkg) continue;
      const content = map.sourcesContent?.[index] || '';
      packageBytes.set(pkg, (packageBytes.get(pkg) || 0) + Buffer.byteLength(content));
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    distDir,
    totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    assetCount: assets.length,
    largestAssets: assets.sort((a, b) => b.bytes - a.bytes).slice(0, 15),
    topDependenciesBySourceMapBytes: Array.from(packageBytes.entries())
      .map(([name, bytes]) => ({ name, bytes }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 20),
  };

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
