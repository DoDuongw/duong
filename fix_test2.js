const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/__tests__/login.test.tsx', 'utf8');
c = c.replace(/name: \\/An tâm hơn cho cả hai thế hệ\//g, 'name: /An tâm hơn cho cả hai thế hệ/');
c = c.replace(/name: \\/Tạo tài khoản miễn phí\//g, 'name: /Tạo tài khoản miễn phí/');
c = c.replace(/\/CA'ng d[^\/]+\//, '/Được thiết kế cho người cao tuổi/');
c = c.replace(/\/L[^\/]+i [^\/]+ch khi[^\/]+\//, '/An tâm hơn cho cả hai thế hệ/');
c = c.replace(/\/B[^\/]+t [^\/]+u trong 3[^\/]+\//, '/Tạo tài khoản miễn phí/');
fs.writeFileSync('D:/duong/web/src/__tests__/login.test.tsx', c, 'utf8');
console.log('ok');
