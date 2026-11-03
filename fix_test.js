const fs = require('fs');
const p = 'web/src/__tests__/login.test.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/CA[^\s]+ng d[^\s]+ng[^\n]+/i, '/Được thiết kế cho người cao tuổi/');
c = c.replace(/L[^\s]+i [^\s]+ch khi[^\n]+/i, '/An tâm hơn cho cả hai thế hệ/');
c = c.replace(/B[^\s]+t [^\s]+u trong 3[^\n]+/i, '/Tạo tài khoản miễn phí/');
fs.writeFileSync(p, c, 'utf8');
console.log('ok');
