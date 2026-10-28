import { createContext, useContext } from 'react';
import type { UserProfile } from '../types';

export interface AuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

export interface AuthContextValue {
  initializing: boolean;
  user: AuthUser | null;
  /** Bản ghi user ở backend — null khi chưa tải được */
  profile: UserProfile | null;
  /** Múi giờ người dùng (users.timezone) — mặc định Asia/Ho_Chi_Minh khi chưa có profile */
  timezone: string;
  /** SĐT của tài khoản (users.phone) — null nếu chưa khai */
  phone: string | null;
  /** false = chưa điền cấu hình Firebase → hiện hướng dẫn thay vì ô đăng nhập */
  configured: boolean;
  error: string | null;
  /** `identifier` = email hoặc số điện thoại (SĐT đi qua email nội bộ — xem utils/phone.ts) */
  login: (identifier: string, password: string) => Promise<void>;
  /** `identifier` = email hoặc số điện thoại; SĐT/địa chỉ lưu vào hồ sơ backend */
  register: (
    identifier: string,
    password: string,
    profile?: { phone?: string; address?: string; displayName?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  /** Tải lại hồ sơ backend (sau khi PATCH /users/me ở M08) */
  refreshProfile: () => Promise<void>;
  /** Gửi lại email xác minh (chỉ áp dụng email thật) */
  resendVerification: () => Promise<void>;
  /** Làm mới trạng thái emailVerified từ Firebase */
  reloadUser: () => Promise<void>;
  /** Gửi email đặt lại mật khẩu */
  sendPasswordReset: (identifier: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong <AuthProvider>');
  return ctx;
}
