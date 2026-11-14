import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const routesDir = path.join(root, 'backend', 'src', 'routes');
const outputDir = path.join(root, 'docs', 'diagrams', 'source');
const outputFile = path.join(outputDir, '06-danh-muc-api.puml');

const appFile = path.join(root, 'backend', 'src', 'app.ts');

/**
 * Doc mount prefix cua tung router tu app.ts.
 * Vi du: `app.use('/api/v1/users', usersRouter)` -> usersRouter = '/api/v1/users'.
 * Nho vay route inventory hien thi duong dan day du thay vi chi '/me', '/:id'...
 */
function readMounts() {
  const source = fs.readFileSync(appFile, 'utf8');
  const imports = new Map();
  const importRegex = /import\s+(?:([A-Za-z0-9_]+)\s*,?\s*)?(?:\{([^}]+)\})?\s*from\s*['"]\.\/routes\/([^'"]+)['"]/g;
  for (const match of source.matchAll(importRegex)) {
    const defaultName = match[1];
    const named = match[2];
    const file = match[3].replace(/\.ts$/, '');
    if (defaultName) imports.set(defaultName, file);
    if (named) {
      for (const part of named.split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop();
        if (name) imports.set(name, file);
      }
    }
  }

  const mounts = new Map();
  const mountRegex = /app\s*\.\s*use\s*\(\s*(['"`])(\/api\/v1\/[^'"`]+)\1\s*,\s*([A-Za-z0-9_]+)\s*\)/g;
  for (const match of source.matchAll(mountRegex)) {
    const prefix = match[2].replace(/\/+$/, '');
    const file = imports.get(match[3]);
    if (file) mounts.set(file, prefix);
  }
  return mounts;
}

function joinRoute(prefix, route) {
  if (!prefix) return route;
  const pathPart = route === '/' ? '' : route;
  return (prefix + pathPart).replace(/\/{2,}/g, '/');
}

function generate() {
  if (!fs.existsSync(routesDir)) throw new Error('Khong tim thay backend/src/routes');
  const mounts = readMounts();
  const rows = [];
  const files = fs.readdirSync(routesDir).filter((name) => name.endsWith('.ts')).sort();
  for (const file of files) {
    const source = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const regex = /router\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(\s*(['"`])([^'"`]+)\2/gi;
    const fileKey = file.replace(/\.ts$/, '');
    const prefix = mounts.get(fileKey) ?? '';
    for (const match of source.matchAll(regex)) {
      rows.push({
        method: match[1].toUpperCase(),
        route: joinRoute(prefix, match[3]),
        file,
        mounted: Boolean(prefix),
      });
    }
  }
  fs.mkdirSync(outputDir, { recursive: true });
  const lines = [
    '@startuml',
    'title Express routes extracted from backend/src/routes',
    'left to right direction',
    'skinparam shadowing false',
    'rectangle "Backend Express API" {',
  ];
  rows.sort((a, b) => a.file.localeCompare(b.file) || a.route.localeCompare(b.route));
  rows.forEach((row, i) => {
    const label = (row.method + ' ' + row.route).replace(/"/g, '\\"');
    lines.push('  usecase "' + label + '" as R' + (i + 1));
  });
  lines.push(
    '}',
    'note bottom',
    'Generated from static router.method("/path") declarations.',
    'Mount prefixes are read from backend/src/app.ts; /health is served outside /api/v1.',
    'Detected routes: ' + rows.length + ' (' + rows.filter((row) => row.mounted).length + ' mounted under /api/v1)',
    'end note',
    '@enduml',
    '',
  );
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf8');
  console.log('Generated docs/diagrams/source/06-danh-muc-api.puml (' + rows.length + ' routes, prefixes included)');
}
function render() {
  const result = spawnSync(process.env.PLANTUML_CMD || 'plantuml', ['-tsvg', '-tpng', ...fs.readdirSync(outputDir).filter(f => f.endsWith('.puml')).map(f => path.join(outputDir, f))], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw new Error('Khong chay duoc PlantUML CLI. Hay cai Java va PlantUML, hoac dat PLANTUML_CMD.');
  if (result.status !== 0) throw new Error('PlantUML render failed with exit code ' + result.status);
}
const mode = process.argv[2] || 'generate';
if (mode === 'generate') generate();
else if (mode === 'render') { generate(); render(); }
else if (mode === 'watch') {
  const dirs = ['routes', 'controllers', 'services', 'models'].map(x => path.join(root, 'backend', 'src', x)).filter(fs.existsSync);
  generate();
  console.log('Watching backend source. Ctrl+C to stop.');
  for (const dir of dirs) fs.watch(dir, { recursive: true }, (_event, name) => {
    if (!name || !String(name).endsWith('.ts')) return;
    generate();
    if (!dir.endsWith(path.sep + 'routes')) console.warn('Business logic changed: review so-do-trinh-tu-*.puml manually.');
  });
} else throw new Error('Usage: node tools/diagram-generator/generate.mjs [generate|render|watch]');
