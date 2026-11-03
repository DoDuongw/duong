const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/services/endpoints.ts','utf8');
c = c.replace("export function > {\n  return apiFetch(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } });\n}\n", '');
fs.writeFileSync('D:/duong/web/src/services/endpoints.ts', c, 'utf8');
console.log('ok');
