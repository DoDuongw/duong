const fs = require('fs');
const p = 'web/src/utils/firebaseErrors.ts';
let c = fs.readFileSync(p, 'utf8');
if (!c.includes('phone-account-reset-not-allowed')) {
  c = c.replace("  'auth/missing-password': 'Vui l\\u00f2ng nh\\u1eadp m\\u1eadt kh\\u1ea9u',",
    "  'auth/missing-password': 'Vui l\\u00f2ng nh\\u1eadp m\\u1eadt kh\\u1ea9u',\n  'auth/phone-account-reset-not-allowed': 'T\\u00e0i kho\\u1ea3n \\u0111\\u0103ng k\\u00fd b\\u1eb1ng s\\u1ed1 \\u0111i\\u1ec7n tho\\u1ea1i kh\\u00f4ng th\\u1ec3 t\\u1ef1 kh\\u00f4i ph\\u1ee5c qua email. Vui l\\u00f2ng li\\u00ean h\\u1ec7 qu\\u1ea3n tr\\u1ecb vi\\u00ean \\u0111\\u1ec3 \\u0111\\u01b0\\u1ee3c h\\u1ed7 tr\\u1ee3 \\u0111\\u1eb7t l\\u1ea1i m\\u1eadt kh\\u1ea9u.',");
}
fs.writeFileSync(p, c, 'utf8');
console.log('done');
