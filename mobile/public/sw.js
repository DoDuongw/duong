/*
 * Service Worker — Web Push (FCM for Web) cho bản Expo web của mobile/.
 * Backend gửi push khi tới giờ uống / mốc snooze / quá giờ / người thân bỏ lỡ.
 * Worker nhận push, hiển thị notification và bấm → mở đúng màn hình.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Đọc payload push. Hỗ trợ cả hai dạng:
 * - FCM: `{ data: { ... }, notification: { ... }, from, messageId }`
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

// Nút chọn nhanh tình trạng sức khỏe ngay trên banner push.
const WELLNESS_ACTIONS = [
  { action: 'wellness_good', title: 'Bình thường' },
  { action: 'wellness_tired', title: 'Hơi mệt' },
  { action: 'wellness_unwell', title: 'Khó chịu' },
];
const WELLNESS_ANSWER_BY_ACTION = {
  wellness_good: 'good',
  wellness_tired: 'tired',
  wellness_unwell: 'unwell',
};

self.addEventListener('push', (event) => {
  const data = readPayload(event);
  const title = data.title || data.notification?.title || 'Nhắc uống thuốc';
  const body = data.body || data.notification?.body || '';
  const isWellness = data.type === 'wellness_check';
  const healthLogId = data.healthLogId || data.health_log_id || null;
  const url = isWellness
    ? `/health-journal${healthLogId ? `?logId=${encodeURIComponent(healthLogId)}` : ''}`
    : data.url || (data.doseId ? `/dose/${data.doseId}` : '/');
  // Chỉ hiện actions cho thông báo gắn với một lần uống cụ thể của bệnh nhân.
  const options = {
    body,
    icon: '/notification-icon.png',
    badge: '/notification-icon.png',
    tag: data.tag, // gộp notification cùng tag, tránh chồng chéo
    renotify: Boolean(data.tag),
    data: { url, doseId: data.doseId || null, healthLogId, type: data.type || null },
  };
  if (isWellness) {
    options.actions = WELLNESS_ACTIONS;
  } else if (data.doseId && ['dose_reminder', 'dose_snooze', 'dose_overdue'].includes(data.type)) {
    options.actions = ACTIONS;
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Mở (hoặc focus) trang đích; action trên notification mở màn hình lần uống
 * với hành động tương ứng. Nếu không điều khiển được cửa sổ sẵn có thì mở
 * cửa sổ mới để hành động không bị mất.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  let url = info.url || '/';
  if (event.action && info.type === 'wellness_check') {
    const answer = WELLNESS_ANSWER_BY_ACTION[event.action];
    if (answer) {
      const params = new URLSearchParams();
      if (info.healthLogId) params.set('logId', info.healthLogId);
      params.set('answer', answer);
      url = `/health-journal?${params.toString()}`;
    }
  } else if (event.action && info.doseId) {
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
            // Không điều khiển được cửa sổ này → thử cửa sổ khác / mở cửa sổ mới.
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
