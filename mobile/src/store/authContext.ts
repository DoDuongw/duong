import { createContext, useContext } from "react";
import type { UserProfile } from "../types";

export type AuthUser = { uid: string; email: string; emailVerified: boolean } | null;

export type AuthContextValue = {
  initializing: boolean;
  user: AuthUser;
  profile: UserProfile | null;
  timezone: string;
  phone: string | null;
  configured: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    identifier: string,
    password: string,
    extra?: { phone?: string; address?: string; displayName?: string; dateOfBirth?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (seed?: { displayName?: string; phone?: string; address?: string; dateOfBirth?: string; timezone?: string }) => Promise<void>;
  clearError: () => void;
  resendVerification: () => Promise<void>;
  reloadUser: () => Promise<void>;
  sendPasswordReset: (identifier: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
