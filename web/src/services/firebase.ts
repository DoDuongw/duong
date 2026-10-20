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

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(ensureAuth(), email, password);
}

export async function signUp(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(ensureAuth(), email, password);
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
