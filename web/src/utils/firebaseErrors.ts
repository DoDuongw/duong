/** Dịch mã lỗi Firebase Auth sang thông báo tiếng Việt dễ hiểu (người cao tuổi / người thân) */

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email hoặc mật khẩu không đúng',
  'auth/wrong-password': 'Email hoặc mật khẩu không đúng',
  'auth/user-not-found': 'Email hoặc mật khẩu không đúng',
  'auth/invalid-email': 'Email không hợp lệ',
  'auth/email-already-in-use': 'Email này đã được đăng ký — hãy đăng nhập',
  'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự)',
  'auth/too-many-requests': 'Thử quá nhiều lần — vui lòng đợi vài phút rồi thử lại',
  'auth/network-request-failed': 'Không kết nối được tới Firebase — kiểm tra mạng',
  'auth/operation-not-allowed': 'Chưa bật đăng nhập Email/Mật khẩu trong Firebase Console',
  'auth/configuration-not-found': 'Firebase chưa bật đăng nhập Email/Mật khẩu (Authentication → Sign-in method)',
  'auth/user-disabled': 'Tài khoản này đã bị khóa',
  'auth/missing-password': 'Vui lòng nhập mật khẩu',
};

export function firebaseAuthMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string') {
    const known = MESSAGES[code];
    if (known) return known;
    return `Đăng nhập thất bại (${code})`;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Đăng nhập thất bại';
}
