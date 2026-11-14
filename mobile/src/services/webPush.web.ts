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
import type { WebPushOptions, WebPushRegistrationResult } from './webPush.types';
import { WELLNESS_QUICK_ANSWERS } from '../utils/wellness';

/**
 * Web Push (FCM for Web) cho bản Expo web của mobile/.
 *
 * `expo-notifications` không hỗ trợ web, nên trên web ta dùng Firebase JS SDK:
 * xin quyền → đăng ký service worker → lấy FCM token bằng VAPID → gửi token
 * lên backend. Backend vẫn gửi push qua Firebase Admin như các token FCM khác.
 */

const TOKEN_KEY = 'medreminder.webPushToken';
const SW_PATH = '/sw.js';
const ICON_PATH = '/notification-icon.png';
const WELLNESS_ACTIONS = WELLNESS_QUICK_ANSWERS.map(({ action, title }) => ({ action, title }));

let messaging: Messaging | null = null;
let foregroundUnsubscribe: Unsubscribe | null = null;

function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function getMessagingInstance(): Messaging | null {
  if (messaging) return messaging;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

export function getCurrentWebPushToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register(SW_PATH);
    // Chờ worker active (có timeout để không treo UI nếu trình duyệt chậm).
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<void>((resolve) => setTimeout(resolve, 3000)),
    ]);
    return registration;
  } catch (e) {
    console.warn('Không đăng ký được Service Worker:', e);
    return null;
  }
}

async function showForegroundNotification(payload: MessagePayload): Promise<void> {
  const data = { ...(payload.data ?? {}) } as Record<string, string>;
  const title = data.title || payload.notification?.title || 'Nhắc uống thuốc';
  const body = data.body || payload.notification?.body || '';
  const isWellness = data.type === 'wellness_check';
  const healthLogId = data.healthLogId || data.health_log_id || null;
  const url = isWellness
    ? `/health-journal${healthLogId ? `?logId=${encodeURIComponent(healthLogId)}` : ''}`
    : data.url || (data.doseId ? `/dose/${data.doseId}` : '/');
  const options: any = {
    body,
    icon: ICON_PATH,
    badge: ICON_PATH,
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { url, doseId: data.doseId || null, healthLogId, type: data.type || null },
  };
  if (isWellness) options.actions = WELLNESS_ACTIONS;

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
      if (registration) {
        await registration.showNotification(title, options);
        return;
      }
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  } catch {
    // Không hiển thị được notification — vẫn có thể xem trong mục Thông báo.
  }
}

function setupForegroundNotifications(instance: Messaging): void {
  if (foregroundUnsubscribe) return;
  try {
    foregroundUnsubscribe = onMessage(instance, (payload) => {
      void showForegroundNotification(payload);
    });
  } catch {
    foregroundUnsubscribe = null;
  }
}

/**
 * Bật Web Push. Trả về `token` nếu thành công; nếu chưa thành công thì trả về
 * `message` để giao diện hướng dẫn người dùng (quyền bị chặn, thiếu VAPID...).
 */
export async function registerWebPush(
  options: WebPushOptions = {},
): Promise<WebPushRegistrationResult> {
  if (typeof window === 'undefined') {
    return { token: null, platform: 'web', message: 'Web Push chỉ chạy trong trình duyệt.' };
  }
  if (!isFirebaseConfigured) {
    return {
      token: null,
      platform: 'web',
      message: 'Chưa cấu hình Firebase cho ứng dụng web.',
    };
  }
  if (!vapidKey) {
    return {
      token: null,
      platform: 'web',
      message:
        'Chưa có VAPID key. Vào Firebase Console → Project settings → Cloud Messaging → Web Push certificates, rồi điền FIREBASE_VAPID_KEY trong mobile/app.json.',
    };
  }
  if (!pushSupported()) {
    return {
      token: null,
      platform: 'web',
      message: 'Trình duyệt này không hỗ trợ Web Push (cần Chrome/Edge/Firefox hoặc Safari 16.4+).',
    };
  }
  if (!window.isSecureContext) {
    return {
      token: null,
      platform: 'web',
      message: 'Web Push chỉ hoạt động trên localhost hoặc HTTPS. Hãy mở app qua http://localhost:8081.',
    };
  }
  if (!(await isSupported().catch(() => false))) {
    return {
      token: null,
      platform: 'web',
      message: 'Trình duyệt này không hỗ trợ Firebase Messaging.',
    };
  }

  let permission = Notification.permission;
  if (permission === 'default' && options.requestPermission !== false) {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return {
      token: null,
      platform: 'web',
      message:
        permission === 'denied'
          ? 'Trình duyệt đang chặn thông báo. Bấm biểu tượng ổ khóa cạnh địa chỉ → Notifications → Allow, rồi thử lại.'
          : 'Bạn cần bấm nút này và chọn “Cho phép” khi trình duyệt hỏi quyền thông báo.',
    };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return {
      token: null,
      platform: 'web',
      message: 'Không đăng ký được Service Worker. Hãy tải lại trang và thử lại.',
    };
  }

  const instance = getMessagingInstance();
  if (!instance) {
    return {
      token: null,
      platform: 'web',
      message: 'Chưa khởi tạo được dịch vụ thông báo Firebase.',
    };
  }

  try {
    const token = await getToken(instance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) {
      return {
        token: null,
        platform: 'web',
        message: 'Không lấy được mã nhận thông báo từ Firebase.',
      };
    }
    await registerDevice({
      fcmToken: token,
      platform: 'web',
      userAgent: navigator.userAgent.slice(0, 255),
    });
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Không lưu được token — vẫn dùng được trong phiên này.
    }
    setupForegroundNotifications(instance);
    return { token, platform: 'web' };
  } catch (e: any) {
    console.warn('Không lấy được token Web Push:', e);
    const code = String(e?.code || '');
    let message = 'Không lấy được mã nhận thông báo Web Push. Kiểm tra kết nối mạng và thử lại.';
    if (code.includes('permission')) {
      message = 'Trình duyệt đang chặn quyền thông báo. Hãy mở quyền cho trang này rồi thử lại.';
    } else if (code.includes('vapid')) {
      message = 'VAPID key không hợp lệ hoặc đã bị tạo lại. Kiểm tra FIREBASE_VAPID_KEY trong mobile/app.json.';
    } else if (code.includes('token-subscribe')) {
      message = 'Không đăng ký được với Firebase Cloud Messaging. Kiểm tra VAPID key và kết nối mạng.';
    }
    return { token: null, platform: 'web', message };
  }
}

/** Tắt Web Push khi đăng xuất: hủy token ở backend + FCM, đóng notification. */
export async function disableWebPush(): Promise<void> {
  if (typeof window === 'undefined') return;

  foregroundUnsubscribe?.();
  foregroundUnsubscribe = null;

  const token = getCurrentWebPushToken();
  if (token) {
    try {
      await unregisterDevice(token);
    } catch {
      // Backend có thể đã mất token — bỏ qua.
    }
  }

  const instance = getMessagingInstance();
  if (instance) {
    try {
      await deleteToken(instance);
    } catch {
      // Bỏ qua.
    }
  }

  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Bỏ qua.
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
      registration?.active?.postMessage({ type: 'close-notifications' });
    } catch {
      // Bỏ qua.
    }
  }
}
