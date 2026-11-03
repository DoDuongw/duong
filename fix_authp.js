const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/__tests__/authProvider.test.tsx','utf8');
c = c.replace(/email: '([^']+)' \}/g, "email: '$1', emailVerified: true }");
c = c.replace(/email: "([^"]+)" \}/g, 'email: "$1", emailVerified: true }');
fs.writeFileSync('D:/duong/web/src/__tests__/authProvider.test.tsx',c,'utf8');
console.log('ok');
