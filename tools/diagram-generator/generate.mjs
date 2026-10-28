import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const routesDir = path.join(root, 'backend', 'src', 'routes');
const outputDir = path.join(root, 'docs', 'diagrams', 'source');
const outputFile = path.join(outputDir, 'api-routes.puml');

function generate() {
  if (!fs.existsSync(routesDir)) throw new Error('Khong tim thay backend/src/routes');
  const rows = [];
  const files = fs.readdirSync(routesDir).filter((name) => name.endsWith('.ts')).sort();
  for (const file of files) {
    const source = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const regex = /router\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(\s*(['"`])([^'"`]+)\2/gi;
    for (const match of source.matchAll(regex)) rows.push({ method: match[1].toUpperCase(), route: match[3], file });
  }
  fs.mkdirSync(outputDir, { recursive: true });
  const lines = ['@startuml', 'title Express routes extracted from backend/src/routes', 'left to right direction', 'skinparam shadowing false', 'rectangle "Backend Express API" {'];
  rows.sort((a, b) => a.file.localeCompare(b.file) || a.route.localeCompare(b.route));
  rows.forEach((row, i) => {
    const label = (row.method + ' ' + row.route).replace(/"/g, '\\\"');
    lines.push('  usecase "' + label + '" as R' + (i + 1));
  });
  lines.push('}', 'note bottom', 'Generated route inventory; static router.method("/path") declarations only.', 'Detected routes: ' + rows.length, 'end note', '@enduml', '');
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf8');
  console.log('Generated docs/diagrams/source/api-routes.puml (' + rows.length + ' routes)');
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
    if (!dir.endsWith(path.sep + 'routes')) console.warn('Business logic changed: review sequence-*.puml manually.');
  });
} else throw new Error('Usage: node tools/diagram-generator/generate.mjs [generate|render|watch]');
