const fs = require('fs');
const c = fs.readFileSync('D:/duong/web/src/screens/Login.tsx','utf8');
const idx = c.indexOf('dateOfBirth');
if(idx >= 0) {
  let start = Math.max(0, idx - 400);
  console.log(c.slice(start, idx + 400));
}
