const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/__tests__/admin.test.tsx','utf8');
c = c.replace(/refreshProfile: vi\.fn\(\),/g, "refreshProfile: vi.fn(),\n        resendVerification: vi.fn(),\n        reloadUser: vi.fn(),\n        sendPasswordReset: vi.fn(),");
fs.writeFileSync('D:/duong/web/src/__tests__/admin.test.tsx',c,'utf8');
console.log('ok');
