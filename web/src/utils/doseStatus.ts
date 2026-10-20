import type { DoseStatus, HistoryItem } from '../types';

/** Nhãn trạng thái lần uống — luôn kèm icon để không chỉ dùng màu (INTERFACE_SPEC) */
export const DOSE_STATUS_LABEL: Record<DoseStatus, string> = {
  pending: 'Đang chờ',
  snoozed: 'Nhắc lại sau',
  confirmed: 'Đã xác nhận',
  cannot_take: 'Không thể uống',
  overdue: 'Quá giờ',
  missed: 'Đã bỏ lỡ',
};

export const DOSE_STATUS_ICON: Record<DoseStatus, string> = {
  pending: '⏳',
  snoozed: '🔁',
  confirmed: '✅',
  cannot_take: '⛔',
  overdue: '⚠️',
  missed: '❌',
};

export const DOSE_STATUS_COLOR: Record<DoseStatus, string> = {
  pending: 'var(--c-primary)',
  snoozed: 'var(--c-warning)',
  confirmed: 'var(--c-success)',
  cannot_take: 'var(--c-muted)',
  overdue: 'var(--c-danger)',
  missed: 'var(--c-danger)',
};

/** Trạng thái còn cho phép xác nhận / nhắc lại / không thể uống */
export const ACTIONABLE_STATUSES: DoseStatus[] = ['pending', 'snoozed', 'overdue'];

/** Trạng thái đã kết thúc, không sửa được (BUSINESS_RULES mục 1) */
export const FINAL_STATUSES: DoseStatus[] = ['confirmed', 'cannot_take', 'missed'];

export function isActionable(status: DoseStatus): boolean {
  return ACTIONABLE_STATUSES.includes(status);
}

/** Lý do phổ biến cho “Không thể uống” (INTERFACE_SPEC điểm 3) */
export const COMMON_CANNOT_TAKE_REASONS = [
  'Quên mang thuốc',
  'Đang bận, chưa uống được',
  'Cảm thấy không khỏe',
  'Bác sĩ yêu cầu tạm ngưng',
];

export function isFinal(status: DoseStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

/**
 * Lần uống **chưa được chủ hồ sơ xác nhận** — dùng cho người thân (M07).
 *
 * Khác với `isActionable` (dùng cho chủ hồ sơ bấm nút), hàm này trả lời câu hỏi
 * “chủ hồ sơ đã xử lý lần uống này chưa?”:
 * - `pending`/`snoozed`/`overdue` → chưa xác nhận (còn phải theo dõi)
 * - `missed` → đã bỏ lỡ hẳn (vẫn tính là chưa uống)
 * - `confirmed`/`cannot_take` → đã có hành động → **không** cảnh báo
 *
 * Khớp `UNCONFIRMED_STATUSES` ở backend (`notificationService.ts`) — cùng ngưỡng
 * `RELATIVE_ALERT_AFTER_MINUTES` thì backend gửi push và giao diện hiện cảnh báo.
 */
export const UNCONFIRMED_BY_OWNER_STATUSES: DoseStatus[] = ['pending', 'snoozed', 'overdue', 'missed'];

export function isUnconfirmedByOwner(status: DoseStatus): boolean {
  return UNCONFIRMED_BY_OWNER_STATUSES.includes(status);
}

/** Ngưỡng (phút) backend dùng để báo người thân — phải khớp `RELATIVE_ALERT_AFTER_MINUTES` trong `backend/.env`. */
export const RELATIVE_ALERT_AFTER_MINUTES = 15;

interface UnconfirmedFields {
  status: DoseStatus;
  scheduledAt: string;
  snoozedUntil?: string | null;
}

/**
 * Các lần uống mà **chủ hồ sơ chưa xác nhận** và đã quá ngưỡng cảnh báo
 * `RELATIVE_ALERT_AFTER_MINUTES` — người thân cần thấy cảnh báo rõ thay vì
 * chỉ thấy nhãn “Đang chờ” (trông y hệt “chưa tới giờ”).
 *
 * Mốc tính giờ giống backend `processDueNotifications`: lấy giờ nhắc lại cuối
 * (`snoozedUntil`) nếu đã nhắc lại, nếu không lấy `scheduledAt`.
 * Sắp xếp cũ nhất trước (lâu chưa uống nhất lên đầu).
 */
export function unconfirmedAlerts<T extends UnconfirmedFields>(
  doses: T[],
  now: Date = new Date(),
  afterMinutes: number = RELATIVE_ALERT_AFTER_MINUTES,
): T[] {
  const thresholdMs = now.getTime() - afterMinutes * 60_000;
  return doses
    .filter((d) => isUnconfirmedByOwner(d.status))
    .filter((d) => {
      const reference = d.status === 'snoozed' && d.snoozedUntil ? d.snoozedUntil : d.scheduledAt;
      return new Date(reference).getTime() <= thresholdMs;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

/** Lần uống kế tiếp cần xử lý trong một danh sách (đã sắp theo giờ) */
export function nextActionable<T extends { status: DoseStatus }>(doses: T[]): T | null {
  return doses.find((d) => isActionable(d.status)) ?? null;
}

interface DueFields {
  status: DoseStatus;
  scheduledAt: string;
  snoozedUntil?: string | null;
}

/**
 * Các lần uống ĐANG tới hạn nhắc khi trang đang mở (N11):
 * - `pending`/`overdue` đã qua `scheduledAt`
 * - `snoozed` đã qua `snoozedUntil`
 * Sắp xếp theo giờ dự kiến (sớm nhất trước).
 */
export function dueDoses<T extends DueFields>(doses: T[], now: Date = new Date()): T[] {
  const nowMs = now.getTime();
  return doses
    .filter((d) => {
      if (!isActionable(d.status)) return false;
      if (d.status === 'snoozed') {
        return d.snoozedUntil ? new Date(d.snoozedUntil).getTime() <= nowMs : false;
      }
      return new Date(d.scheduledAt).getTime() <= nowMs;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

/** Lần uống tới hạn nhắc đầu tiên (null nếu chưa tới hạn lần nào) */
export function firstDueDose<T extends DueFields>(doses: T[], now: Date = new Date()): T | null {
  return dueDoses(doses, now)[0] ?? null;
}

/** Bộ lọc thuốc cho M06 — lấy tên thuốc duy nhất từ danh sách lịch sử */
export function uniqueMedicationNames(items: HistoryItem[]): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const item of items) {
    if (item.medicationName) map.set(item.medicationId, item.medicationName);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}
