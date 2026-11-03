const fs = require('fs');
const p = 'web/src/services/firebase.ts';
let c = fs.readFileSync(p, 'utf8');
c = c.replace("  return onAuthStateChanged(authInstance, (user) => {", "  return onAuthStateChanged(authInstance!, (user) => {");
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
