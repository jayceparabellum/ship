import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const packages = ['web', 'api', 'shared'];
const sourceRoots = packages.map((pkg) => path.join(root, pkg, 'src'));

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', 'build'].includes(entry.name)) walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

function packageName(file) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  return packages.find((pkg) => relative.startsWith(`${pkg}/`)) ?? 'unknown';
}

function countTsDirectives(text) {
  return [...text.matchAll(/@ts-(?:ignore|expect-error)\b/g)].length;
}

const totals = {
  any: 0,
  assertions: 0,
  nonNull: 0,
  tsDirectives: 0,
};
const byPackage = Object.fromEntries(packages.map((pkg) => [pkg, { ...totals }]));
const byFile = [];

for (const file of sourceRoots.flatMap((dir) => walk(dir))) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const counts = { any: 0, assertions: 0, nonNull: 0, tsDirectives: countTsDirectives(text) };

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) counts.any += 1;
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) counts.assertions += 1;
    if (ts.isNonNullExpression(node)) counts.nonNull += 1;
    ts.forEachChild(node, visit);
  }

  visit(source);

  const pkg = packageName(file);
  for (const key of Object.keys(totals)) {
    totals[key] += counts[key];
    byPackage[pkg][key] += counts[key];
  }

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  if (total > 0) {
    byFile.push({
      file: path.relative(root, file).replaceAll(path.sep, '/'),
      total,
      ...counts,
    });
  }
}

byFile.sort((a, b) => b.total - a.total);
const productionTopFiles = byFile.filter(({ file }) => !/(\.test\.|__tests__\/|\/test\/)/.test(file));

console.log(JSON.stringify({
  totals,
  byPackage,
  topFiles: byFile.slice(0, 10),
  productionTopFiles: productionTopFiles.slice(0, 10),
}, null, 2));
