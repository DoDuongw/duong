const fs = require('fs');
const c = fs.readFileSync('D:/duong/web/src/__tests__/screens.test.tsx', 'utf8');
const out = c.replace(/user: \{ uid: 'u1', email: '([^']+)' \}/g, "user: { uid: 'u1', email: '$1', emailVerified: true }");
fs.writeFileSync('D:/duong/web/src/__tests__/screens.test.tsx', out, 'utf8');
console.log('ok');
