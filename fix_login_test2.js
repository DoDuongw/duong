const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/__tests__/login.test.tsx', 'utf8');

// Fix intro test
c = c.replace(
  /it\('hi[\s\S]*?giới thiệu[\s\S]*?\{[\s\S]*?expect\(screen\.getByText\(\/Người thân cùng theo dõi\/\)\)\.toBeInTheDocument\(\);\s*\}\);/s,
  `it('hiển thị phần giới thiệu: công dụng, tiện ích và lợi ích', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /Nhắc lịch uống thuốc/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Được thiết kế cho người cao tuổi/ })).toBeInTheDocument();
    expect(screen.getByText(/Người thân cùng theo dõi/)).toBeInTheDocument();
  });`
);

fs.writeFileSync('D:/duong/web/src/__tests__/login.test.tsx', c, 'utf8');
console.log('done');
