const fs = require('fs');
const p = 'web/src/__tests__/firebaseAuth.test.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace("mockResolvedValue({} as never)", "mockResolvedValue({ user: { uid: 'u1', email: '0912345678@med.local', emailVerified: false } } as never)");
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
