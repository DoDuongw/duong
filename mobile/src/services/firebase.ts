import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  type Auth,
  type Unsubscribe,
  type User,
} from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig, isFirebaseConfigured } from "../config";
import { normalizePhone, phoneToInternalEmail } from "../utils/phone";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  try {
    storage = getStorage(app);
  } catch {
    storage = null;
  }
}

export { isFirebaseConfigured };

export function getFirebaseApp(): FirebaseApp | null {
  return app;
}

function ensureAuth(): Auth {
  if (!auth) {
    throw new Error("Firebase chưa được cấu hình");
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
  return email.toLowerCase().endsWith("@med.local");
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
  if (!current) throw new Error("Không có người dùng đang đăng nhập");
  if (isInternalMedEmail(current.email)) return;
  await sendEmailVerification(current);
}

export async function resendVerificationEmail(): Promise<void> {
  await sendVerificationEmail(auth?.currentUser);
}

export async function sendPasswordReset(identifier: string): Promise<void> {
  const email = toFirebaseEmail(identifier);
  if (isInternalMedEmail(email)) {
    const err = new Error("Tài khoản đăng ký bằng số điện thoại không thể tự khôi phục qua email.");
    (err as any).code = "auth/phone-account-reset-not-allowed";
    throw err;
  }
  await sendPasswordResetEmail(ensureAuth(), email);
}

export async function reloadCurrentUser(): Promise<User | null> {
  const current = auth?.currentUser;
  if (!current) return null;
  await current.reload();
  try {
    await current.getIdToken(true);
  } catch {
    // ignore token refresh errors; reload still updates profile fields
  }
  return auth?.currentUser ?? current;
}

/**
 * Đổi mật khẩu của chính tài khoản đang đăng nhập.
 * Bắt buộc xác nhận bằng mật khẩu hiện tại (reauthenticate) trước khi đặt mật khẩu mới.
 */
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const current = ensureAuth().currentUser;
  if (!current) throw new Error("Không có người dùng đang đăng nhập");
  const email = current.email;
  if (!email) throw new Error("Tài khoản không có email xác thực. Vui lòng đăng nhập lại.");
  const cred = EmailAuthProvider.credential(email, currentPassword);
  try {
    await reauthenticateWithCredential(current, cred);
  } catch (e: any) {
    const code = e?.code || "";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
      throw new Error("Mật khẩu hiện tại không đúng.");
    }
    if (code === "auth/too-many-requests") {
      throw new Error("Thử sai quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.");
    }
    throw new Error(e?.message || "Không xác nhận được mật khẩu hiện tại.");
  }
  try {
    await updatePassword(current, newPassword);
  } catch (e: any) {
    const code = e?.code || "";
    if (code === "auth/weak-password") {
      throw new Error("Mật khẩu mới quá yếu. Vui lòng dùng ít nhất 8 ký tự.");
    }
    if (code === "auth/requires-recent-login") {
      throw new Error("Phiên đăng nhập quá cũ. Vui lòng đăng xuất, đăng nhập lại rồi đổi mật khẩu.");
    }
    throw new Error(e?.message || "Không thể đổi mật khẩu.");
  }
}

export async function getIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}

export function getFirebaseStorage(): FirebaseStorage | null {
  return storage;
}

/**
 * Upload ảnh lên Firebase Storage và trả về download URL.
 * Hỗ trợ URI file/content (native) và blob: (web). Yêu cầu Firebase đã cấu hình và Storage khả dụng.
 */
export async function uploadImageToStorage(localUri: string, objectPath: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage chưa sẵn sàng. Vui lòng kiểm tra cấu hình.');
  const response = await fetch(localUri);
  if (!response.ok) throw new Error('Không đọc được file ảnh để tải lên.');
  const blob = await response.blob();
  const storageRef = ref(storage, objectPath);
  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

export function onAuthChange(
  callback: (user: { uid: string; email: string; emailVerified: boolean } | null) => void,
): Unsubscribe {
  const authInstance = auth;
  if (authInstance === null) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(authInstance, (user) => {
    callback(user ? { uid: user.uid, email: user.email ?? "", emailVerified: user.emailVerified } : null);
  });
}
