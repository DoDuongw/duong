const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/services/endpoints.ts','utf8');
const s = "export function setAdminUserRole(id: string, role: UserRole): Promise<{ id: string; role: UserRole }> {\n  return apiFetch(`/admin/users/${id}/role`, {\n    method: 'PATCH',\n    body: JSON.stringify({ role }),\n  }).then((res) => parseJson<{ data: { id: string; role: UserRole } }>(res).then((json) => json.data));\n}";
const n = s + "\n\nexport function deleteAdminUser(id: string): Promise<{ id: string; deleted: true }> {\n  return apiFetch(`/admin/users/${id}`, {\n    method: 'DELETE',\n  }).then((res) => parseJson<{ data: { id: string; deleted: true } }>(res).then((json) => json.data));\n}";
if (c.includes(s)) {
  c = c.replace(s, n);
  fs.writeFileSync('D:/duong/web/src/services/endpoints.ts', c, 'utf8');
  console.log('ok');
} else {
  console.log('no');
}
