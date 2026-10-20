import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
  type Unsubscribe,
} from 'firebase/messaging';
import { getFirebaseApp } from './firebase';
import { isFirebaseConfigured, vapidKey } from '../config';
import { registerDevice, unregisterDevice } from './endpoints';

/**
 * Web Push (FCM for Web) — Giai đoạn 5.
 * Server (node-cron) là bên gửi push; ở đây chỉ xin quyền, lấy token FCM,
 * đăng ký token với backend và nghe thông báo khi trang đang mở.
 */

export type PushSetupResult =
  | { status: 'registered'; token: string }
  | { status: 'unsupported'; reason: string }
  | { status: 'denied'; reason: string }
  | { status: 'unconfigured'; reason: string }
  | { status: 'error'; reason: string };

const TOKEN_KEY = 'medreminder.fcmToken';
const SW_PATH = '/sw.js';

/** Trình duyệt có đủ API cần cho Web Push? */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** iOS/iPadOS Safari — bắt buộc “Thêm vào màn hình chính” mới nhận push (NOTIFICATION_PLAN §6). */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
  return isIos && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

/** Đã cài như PWA (chạy standalone)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH);
  } catch (e) {
    console.warn('Không đăng ký được Service Worker:', e);
    return null;
  }
}

function messagingInstance(): Messaging | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getMessaging(app);
  } catch {
    return null;
  }
}

export function currentPushToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Bật Web Push: xin quyền → đăng ký SW → lấy token FCM (VAPID) → gửi token lên backend.
 * Trả về trạng thái cụ thể để giao diện hiển thị hướng dẫn phù hợp (N6, N7).
 */
export async function enableWebPush(): Promise<PushSetupResult> {
  if (!isFirebaseConfigured) {
    return { status: 'unconfigured', reason: 'Chưa cấu hình Firebase (web/.env)' };
  }
  if (!vapidKey) {
    return { status: 'unconfigured', reason: 'Chưa có VAPID key trong web/.env (VITE_FIREBASE_VAPID_KEY)' };
  }
  if (!pushSupported()) {
    return { status: 'unsupported', reason: 'Trình duyệt không hỗ trợ thông báo đẩy' };
  }
  if (!(await isSupported().catch(() => false))) {
    return { status: 'unsupported', reason: 'Trình duyệt không hỗ trợ Web Push' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { status: 'denied', reason: 'Bạn đã từ chối quyền thông báo' };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { status: 'error', reason: 'Không đăng ký được Service Worker' };
  }

  const messaging = messagingInstance();
  if (!messaging) return { status: 'unconfigured', reason: 'Chưa khởi tạo được Firebase Messaging' };

  try {
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return { status: 'error', reason: 'Không lấy được token Web Push' };
    await registerDevice({ fcmToken: token, platform: 'web', userAgent: navigator.userAgent.slice(0, 255) });
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Không lưu được token — vẫn dùng được phiên này
    }
    return { status: 'registered', token };
  } catch (e) {
    return { status: 'error', reason: (e as Error).message || 'Lỗi lấy token Web Push' };
  }
}

/** Yêu cầu Service Worker đóng các notification đang hiển thị (dùng khi đăng xuất). */
export async function closeAllNotifications(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
    reg?.active?.postMessage({ type: 'close-notifications' });
  } catch {
    // Bỏ qua
  }
}

/** Tắt Web Push (dùng khi đăng xuất): hủy token ở backend + FCM, xóa token đã lưu. */
export async function disableWebPush(): Promise<void> {
  await closeAllNotifications();
  const token = currentPushToken();
  if (token) {
    try {
      await unregisterDevice(token);
    } catch {
      // Backend có thể đã mất token — bỏ qua
    }
  }
  const messaging = messagingInstance();
  if (messaging) {
    try {
      await deleteToken(messaging);
    } catch {
      // Bỏ qua
    }
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Bỏ qua
  }
}

/** Nghe thông báo khi trang đang mở (hiển thị trong trang). Trả về hàm hủy đăng ký. */
export function onForegroundPush(handler: (payload: MessagePayload) => void): Unsubscribe {
  const messaging = messagingInstance();
  if (!messaging) return () => undefined;
  try {
    return onMessage(messaging, handler);
  } catch {
    return () => undefined;
  }
}
