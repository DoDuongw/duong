import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Đăng nhập bằng SĐT đi qua email nội bộ `<sđt>@med.local` (Firebase Spark plan
 * không có Phone Auth OTP SMS). Test này chốt lại đúng đầu vào gửi cho Firebase:
 * gõ SĐT dạng nào (`0912345678`, `+84912345678`, có khoảng trắng) cũng phải
 * thành **một** email nội bộ duy nhất, còn email thật thì giữ nguyên.
 */
const signInWithEmailAndPassword = vi.fn().mockResolvedValue(undefined);
const createUserWithEmailAndPassword = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  signInWithEmailAndPassword: (...args: unknown[]) => signInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => createUserWithEmailAndPassword(...args),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
}));

import { signIn, signUp } from '../services/firebase';

beforeEach(() => {
  signInWithEmailAndPassword.mockClear();
  createUserWithEmailAndPassword.mockClear();
});

describe('services/firebase — đăng nhập bằng email hoặc SĐT', () => {
  it('email thật được giữ nguyên', async () => {
    await signIn('lan@example.com', 'matkhau123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'lan@example.com', 'matkhau123');
  });

  it('SĐT dạng 0xxxx → email nội bộ', async () => {
    await signIn('0912345678', 'matkhau123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), '0912345678@med.local', 'matkhau123');
  });

  it('SĐT dạng +84 → cùng một email nội bộ', async () => {
    await signIn('+84912345678', 'matkhau123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), '0912345678@med.local', 'matkhau123');
  });

  it('SĐT có khoảng trắng/gạch → cùng một email nội bộ', async () => {
    await signIn('091 234-56.78', 'matkhau123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), '0912345678@med.local', 'matkhau123');
  });

  it('email/ô nhập có khoảng trắng thừa → cắt trước khi dùng', async () => {
    await signIn('  lan@example.com  ', 'matkhau123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'lan@example.com', 'matkhau123');
  });

  it('đăng ký cũng áp dụng cùng quy tắc SĐT', async () => {
    await signUp('0987654321', 'matkhau123');
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      '0987654321@med.local',
      'matkhau123',
    );
  });

  it('chuỗi giống SĐT nhưng không hợp lệ → giữ nguyên (để Firebase báo lỗi email sai)', async () => {
    await signIn('0123456789', 'matkhau123');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), '0123456789', 'matkhau123');
  });
});
