import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from '../screens/Login';
import { AuthContext, type AuthContextValue } from '../store/authContext';

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    initializing: false,
    user: null,
    profile: null,
    timezone: 'Asia/Ho_Chi_Minh',
    phone: null,
    configured: true,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    refreshProfile: vi.fn(),
    resendVerification: vi.fn(),
    reloadUser: vi.fn(),
    sendPasswordReset: vi.fn(),
    ...overrides,
  };
}

function renderLogin(auth: AuthContextValue = authValue()) {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthContext.Provider value={auth}>
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Trang giới thiệu + đăng nhập (R4)', () => {
  it('hiện phần giới thiệu: công dụng, tiện ích và lợi ích', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /Nhắc lịch uống thuốc/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Công dụng và tiện ích/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: //An tâm hơn cho cả hai thế hệ/
    expect(screen.getByRole('heading', { name: //Tạo tài khoản miễn phí/
    expect(screen.getByText(/Người thân cùng theo dõi/)).toBeInTheDocument();
  });

  it('mặc định chưa mở form đăng nhập — form chỉ hiện khi bấm nút', () => {
    renderLogin();

    expect(screen.queryByLabelText(/Email/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở đăng nhập' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mở đăng ký' })).toBeInTheDocument();
  });

  it('bấm “Đăng nhập” → mở hộp thoại đăng nhập ở giữa màn hình', async () => {
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Email hoặc số điện thoại/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Mật khẩu/)).toBeInTheDocument();
  });

  it('nút “Bắt đầu — tạo tài khoản” mở hộp thoại ở chế độ đăng ký', async () => {
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu — tạo tài khoản/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Tạo tài khoản' })).toBeInTheDocument();
  });

  it('đóng hộp thoại → form ẩn trở lại', async () => {
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Đóng' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Email hoặc số điện thoại/)).not.toBeInTheDocument();
  });

  it('email không hợp lệ → báo lỗi ngay dưới trường, không gọi login', async () => {
    const auth = authValue();
    renderLogin(auth);

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));

    await userEvent.type(screen.getByLabelText(/Email hoặc số điện thoại/), 'khong-phai-email');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('mật khẩu ngắn → báo lỗi, không gọi login', async () => {
    const auth = authValue();
    renderLogin(auth);

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));

    await userEvent.type(screen.getByLabelText(/Email hoặc số điện thoại/), 'lan@example.com');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Mật khẩu phải có ít nhất 6 ký tự')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('hợp lệ → gọi login với email đã cắt khoảng trắng', async () => {
    const auth = authValue({ login: vi.fn().mockResolvedValue(undefined) });
    renderLogin(auth);

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));

    await userEvent.type(screen.getByLabelText(/Email hoặc số điện thoại/), ' lan@example.com ');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(auth.login).toHaveBeenCalledWith('lan@example.com', 'matkhau123');
  });

  it('chế độ đăng ký → gọi register (không kèm SĐT/địa chỉ khi để trống)', async () => {
    const auth = authValue({ register: vi.fn().mockResolvedValue(undefined) });
    renderLogin(auth);

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng ký' }));
    await userEvent.type(screen.getByLabelText(/Email hoặc số điện thoại/), 'moi@example.com');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(auth.register).toHaveBeenCalledWith('moi@example.com', 'matkhau123', {
      phone: undefined,
      address: undefined,
    });
  });

  it('đăng ký kèm SĐT + địa chỉ → chuyển tiếp cho register', async () => {
    const auth = authValue({ register: vi.fn().mockResolvedValue(undefined) });
    renderLogin(auth);

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng ký' }));
    await userEvent.type(screen.getByLabelText(/Email hoặc số điện thoại/), '0912345678');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/), '0987654321');
    await userEvent.type(screen.getByLabelText(/Địa chỉ/), '12 Lê Lợi, Q.1');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(auth.register).toHaveBeenCalledWith('0912345678', 'matkhau123', {
      phone: '0987654321',
      address: '12 Lê Lợi, Q.1',
    });
  });

  it('SĐT không hợp lệ ở ô đăng nhập → báo lỗi, không gọi login', async () => {
    const auth = authValue();
    renderLogin(auth);

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));
    await userEvent.type(screen.getByLabelText(/Email hoặc số điện thoại/), '0123456789');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText(/Số điện thoại không hợp lệ/)).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('SĐT hợp lệ → gọi login với nguyên SĐT (đổi sang email nội bộ ở lớp firebase)', async () => {
    const auth = authValue({ login: vi.fn().mockResolvedValue(undefined) });
    renderLogin(auth);

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));
    await userEvent.type(screen.getByLabelText(/Email hoặc số điện thoại/), '091 234 5678');
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), 'matkhau123');
    await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(auth.login).toHaveBeenCalledWith('091 234 5678', 'matkhau123');
  });

  it('chưa cấu hình Firebase → hiện hướng dẫn cấu hình thay cho form', async () => {
    renderLogin(authValue({ configured: false }));

    await userEvent.click(screen.getByRole('button', { name: 'Mở đăng nhập' }));

    expect(screen.getByText(/Chưa cấu hình Firebase/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Email hoặc số điện thoại/)).not.toBeInTheDocument();
  });
});
