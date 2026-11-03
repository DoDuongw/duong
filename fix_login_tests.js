const fs = require('fs');
let c = fs.readFileSync('D:/duong/web/src/__tests__/login.test.tsx', 'utf8');

// Update intro test
c = c.replace(
  `    expect(screen.getByRole('heading', { name: /Nhắc lịch uống thuốc/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Công dụng và tiện ích/ })).toBeInTheDocument();
    expect(screen.getByText(/Người thân cùng theo dõi/)).toBeInTheDocument();`,
  `    expect(screen.getByRole('heading', { name: /Nhắc lịch uống thuốc/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Được thiết kế cho người cao tuổi/ })).toBeInTheDocument();
    expect(screen.getByText(/Người thân cùng theo dõi/)).toBeInTheDocument();`
);

// Update first register test
c = c.replace(
  `    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.type(screen.getByLabelText(/Nhập lại mật khẩu/), 'matkhau123');

    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(auth.register).toHaveBeenCalledWith('moi@example.com', 'matkhau123', {
      phone: undefined,
      address: undefined,
    });`,
  `    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.type(screen.getByLabelText(/Nhập lại mật khẩu/), 'matkhau123');
    await userEvent.type(screen.getByLabelText(/Ngày sinh/), '1990-01-01');

    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(auth.register).toHaveBeenCalledWith('moi@example.com', 'matkhau123', {
      phone: undefined,
      address: undefined,
      dateOfBirth: '1990-01-01',
    });`
);

// Update second register test
c = c.replace(
  `    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.type(screen.getByLabelText(/Nhập lại mật khẩu/), 'matkhau123');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/), '0987654321');
    await userEvent.type(screen.getByLabelText(/Địa chỉ/), '12 Lê Lợi, Q.1');

    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(auth.register).toHaveBeenCalledWith('0912345678', 'matkhau123', {
      phone: '0987654321',
      address: '12 Lê Lợi, Q.1',
    });`,
  `    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.type(screen.getByLabelText(/Nhập lại mật khẩu/), 'matkhau123');
    await userEvent.type(screen.getByLabelText(/Ngày sinh/), '1990-01-01');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/), '0987654321');
    await userEvent.type(screen.getByLabelText(/Địa chỉ/), '12 Lê Lợi, Q.1');

    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(auth.register).toHaveBeenCalledWith('0912345678', 'matkhau123', {
      phone: '0987654321',
      address: '12 Lê Lợi, Q.1',
      dateOfBirth: '1990-01-01',
    });`
);

fs.writeFileSync('D:/duong/web/src/__tests__/login.test.tsx', c, 'utf8');
console.log('done');
