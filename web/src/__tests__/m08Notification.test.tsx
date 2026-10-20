import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/messaging', () => ({
  enableWebPush: vi.fn(),
  disableWebPush: vi.fn(),
  currentPushToken: vi.fn(() => null),
  isIosSafari: vi.fn(() => false),
  isStandalone: vi.fn(() => false),
  pushSupported: vi.fn(() => true),
  registerServiceWorker: vi.fn(),
  onForegroundPush: vi.fn(),
  closeAllNotifications: vi.fn(),
}));

vi.mock('../services/endpoints', () => ({
  listFamilyConnections: vi.fn(),
  updateFamilyPermissions: vi.fn(),
  updateProfile: vi.fn(),
  updateNotificationSettings: vi.fn(),
}));

import { enableWebPush } from '../services/messaging';
import { listFamilyConnections } from '../services/endpoints';
import { M08 } from '../screens/M08';
import { AuthContext, type AuthContextValue } from '../store/authContext';

const authValue: AuthContextValue = {
  initializing: false,
  user: { uid: 'u1', email: 'lan@example.com' },
  profile: {
    id: 'p1',
    phone: null,
    displayName: 'Bà Lan',
    timezone: 'Asia/Ho_Chi_Minh',
    preferences: null,
  },
  timezone: 'Asia/Ho_Chi_Minh',
  configured: true,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn(),
  refreshProfile: vi.fn(),
};

function renderM08() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <M08 />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function stubNotification(permission: NotificationPermission, granted: NotificationPermission) {
  const requestPermission = vi.fn().mockResolvedValue(granted);
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: { permission, requestPermission },
  });
  return requestPermission;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listFamilyConnections).mockResolvedValue([]);
});

describe('M08 — bật Web Push', () => {
  it('bật thành công → báo đã đăng ký thiết bị nhận thông báo', async () => {
    stubNotification('default', 'granted');
    vi.mocked(enableWebPush).mockResolvedValue({ status: 'registered', token: 'tok-1' });

    renderM08();
    await userEvent.click(screen.getByRole('button', { name: 'Bật thông báo nhắc uống thuốc' }));

    expect(await screen.findByText('Đã bật thông báo đẩy trên trình duyệt này.')).toBeInTheDocument();
    expect(screen.getByText(/Đã đăng ký thiết bị nhận thông báo/)).toBeInTheDocument();
  });

  it('chưa cấu hình Firebase/VAPID → hiển thị đúng lý do, không giả vờ thành công', async () => {
    stubNotification('default', 'granted');
    vi.mocked(enableWebPush).mockResolvedValue({
      status: 'unconfigured',
      reason: 'Chưa cấu hình Firebase (web/.env)',
    });

    renderM08();
    await userEvent.click(screen.getByRole('button', { name: 'Bật thông báo nhắc uống thuốc' }));

    expect(await screen.findByText('Chưa cấu hình Firebase (web/.env)')).toBeInTheDocument();
    expect(screen.queryByText('Đã bật thông báo đẩy trên trình duyệt này.')).not.toBeInTheDocument();
  });

  it('bị từ chối quyền → hướng dẫn cấp lại quyền', async () => {
    stubNotification('default', 'denied');
    vi.mocked(enableWebPush).mockResolvedValue({
      status: 'denied',
      reason: 'Bạn đã từ chối quyền thông báo',
    });

    renderM08();
    await userEvent.click(screen.getByRole('button', { name: 'Bật thông báo nhắc uống thuốc' }));

    expect(
      await screen.findByText('Bạn đã từ chối quyền thông báo — mở cài đặt trình duyệt để cấp lại quyền.'),
    ).toBeInTheDocument();
  });
});
