const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/__tests__/m08Settings.test.tsx','utf8');
// replace auth value objects
c = c.replace(/resendVerification:\s*undefined,/g, "resendVerification: vi.fn(),");
c = c.replace(/reloadUser:\s*undefined,/g, "reloadUser: vi.fn(),");
c = c.replace(/sendPasswordReset:\s*undefined,/g, "sendPasswordReset: vi.fn(),");
fs.writeFileSync('D:/duong/web/src/__tests__/m08Settings.test.tsx',c,'utf8');
console.log('ok');
