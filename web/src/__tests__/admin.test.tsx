import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Admin } from '../screens/Admin';
import { AdminShortcut } from '../components/AdminShortcut';
import { AuthContext, type AuthContextValue } from '../store/authContext';
import type { AdminSummary, AdminUserItem, AdminUserPage, UserProfile } from '../types';

vi.mock('../services/endpoints', () => ({
  getAdminSummary: vi.fn(),
  getAdminUsers: vi.fn(),
  setAdminUserDisabled: vi.fn(),
  adminResetPassword: vi.fn(),
  getAdminNotifications: vi.fn(),
  getAdminAuditLogs: vi.fn(),
}));

import {
  adminResetPassword,
  getAdminAuditLogs,
  getAdminNotifications,
  getAdminSummary,
  getAdminUsers,
  setAdminUserDisabled,
} from '../services/endpoints';

const summary: AdminSummary = {
  users: 12,
  disabledUsers: 1,
  activeMedications: 8,
  doses24h: 20,
  confirmed24h: 15,
  activeConnections: 4,
  activeDevices: 6,
  failedNotifications24h: 2,
};

const adminUser: AdminUserItem = {
  id: 'u1',
  displayName: 'Bà Lan',
  phone: '0912345678',
  email: 'lan@example.com',
  role: 'user',
  disabled: false,
  timezone: 'Asia/Ho_Chi_Minh',
  createdAt: '2026-10-20T03:00:00.000Z',
  medicationsActive: 2,
  doses7d: 14,
  confirmed7d: 12,
  devicesActive: 1,
};

function page(overrides: Partial<AdminUserPage> = {}): AdminUserPage {
  return { items: [adminUser], page: 1, pageSize: 10, total: 1, ...overrides };
}

function profile(role: 'user' | 'admin' = 'admin'): UserProfile {
  return {
    id: 'admin-1',
    phone: null,
    displayName: 'Quản trị',
    address: null,
    timezone: 'Asia/Ho_Chi_Minh',
    preferences: null,
    role,
  };
}

function authValue(role: 'user' | 'admin' = 'admin'): AuthContextValue {
  return {
    initializing: false,
    user: { uid: 'uid', email: 'admin@example.com' },
    profile: profile(role),
    timezone: 'Asia/Ho_Chi_Minh',
    phone: null,
    configured: true,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    refreshProfile: vi.fn(),
  };
}

function renderAdmin(auth: AuthContextValue = authValue()) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthContext.Provider value={auth}>
        <Admin />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function renderShortcut(role: 'user' | 'admin', path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={authValue(role)}>
        <AdminShortcut />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSummary).mockResolvedValue(summary);
  vi.mocked(getAdminUsers).mockResolvedValue(page());
  vi.mocked(getAdminNotifications).mockResolvedValue([]);
  vi.mocked(getAdminAuditLogs).mockResolvedValue([]);
  vi.mocked(setAdminUserDisabled).mockResolvedValue({ id: 'u1', disabled: true });
  vi.mocked(adminResetPassword).mockResolvedValue({ id: 'u1', reset: true });
});

