import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/endpoints', () => ({
  registerDevice: vi.fn(),
  unregisterDevice: vi.fn(),
}));

// Không nạp SDK messaging thật trong jsdom (SDK tự kiểm tra môi trường và ném unhandled rejection)
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: vi.fn(),
  deleteToken: vi.fn(),
  isSupported: vi.fn(async () => false),
  onMessage: vi.fn(),
}));

import { unregisterDevice } from '../services/endpoints';
import {
  currentPushToken,
  disableWebPush,
  isIosSafari,
  isStandalone,
  pushSupported,
} from '../services/messaging';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('messaging — phát hiện khả năng hỗ trợ', () => {
  it('môi trường không có Service Worker (jsdom) → pushSupported() = false', () => {
    expect(pushSupported()).toBe(false);
  });

  it('không chạy ở chế độ PWA standalone', () => {
    expect(isStandalone()).toBe(false);
  });

  it('không phải iOS Safari trong môi trường test', () => {
    expect(isIosSafari()).toBe(false);
  });
});

describe('messaging — token Web Push đã lưu', () => {
  it('currentPushToken đọc/ghi localStorage', () => {
    expect(currentPushToken()).toBeNull();
    localStorage.setItem('medreminder.fcmToken', 'tok-1');
    expect(currentPushToken()).toBe('tok-1');
  });

  it('disableWebPush hủy token ở backend rồi xóa khỏi localStorage', async () => {
    localStorage.setItem('medreminder.fcmToken', 'tok-1');

    await disableWebPush();

    expect(vi.mocked(unregisterDevice)).toHaveBeenCalledWith('tok-1');
    expect(currentPushToken()).toBeNull();
  });

  it('disableWebPush không gọi API khi chưa có token', async () => {
    await disableWebPush();
    expect(vi.mocked(unregisterDevice)).not.toHaveBeenCalled();
  });
});
