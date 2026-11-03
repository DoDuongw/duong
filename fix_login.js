const fs = require('fs');
const p = 'D:/duong/web/src/screens/Login.tsx';
let c = fs.readFileSync(p, 'utf8');
const old = `      await register(value, password, {
        phone: phone.trim() === '' ? undefined : phone.trim(),
        address: address.trim() === '' ? undefined : address.trim(),
      });`;
const neu = `      await register(value, password, {
        phone: phone.trim() === '' ? undefined : phone.trim(),
        address: address.trim() === '' ? undefined : address.trim(),
        dateOfBirth,
      });`;
if (c.includes(old)) {
  c = c.replace(old, neu);
  fs.writeFileSync(p, c, 'utf8');
  console.log('ok');
} else {
  console.log('no');
}
