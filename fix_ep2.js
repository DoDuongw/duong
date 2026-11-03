const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/services/endpoints.ts', 'utf8');
const bad = `export function > {
  return apiFetch(\`/admin/users/\${id}/role\`, { method: 'PATCH', body: { role } });
}
`;
if (c.includes(bad)) {
  c = c.replace(bad, '');
  fs.writeFileSync('D:/duong/web/src/services/endpoints.ts', c, 'utf8');
  console.log('ok');
} else {
  console.log('no');
}
