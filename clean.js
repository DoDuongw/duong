const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/__tests__/login.test.tsx', 'utf8');
c = c.split(/\r?\n/).filter(l => {
  if (l.includes('//An t')) return false;
  if (l.includes('//Tạo')) return false;
  if (l.includes('//T')) return false;
  return true;
}).join('\n');
fs.writeFileSync('D:/duong/web/src/__tests__/login.test.tsx', c, 'utf8');
console.log('ok');
