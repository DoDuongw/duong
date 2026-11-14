import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { ApiError } from "../services/api";
import { getProfile, syncProfile } from "../services/endpoints";
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
} from "../services/firebase";
import { disablePushNotifications, registerDevicePushToken } from "../services/notifications";
import { AuthContext, type AuthContextValue, type AuthUser } from "./authContext";
import { firebaseAuthMessage } from "../utils/firebaseErrors";
import type { UserProfile } from "../types";

const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<AuthUser>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inflight = useRef<Promise<void> | null>(null);

  const loadProfile = useCallback(async (seed?: { displayName?: string; phone?: string; address?: string; dateOfBirth?: string; timezone?: string }) => {
    if (inflight.current) return inflight.current;
    const run = (async () => {
      try {
        setProfile(await getProfile());
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
          try {
            setProfile(await syncProfile(seed as any));
          } catch {
            // ignore
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
      setUser(nextUser as AuthUser);
      if (!nextUser) {
        setProfile(null);
        setInitializing(false);
        void disablePushNotifications();
        return;
      }
      void loadProfile()
        .then(() => {
          void registerDevicePushToken();
        })
        .finally(() => setInitializing(false));
    });
    return unsubscribe;
  }, [loadProfile]);

  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void registerDevicePushToken();
    });
    return () => sub.remove();
  }, [user]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      setError(null);
      try {
        await firebaseSignIn(identifier, password);
        await loadProfile();
        void registerDevicePushToken();
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
      extra?: { phone?: string; address?: string; displayName?: string; dateOfBirth?: string },
    ) => {
      setError(null);
      try {
        const firebaseUser = await firebaseSignUp(identifier, password);
        try {
          await sendVerificationEmail(firebaseUser);
        } catch {
          // ignore
        }
        try {
          setProfile(await syncProfile(extra as any));
        } catch {
          await loadProfile(extra as any);
        }
        void registerDevicePushToken();
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
      // Hủy token Web Push trước khi mất phiên đăng nhập (cần auth để gọi backend).
      await disablePushNotifications();
    } catch {
      // best-effort
    }
    try {
      await firebaseSignOut();
    } catch {
      // clear local session even if remote sign-out fails
    } finally {
      setUser(null);
      setProfile(null);
    }
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
        // Always construct a new object so React re-renders verification-dependent UI
        setUser({
          uid: refreshed.uid,
          email: refreshed.email ?? "",
          emailVerified: !!refreshed.emailVerified,
        });
      }
    } catch (e) {
      setError(firebaseAuthMessage(e));
      throw e;
    }
  }, []);

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
