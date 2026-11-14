import type { WebPushOptions, WebPushRegistrationResult } from './webPush.types';

/**
 * Bản native: Web Push không khả dụng. Metro sẽ tự chọn `webPush.web.ts`
 * khi build cho web; file này giữ cho bundle Android/iOS không kéo
 * `firebase/messaging` (API chỉ có trên trình duyệt).
 */
export async function registerWebPush(_options: WebPushOptions = {}): Promise<WebPushRegistrationResult> {
  return {
    token: null,
    platform: 'web',
    message: 'Web Push chỉ khả dụng khi chạy ứng dụng trên trình duyệt.',
  };
}

export async function disableWebPush(): Promise<void> {
  // Không có gì cần làm trên native.
}

export function getCurrentWebPushToken(): string | null {
  return null;
}
