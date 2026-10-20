import { createContext, useContext } from 'react';
import type { UserProfile } from '../types';

export interface AuthUser {
  uid: string;
  email: string;
}

export interface AuthContextValue {
  initializing: boolean;
  user: AuthUser | null;
  /** Bản ghi user ở backend — null khi chưa tải được */
  profile: UserProfile | null;
  /** Múi giờ người dùng (users.timezone) — mặc định Asia/Ho_Chi_Minh khi chưa có profile */
  timezone: string;
  /** false = chưa điền cấu hình Firebase → hiện hướng dẫn thay vì ô đăng nhập */
  configured: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  /** Tải lại hồ sơ backend (sau khi PATCH /users/me ở M08) */
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong <AuthProvider>');
  return ctx;
}
