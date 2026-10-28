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
  reloadCurrentUser,
  resendVerificationEmail,
  sendPasswordReset as firebaseSendPasswordReset,
  sendVerificationEmail,
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

  const inflight = useRef<Promise<void> | null>(null);

  const loadProfile = useCallback(async (seed?: { displayName?: string; phone?: string; address?: string }) => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      try {
        setProfile(await getProfile());
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
          try {
            setProfile(await syncProfile(seed));
          } catch {
            // Không tạo được → màn hình dạng mới giữ mặc định
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
    async (identifier: string, password: string) => {
      setError(null);
      try {
        await firebaseSignIn(identifier, password);
        await loadProfile();
      } catch (e) {
        setError(firebaseAuthMessage(e));
        throw e;
      }
    },
    [loadProfile],
  );

  const register = useCallback(
    async (
      identifier: string,
      password: string,
      extra?: { phone?: string; address?: string; displayName?: string },
    ) => {
      setError(null);
      try {
        const firebaseUser = await firebaseSignUp(identifier, password);
        try {
          await sendVerificationEmail(firebaseUser);
        } catch {
          // Không chặn đăng ký nếu không gửi được email xác minh
        }
        await loadProfile(extra);
      } catch (e) {
        setError(firebaseAuthMessage(e));
        throw e;
      }
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    setError(null);
    try {
      await disableWebPush();
    } catch {
      // Không chặn đăng xuất nếu Web Push lỗi
    }
    await firebaseSignOut();
    setUser(null);
    setProfile(null);
  }, []);

  const resendVerification = useCallback(async () => {
    setError(null);
    try {
      await resendVerificationEmail();
    } catch (e) {
      setError(firebaseAuthMessage(e));
      throw e;
    }
  }, []);

  const reloadUser = useCallback(async () => {
    setError(null);
    try {
      const refreshed = await reloadCurrentUser();
      if (refreshed) {
        setUser({
          uid: refreshed.uid,
          email: refreshed.email ?? user?.email ?? '',
          emailVerified: refreshed.emailVerified,
        });
      }
    } catch (e) {
      setError(firebaseAuthMessage(e));
      throw e;
    }
  }, [user?.email]);

  const sendPasswordReset = useCallback(async (identifier: string) => {
    setError(null);
    try {
      await firebaseSendPasswordReset(identifier);
    } catch (e) {
      setError(firebaseAuthMessage(e));
      throw e;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      user,
      profile,
      timezone: profile?.timezone ?? DEFAULT_TIMEZONE,
      phone: profile?.phone ?? null,
      configured: isFirebaseConfigured,
      error,
      login,
      register,
      logout,
      refreshProfile: loadProfile,
      clearError: () => setError(null),
      resendVerification,
      reloadUser,
      sendPasswordReset,
    }),
    [initializing, user, profile, error, login, register, logout, loadProfile, resendVerification, reloadUser, sendPasswordReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
