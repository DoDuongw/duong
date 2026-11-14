import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { env } from './env';
import { serviceUnavailable } from '../utils/errors';

let initialized = false;

interface ServiceAccountJson {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

/** Tìm file service account: ưu tiên đường dẫn tính từ thư mục đang chạy, rồi từ gốc backend/ */
function resolveServiceAccountPath(filePath: string): string {
  const fromCwd = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fromCwd)) return fromCwd;
  return path.resolve(__dirname, '../..', filePath);
}

/**
 * Cách 2: nạp nguyên file JSON tải từ Firebase Console
 * (Project settings → Service accounts → Generate new private key).
 */
function initFromServiceAccountFile(filePath: string): boolean {
  try {
    const full = resolveServiceAccountPath(filePath);
    const raw = JSON.parse(fs.readFileSync(full, 'utf8')) as ServiceAccountJson;
    if (!raw.project_id || !raw.client_email || !raw.private_key) {
      console.error(`[firebase] File ${full} thiếu project_id / client_email / private_key`);
      return false;
    }
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: raw.project_id,
        clientEmail: raw.client_email,
        privateKey: raw.private_key,
      }),
    });
    console.log(`[firebase] Đã nạp service account từ ${full}`);
    return true;
  } catch (e) {
    console.error(`[firebase] Không đọc được "${filePath}": ${(e as Error).message}`);
    return false;
  }
}

function initFirebase(): void {
  if (initialized) return;

  // Cách 2 (tiện hơn): FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    initialized = initFromServiceAccountFile(env.FIREBASE_SERVICE_ACCOUNT_PATH);
    return;
  }

  // Cách 1: điền 3 biến rời trong .env
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    initialized = true;
  }
}

/**
 * Trả về Firebase Cloud Messaging nếu Admin đã cấu hình, ngược lại `null`.
 * Tầng gọi (notificationService) tự xử lý khi chưa cấu hình thay vì ném lỗi.
 */
export function getMessagingOrNull(): admin.messaging.Messaging | null {
  initFirebase();
  if (!initialized) return null;
  return admin.messaging();
}

export async function verifyIdToken(token: string): Promise<{ uid: string; emailVerified?: boolean }> {
  initFirebase();
  if (!initialized) {
    const err = new Error('Firebase Admin chưa được cấu hình');
    (err as Error & { code?: string }).code = 'FIREBASE_NOT_CONFIGURED';
    throw err;
  }
  const decoded = await admin.auth().verifyIdToken(token);
  return { uid: decoded.uid, emailVerified: !!(decoded as any).email_verified };
}

/** Firebase Admin đã sẵn sàng chưa (đã nạp credentials) */
export function isFirebaseReady(): boolean {
  initFirebase();
  return initialized;
}

function requireAuth(): admin.auth.Auth {
  initFirebase();
  if (!initialized) {
    const err = new Error('Firebase Admin chưa được cấu hình');
    (err as Error & { code?: string }).code = 'FIREBASE_NOT_CONFIGURED';
    throw err;
  }
  return admin.auth();
}

/** Khóa/mở tài khoản phía Firebase — chặn cả việc đăng nhập lại */
export async function setFirebaseUserDisabled(uid: string, disabled: boolean): Promise<void> {
  await requireAuth().updateUser(uid, { disabled });
}

/** Thu hồi refresh token — phiên cũ hết hiệu lực (ID token tối đa 1 giờ) */
export async function revokeFirebaseRefreshTokens(uid: string): Promise<void> {
  await requireAuth().revokeRefreshTokens(uid);
}

/** Tìm uid theo email Firebase (dùng cho script cấp quyền admin đầu tiên) */
export async function getFirebaseUserByEmail(email: string): Promise<{ uid: string } | null> {
  try {
    const user = await requireAuth().getUserByEmail(email);
    return { uid: user.uid };
  } catch (err) {
    if ((err as { code?: string }).code === 'auth/user-not-found') return null;
    throw err;
  }
}

export interface FirebaseUserDetail {
  email: string | null;
  emailVerified: boolean;
}

export async function getFirebaseUserDetails(uids: string[]): Promise<Record<string, FirebaseUserDetail>> {
  const result: Record<string, FirebaseUserDetail> = {};
  if (uids.length === 0) return result;
  const auth = requireAuth();
  const batch = uids.slice(0, 100);
  for (const uid of batch) result[uid] = { email: null, emailVerified: false };
  try {
    const identifiers = batch.map((uid) => ({ uid }));
    const found = await auth.getUsers(identifiers as any);
    for (const user of found.users) {
      result[user.uid] = { email: user.email ?? null, emailVerified: !!user.emailVerified };
    }
    for (const notFound of (found as any).notFound ?? []) {
      if (notFound?.uid) {
        result[notFound.uid] = { email: null, emailVerified: false };
      }
    }
  } catch {
    // fallback
  }
  return result;
}

export async function deleteFirebaseUser(uid: string): Promise<void> {
  const auth = requireAuth();
  try {
    await auth.deleteUser(uid);
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      return;
    }
    throw serviceUnavailable('Không thể xóa tài khoản xác thực Firebase');
  }
}
