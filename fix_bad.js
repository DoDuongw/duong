const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/__tests__/login.test.tsx', 'utf8');
const bad = "    expect(screen.getByRole('heading', { name: //An tA�m h��n cho c��� hai th��� h���/\n    expect(screen.getByRole('heading', { name: //T���o tA�i kho���n mi��.n phA-/";
const good = "    expect(screen.getByRole('heading', { name: /An tâm hơn cho cả hai thế hệ/ })).toBeInTheDocument();\n    expect(screen.getByRole('heading', { name: /Tạo tài khoản miễn phí/ })).toBeInTheDocument();";
if (c.includes(bad)) {
  c = c.replace(bad, good);
  fs.writeFileSync('D:/duong/web/src/__tests__/login.test.tsx', c, 'utf8');
  console.log('ok');
} else {
  console.log('no');
}
