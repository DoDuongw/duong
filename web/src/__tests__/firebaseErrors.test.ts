import { describe, expect, it } from 'vitest';
import { firebaseAuthMessage } from '../utils/firebaseErrors';

describe('firebaseAuthMessage', () => {
  it('dịch các mã lỗi thường gặp sang tiếng Việt', () => {
    expect(firebaseAuthMessage({ code: 'auth/invalid-credential' })).toBe('Email hoặc mật khẩu không đúng');
    expect(firebaseAuthMessage({ code: 'auth/wrong-password' })).toBe('Email hoặc mật khẩu không đúng');
    expect(firebaseAuthMessage({ code: 'auth/email-already-in-use' })).toContain('đã được đăng ký');
    expect(firebaseAuthMessage({ code: 'auth/weak-password' })).toContain('6 ký tự');
  });

  it('báo rõ khi Firebase chưa bật Email/Password', () => {
    expect(firebaseAuthMessage({ code: 'auth/configuration-not-found' })).toContain('Sign-in method');
    expect(firebaseAuthMessage({ code: 'auth/operation-not-allowed' })).toContain('Firebase Console');
  });

  it('mã lạ → vẫn có tiền tố tiếng Việt kèm mã gốc', () => {
    expect(firebaseAuthMessage({ code: 'auth/some-new-error' })).toBe('Đăng nhập thất bại (auth/some-new-error)');
  });

  it('lỗi thường (không có code) → giữ nguyên message', () => {
    expect(firebaseAuthMessage(new Error('Mất mạng'))).toBe('Mất mạng');
    expect(firebaseAuthMessage(null)).toBe('Đăng nhập thất bại');
  });
});
