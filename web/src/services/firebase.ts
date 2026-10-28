import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigured } from '../config';
import { normalizePhone, phoneToInternalEmail } from '../utils/phone';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export { isFirebaseConfigured };

/** Trả về FirebaseApp đã khởi tạo (null nếu chưa cấu hình) */
export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

function ensureAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase chưa được cấu hình — điền VITE_FIREBASE_* vào web/.env (xem README)');
  }
  return auth;
}

function toFirebaseEmail(identifier: string): string {
  const trimmed = identifier.trim();
  const asPhone = normalizePhone(trimmed);
  return asPhone ? phoneToInternalEmail(asPhone) : trimmed;
}

export function isInternalMedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@med.local');
}

export async function signIn(identifier: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(ensureAuth(), toFirebaseEmail(identifier), password);
}

export async function signUp(identifier: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(ensureAuth(), toFirebaseEmail(identifier), password);
  return cred.user;
}

export async function signOut(): Promise<void> {
  if (auth) await firebaseSignOut(auth);
}

export async function sendVerificationEmail(user?: User | null): Promise<void> {
  const current = user ?? auth?.currentUser;
  if (!current) throw new Error('Không có người dùng đang đăng nhập');
  if (isInternalMedEmail(current.email)) return;
  await sendEmailVerification(current);
}

export async function resendVerificationEmail(): Promise<void> {
  await sendVerificationEmail(auth?.currentUser);
}

export async function sendPasswordReset(identifier: string): Promise<void> {
  const email = toFirebaseEmail(identifier);
  if (isInternalMedEmail(email)) {
    const err = new Error('Tài khoản đăng ký bằng số điện thoại không thể tự khôi phục qua email. Vui lòng liên hệ quản trị viên để được hỗ trợ đặt lại mật khẩu.');
    (err as Error & { code?: string }).code = 'auth/phone-account-reset-not-allowed';
    throw err;
  }
  await sendPasswordResetEmail(ensureAuth(), email);
}

export async function reloadCurrentUser(): Promise<User | null> {
  const current = auth?.currentUser;
  if (!current) return null;
  await current.reload();
  return auth.currentUser;
}

export async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}

export function onAuthChange(
  callback: (user: { uid: string; email: string; emailVerified: boolean } | null) => void,
): Unsubscribe {
  const authInstance = auth;
  if (authInstance === null) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(authInstance!, (user) => {
    callback(user ? { uid: user.uid, email: user.email ?? '', emailVerified: user.emailVerified } : null);
  });
}