describe('Khu vực quản trị (chỉ đọc + khóa/mật khẩu)', () => {
  it('người dùng thường không vào được và không gọi API quản trị', () => {
    renderAdmin(authValue('user'));

    expect(screen.getByRole('heading', { name: 'Quản trị hệ thống' })).toBeInTheDocument();
    expect(screen.getByText(/không có quyền truy cập/)).toBeInTheDocument();
    expect(getAdminSummary).not.toHaveBeenCalled();
    expect(getAdminUsers).not.toHaveBeenCalled();
  });

  it('admin thấy số liệu tổng quan và danh sách người dùng (không có nội dung y tế)', async () => {
    renderAdmin();

    expect(await screen.findByText('Bà Lan')).toBeInTheDocument();
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
    expect(screen.getByText('Tài khoản bị khóa')).toBeInTheDocument();
    expect(screen.getAllByText('Lỗi gửi thông báo').length).toBeGreaterThan(0);
    expect(screen.getByText(/0912345678 · lan@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Tạo ngày/)).toBeInTheDocument();
    expect(screen.getByText(/Múi giờ Việt Nam \(GMT\+7\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Thuốc test/)).not.toBeInTheDocument();
  });

  it('dịch mã lỗi gửi thông báo và nhãn nhật ký sang tiếng Việt', async () => {
    vi.mocked(getAdminNotifications).mockResolvedValue([
      {
        id: 'n1',
        kind: 'scheduled_reminder',
        channel: 'fcm',
        sentAt: '2026-10-20T03:00:00.000Z',
        error: 'no_active_device',
        doseId: 'd1',
      },
    ]);
    vi.mocked(getAdminAuditLogs).mockResolvedValue([
      {
        id: 'a1',
        action: 'accept_invite',
        entity: 'connection',
        entityId: 'c1',
        actorName: 'Bà Lan',
        actorPhone: null,
        createdAt: '2026-10-20T03:00:00.000Z',
        details: null,
      },
    ]);
    renderAdmin();
    await screen.findByText('Bà Lan');

    expect(await screen.findByText('Thiết bị hiện không hoạt động')).toBeInTheDocument();
    expect(screen.queryByText('no_active_device')).not.toBeInTheDocument();
    expect(await screen.findByText('Chấp nhận lời mời')).toBeInTheDocument();
    expect(screen.queryByText(/accept_invite/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bconnection\b/)).not.toBeInTheDocument();
  });

  it('tìm kiếm theo tên → gọi API với q và quay về trang 1', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Bà Lan');

    await user.type(screen.getByLabelText('Tìm người dùng'), 'Lan');
    await user.click(screen.getByRole('button', { name: 'Tìm' }));

    await waitFor(() =>
      expect(getAdminUsers).toHaveBeenLastCalledWith({ q: 'Lan', page: 1, pageSize: 10 }),
    );
  });

  it('phân trang: trang sau gọi API page=2', async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminUsers).mockImplementation(async ({ page: targetPage = 1 } = {}) =>
      page({ page: targetPage, total: 12 }),
    );
    renderAdmin();
    await screen.findByText('Bà Lan');

    expect(screen.getByText(/Trang 1\/2 · 12 người dùng/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Trang sau/ }));

    await waitFor(() => expect(getAdminUsers).toHaveBeenLastCalledWith({ q: undefined, page: 2, pageSize: 10 }));
  });

  it('nút Tải lại tải lại toàn bộ dữ liệu quản trị', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Bà Lan');
    vi.clearAllMocks();

    await user.click(screen.getByRole('button', { name: 'Tải lại' }));

    await waitFor(() => {
      expect(getAdminSummary).toHaveBeenCalled();
      expect(getAdminUsers).toHaveBeenCalled();
      expect(getAdminNotifications).toHaveBeenCalled();
      expect(getAdminAuditLogs).toHaveBeenCalled();
    });
  });

  it('khóa tài khoản: xác nhận trong hộp thoại → gọi API disabled=true', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Bà Lan');

    await user.click(screen.getByRole('button', { name: 'Khóa tài khoản Bà Lan' }));
    const dialog = screen.getByRole('dialog', { name: 'Khóa tài khoản?' });
    expect(within(dialog).getByText(/sẽ bị đăng xuất/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Khóa tài khoản' }));

    await waitFor(() => expect(setAdminUserDisabled).toHaveBeenCalledWith('u1', true));
    expect(await screen.findByText(/Đã khóa tài khoản Bà Lan/)).toBeInTheDocument();
  });

  it('mở khóa: tài khoản đang khóa hiện nút “Mở khóa” và gọi API disabled=false', async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminUsers).mockResolvedValue(page({ items: [{ ...adminUser, disabled: true }] }));
    vi.mocked(setAdminUserDisabled).mockResolvedValue({ id: 'u1', disabled: false });
    renderAdmin();
    await screen.findByText('Bà Lan');

    expect(screen.getByText('Đã khóa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mở khóa tài khoản Bà Lan' }));
    const dialog = screen.getByRole('dialog', { name: 'Mở khóa tài khoản?' });
    await user.click(within(dialog).getByRole('button', { name: 'Mở khóa' }));

    await waitFor(() => expect(setAdminUserDisabled).toHaveBeenCalledWith('u1', false));
    expect(await screen.findByText(/Đã mở khóa tài khoản Bà Lan/)).toBeInTheDocument();
  });

  it('đặt lại mật khẩu: chặn mật khẩu ngắn và hai lần nhập lệch', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Bà Lan');

    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu cho Bà Lan' }));
    const dialog = screen.getByRole('dialog', { name: 'Đặt lại mật khẩu' });

    await user.type(within(dialog).getByLabelText(/Mật khẩu mới/), '123');
    await user.type(within(dialog).getByLabelText(/Nhập lại mật khẩu mới/), '123');
    await user.click(within(dialog).getByRole('button', { name: 'Đặt lại mật khẩu' }));

    expect(await within(dialog).findByText('Mật khẩu mới phải có ít nhất 8 ký tự.')).toBeInTheDocument();
    expect(adminResetPassword).not.toHaveBeenCalled();

    await user.clear(within(dialog).getByLabelText(/Mật khẩu mới/));
    await user.type(within(dialog).getByLabelText(/Mật khẩu mới/), 'matkhaumoi123');
    await user.clear(within(dialog).getByLabelText(/Nhập lại mật khẩu mới/));
    await user.type(within(dialog).getByLabelText(/Nhập lại mật khẩu mới/), 'khacnhau123');
    await user.click(within(dialog).getByRole('button', { name: 'Đặt lại mật khẩu' }));

    expect(await within(dialog).findByText(/không khớp/)).toBeInTheDocument();
    expect(adminResetPassword).not.toHaveBeenCalled();
  });

  it('đặt lại mật khẩu thành công → gọi API, đóng hộp thoại và nhắc gửi qua kênh riêng', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByText('Bà Lan');

    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu cho Bà Lan' }));
    const dialog = screen.getByRole('dialog', { name: 'Đặt lại mật khẩu' });

    await user.type(within(dialog).getByLabelText(/Mật khẩu mới/), 'matkhaumoi123');
    await user.type(within(dialog).getByLabelText(/Nhập lại mật khẩu mới/), 'matkhaumoi123');
    await user.click(within(dialog).getByRole('button', { name: 'Đặt lại mật khẩu' }));

    await waitFor(() => expect(adminResetPassword).toHaveBeenCalledWith('u1', 'matkhaumoi123'));
    expect(await screen.findByText(/Đã đặt lại mật khẩu cho Bà Lan/)).toBeInTheDocument();
    expect(screen.getByText(/kênh riêng/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Lối tắt quản trị ngoài M08', () => {
  it('admin thấy nút “Quản trị hệ thống” trên màn hình ứng dụng', () => {
    renderShortcut('admin');

    const link = screen.getByRole('link', { name: 'Quản trị hệ thống' });
    expect(link).toHaveAttribute('href', '/admin');
  });

  it('người dùng thường không thấy lối tắt quản trị', () => {
    renderShortcut('user');

    expect(screen.queryByRole('link', { name: 'Quản trị hệ thống' })).not.toBeInTheDocument();
  });

  it('không lặp lối tắt khi đang ở chính trang /admin', () => {
    renderShortcut('admin', '/admin');

    expect(screen.queryByRole('link', { name: 'Quản trị hệ thống' })).not.toBeInTheDocument();
  });
});
