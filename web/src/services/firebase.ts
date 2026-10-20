import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type Unsubscribe,
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

/** Trả về FirebaseApp đã khởi tạo (null nếu chưa cấu hình) — dùng cho Messaging (Web Push). */
export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

function ensureAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase chưa được cấu hình — điền VITE_FIREBASE_* vào web/.env (xem README)');
  }
  return auth;
}

/**
 * Người dùng gõ email hay số điện thoại?
 *
 * Firebase Spark plan không hỗ trợ Phone Auth (OTP SMS), nên SĐT được đăng nhập
 * qua **email nội bộ** `<sđt>@med.local` — với người dùng thì vẫn là "đăng nhập bằng SĐT".
 * Hàm này chuẩn hoá SĐT trước khi dựng email nên `091 234 5678` và `+84912345678`
 * cùng vào một tài khoản.
 */
function toFirebaseEmail(identifier: string): string {
  const trimmed = identifier.trim();
  const asPhone = normalizePhone(trimmed);
  return asPhone ? phoneToInternalEmail(asPhone) : trimmed;
}

export async function signIn(identifier: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(ensureAuth(), toFirebaseEmail(identifier), password);
}

export async function signUp(identifier: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(ensureAuth(), toFirebaseEmail(identifier), password);
}

export async function signOut(): Promise<void> {
  if (auth) await firebaseSignOut(auth);
}

/** Lấy Firebase ID token để gắn vào Authorization header (null nếu chưa cấu hình/đăng nhập) */
export async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}

export function onAuthChange(
  callback: (user: { uid: string; email: string } | null) => void,
): Unsubscribe {
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user ? { uid: user.uid, email: user.email ?? '' } : null);
  });
}
