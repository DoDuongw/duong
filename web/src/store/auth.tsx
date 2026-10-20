import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from '../services/api';
import { getProfile, syncProfile } from '../services/endpoints';
import {
  isFirebaseConfigured,
  onAuthChange,
  signIn as firebaseSignIn,
  signOut as firebaseSignOut,
  signUp as firebaseSignUp,
} from '../services/firebase';
import { AuthContext, type AuthContextValue, type AuthUser } from './authContext';
import { firebaseAuthMessage } from '../utils/firebaseErrors';
import { disableWebPush } from '../services/messaging';
import type { UserProfile } from '../types';

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Tải hồ sơ backend; lần đăng nhập đầu chưa có bản ghi → tạo bằng POST /users/me/sync.
   *
   * Lưu ý: backend trả **401** (`requireAuthMiddleware` — token hợp lệ nhưng chưa có
   * bản ghi user), không phải 404, nên phải xử lý cả 401 lẫn 404.
   * `loadProfile` có thể bị gọi đồng thời (listener `onAuthChange` + `login/register`)
   * → giữ một promise đang chạy để tránh tạo bản ghi trùng.
   */
  const inflight = useRef<Promise<void> | null>(null);

  const loadProfile = useCallback(async () => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      try {
        setProfile(await getProfile());
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
          try {
            setProfile(await syncProfile());
          } catch {
            // Không tạo được — màn hình dùng múi giờ mặc định
          }
        }
      }
    })();
    inflight.current = run;
    try {
      await run;
    } finally {
      inflight.current = null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange((nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setInitializing(false);
        return;
      }
      void loadProfile().finally(() => setInitializing(false));
    });
    return unsubscribe;
  }, [loadProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        await firebaseSignIn(email, password);
        // Lần đăng nhập đầu: tạo bản ghi user (POST /users/me/sync) trước khi vào M01
        await loadProfile();
      } catch (e) {
        setError(firebaseAuthMessage(e));
        throw e;
      }
    },
    [loadProfile],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        await firebaseSignUp(email, password);
        await loadProfile();
      } catch (e) {
        setError(firebaseAuthMessage(e));
        throw e;
      }
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    setError(null);
    // Hủy token Web Push + đóng notification đang hiển thị trước khi đăng xuất
    try {
      await disableWebPush();
    } catch {
      // Không chặn đăng xuất nếu Web Push lỗi
    }
    await firebaseSignOut();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      user,
      profile,
      timezone: profile?.timezone ?? DEFAULT_TIMEZONE,
      configured: isFirebaseConfigured,
      error,
      login,
      register,
      logout,
      refreshProfile: loadProfile,
      clearError: () => setError(null),
    }),
    [initializing, user, profile, error, login, register, logout, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
