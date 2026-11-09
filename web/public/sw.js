/*
 * Service Worker — Web Push (FCM for Web) — Giai đoạn 5.
 * Server (node-cron) gửi push khi tới giờ uống / mốc snooze / quá giờ.
 * Worker nhận push, hiển thị notification có actions, bấm → mở M02 đúng lần uống.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Đọc payload push. Hỗ trợ cả hai dạng:
 * - FCM data message: `{ data: { ... }, from, messageId }`
 * - Web Push thường: `{ title, body, ... }`
 */
function readPayload(event) {
  if (!event.data) return {};
  let raw;
  try {
    raw = event.data.json();
  } catch {
    return { body: event.data.text() };
  }
  if (raw && typeof raw.data === 'object' && raw.data !== null) {
    return Object.assign({}, raw, raw.data);
  }
  return raw || {};
}

const ACTIONS = [
  { action: 'confirm', title: 'Đã uống' },
  { action: 'snooze', title: 'Nhắc lại sau' },
  { action: 'cannot', title: 'Không thể uống' },
];

self.addEventListener('push', (event) => {
  const data = readPayload(event);
  const title = data.title || 'Nhắc uống thuốc';
  const url = data.url || (data.doseId ? `/dose/${data.doseId}` : '/');
  // Chỉ hiện actions cho thông báo gắn với một lần uống cụ thể
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag, // gộp notification cùng tag, tránh chồng chéo
    renotify: Boolean(data.tag),
    data: { url, doseId: data.doseId || null, type: data.type || null },
  };
  if (data.doseId && ['dose_reminder', 'dose_snooze', 'dose_overdue'].includes(data.type)) {
    options.actions = ACTIONS;
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Mở (hoặc focus) trang đích; action trên notification mở M02 với hành động tương ứng.
 * Nếu không điều khiển được cửa sổ sẵn có (navigate lỗi/không hỗ trợ) → mở cửa sổ mới,
 * để hành động không bị mất.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  let url = info.url || '/';
  if (event.action && info.doseId) {
    url = `/dose/${info.doseId}?action=${encodeURIComponent(event.action)}`;
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
      for (const client of list) {
        if (!('focus' in client)) continue;
        if ('navigate' in client) {
          try {
            const navigated = await client.navigate(url);
            if (navigated) return navigated.focus();
          } catch {
            // Không điều khiển được cửa sổ này → thử cửa sổ khác / mở cửa sổ mới
          }
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

/** Cho phép trang yêu cầu đóng các thông báo đang hiển thị (ví dụ khi đăng xuất). */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'close-notifications') {
    event.waitUntil(
      self.registration.getNotifications().then((list) => {
        for (const n of list) n.close();
      }),
    );
  }
});
