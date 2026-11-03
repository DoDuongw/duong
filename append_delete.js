const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/services/endpoints.ts','utf8');
c += `
export function setAdminUserRole(id: string, role: UserRole): Promise<{ id: string; role: UserRole }> {
  return apiFetch(\`/admin/users/\${id}/role\`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  }).then((res) => parseJson<{ data: { id: string; role: UserRole } }>(res).then((json) => json.data));
}

export function deleteAdminUser(id: string): Promise<{ id: string; deleted: true }> {
  return apiFetch(\`/admin/users/\${id}\`, {
    method: 'DELETE',
  }).then((res) => parseJson<{ data: { id: string; deleted: true } }>(res).then((json) => json.data));
}
`;
fs.writeFileSync('D:/duong/web/src/services/endpoints.ts', c, 'utf8');
console.log('ok');
