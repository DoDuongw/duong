import { render, screen, waitFor } from '@testing-library/react';
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

import { ApiError } from '../services/api';
import {
  listFamilyConnections,
  updateFamilyPermissions,
  updateNotificationSettings,
  updateProfile,
} from '../services/endpoints';
import { M08 } from '../screens/M08';
import { AuthContext, type AuthContextValue } from '../store/authContext';
import type { FamilyConnectionItem } from '../types';

function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    initializing: false,
    user: { uid: 'u1', email: 'lan@example.com' },
    profile: {
      id: 'p1',
      phone: null,
      displayName: 'Bà Lan',
      address: null,
      timezone: 'Asia/Ho_Chi_Minh',
      preferences: null,
    },
    timezone: 'Asia/Ho_Chi_Minh',
    phone: null,
    configured: true,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderM08(auth = makeAuth()) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <M08 />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

const ownerConn: FamilyConnectionItem = {
  id: 'c1',
  role: 'owner',
  user: { id: 'u2', displayName: 'Anh Nam', phone: '0900000002', timezone: 'Asia/Ho_Chi_Minh' },
  permissions: { view_schedule: true, manage_medication: false, relative_alerts: true },
  connectedAt: '2026-10-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(listFamilyConnections).mockResolvedValue([]);
});

describe('M08 — tài khoản', () => {
  it('lưu tên hiển thị + múi giờ → gọi PATCH /users/me rồi refreshProfile', async () => {
    const auth = makeAuth();
    vi.mocked(updateProfile).mockResolvedValue({
      id: 'p1',
      phone: null,
      displayName: 'Bà Lan mới',
      address: null,
      timezone: 'Asia/Tokyo',
      preferences: null,
    });

    renderM08(auth);

    const nameInput = screen.getByLabelText('Tên hiển thị');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Bà Lan mới');
    await userEvent.selectOptions(screen.getByLabelText('Múi giờ'), 'Asia/Tokyo');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        displayName: 'Bà Lan mới',
        phone: null,
        address: null,
        timezone: 'Asia/Tokyo',
      }),
    );
    expect(auth.refreshProfile).toHaveBeenCalled();
    expect(await screen.findByText('Đã lưu thông tin cá nhân.')).toBeInTheDocument();
  });

  it('tên rỗng → báo lỗi, không gọi API', async () => {
    renderM08();

    await userEvent.clear(screen.getByLabelText('Tên hiển thị'));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }));

    expect(await screen.findByText('Tên hiển thị không được để trống')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('API lỗi → hiện thông báo lỗi từ server', async () => {
    vi.mocked(updateProfile).mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ'));

    renderM08();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }));

    expect(await screen.findByText('Dữ liệu không hợp lệ')).toBeInTheDocument();
  });
});

describe('M08 — âm thanh', () => {
  it('tắt âm thanh → lưu vào localStorage', async () => {
    renderM08();
    const toggle = screen.getByRole('checkbox', { name: /Bật âm thanh/ });
    expect(toggle).toBeChecked();

    await userEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(localStorage.getItem('medreminder.soundEnabled')).toBe('false');
  });
});

describe('M08 — cài đặt nhắc lại', () => {
  it('lưu số phút và số lần nhắc lại', async () => {
    vi.mocked(updateNotificationSettings).mockResolvedValue({
      preferences: { snoozeMinutes: 15, snoozeMax: 2 },
    });

    renderM08();
    await userEvent.selectOptions(screen.getByLabelText('Nhắc lại sau (phút)'), '15');
    await userEvent.selectOptions(screen.getByLabelText('Số lần nhắc lại tối đa'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu cài đặt nhắc lại' }));

    await waitFor(() =>
      expect(updateNotificationSettings).toHaveBeenCalledWith({ snoozeMinutes: 15, snoozeMax: 2 }),
    );
    expect(await screen.findByText('Đã lưu cài đặt nhắc lại.')).toBeInTheDocument();
  });
});

describe('M08 — thông báo cho người thân', () => {
  it('hiện kết nối tôi là chủ hồ sơ và bật/tắt relative_alerts', async () => {
    vi.mocked(listFamilyConnections).mockResolvedValue([ownerConn]);
    vi.mocked(updateFamilyPermissions).mockResolvedValue({
      id: 'c1',
      permissions: { view_schedule: true, manage_medication: false, relative_alerts: false },
    });

    renderM08();

    const toggle = await screen.findByRole('checkbox', { name: /Cho Anh Nam nhận thông báo/ });
    expect(toggle).toBeChecked();

    await userEvent.click(toggle);

    await waitFor(() =>
      expect(updateFamilyPermissions).toHaveBeenCalledWith('c1', { relativeAlerts: false }),
    );
    expect(toggle).not.toBeChecked();
  });

  it('chưa có kết nối → hướng dẫn thêm người thân', async () => {
    renderM08();
    expect(await screen.findByText('Thêm người thân')).toBeInTheDocument();
  });
});
