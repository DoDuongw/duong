import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/firebase', () => ({
  isFirebaseConfigured: true,
  onAuthChange: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('../services/endpoints', () => ({
  getProfile: vi.fn(),
  syncProfile: vi.fn(),
}));

vi.mock('../services/messaging', () => ({
  disableWebPush: vi.fn(),
}));

import { ApiError } from '../services/api';
import { getProfile, syncProfile } from '../services/endpoints';
import { onAuthChange } from '../services/firebase';
import { AuthProvider } from '../store/auth';
import { useAuth } from '../store/authContext';
import type { UserProfile } from '../types';

const PROFILE: UserProfile = {
  id: 'p1',
  phone: null,
  displayName: 'Bà Lan',
  address: null,
  timezone: 'Asia/Tokyo',
  preferences: null,
};

function Probe() {
  const { initializing, profile, timezone } = useAuth();
  return (
    <div>
      <span data-testid="init">{initializing ? 'yes' : 'no'}</span>
      <span data-testid="name">{profile?.displayName ?? '—'}</span>
      <span data-testid="tz">{timezone}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(onAuthChange).mockImplementation((cb) => {
    cb({ uid: 'u1', email: 'lan@example.com' });
    return () => {};
  });
});

describe('AuthProvider — nạp hồ sơ khi đăng nhập', () => {
  it('lần đầu đăng nhập: GET /users/me trả 401 → tự tạo bản ghi bằng POST /users/me/sync', async () => {
    vi.mocked(getProfile).mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Chưa xác thực'));
    vi.mocked(syncProfile).mockResolvedValue(PROFILE);

    renderProvider();

    await waitFor(() => expect(syncProfile).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Bà Lan'));
  });

  it('GET /users/me trả 404 → cũng thử tạo bản ghi bằng sync', async () => {
    vi.mocked(getProfile).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Không tìm thấy'));
    vi.mocked(syncProfile).mockResolvedValue(PROFILE);

    renderProvider();

    await waitFor(() => expect(syncProfile).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Bà Lan'));
  });

  it('đã có hồ sơ → không gọi sync', async () => {
    vi.mocked(getProfile).mockResolvedValue(PROFILE);

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Bà Lan'));
    expect(syncProfile).not.toHaveBeenCalled();
  });

  it('lỗi khác (500) → không gọi sync, vẫn dùng múi giờ mặc định', async () => {
    vi.mocked(getProfile).mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Lỗi máy chủ'));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('init')).toHaveTextContent('no'));
    expect(syncProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId('tz')).toHaveTextContent('Asia/Ho_Chi_Minh');
  });
});
