/**
 * Cài đặt nhắc lại của người dùng (lưu trong `users.preferences` — trường Mixed, không cần migration).
 * Giá trị mặc định khớp BUSINESS_RULES: nhắc lại 10 phút, tối đa 3 lần.
 */

export const SNOOZE_MINUTES_DEFAULT = 10;
export const SNOOZE_MAX_DEFAULT = 3;

/** Giới hạn cho phép chỉnh ở M08 (đủ rộng nhưng không phá luồng nghiệp vụ) */
export const SNOOZE_MINUTES_MIN = 5;
export const SNOOZE_MINUTES_MAX = 30;
export const SNOOZE_MAX_MIN = 1;
export const SNOOZE_MAX_MAX = 5;

export interface SnoozeSettings {
  /** Số phút chờ trước khi nhắc lại */
  minutes: number;
  /** Số lần nhắc lại tối đa cho một lần uống */
  max: number;
}

/** Đọc số nguyên trong khoảng [min, max]; giá trị sai/thiếu → mặc định (an toàn với dữ liệu cũ). */
function readInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** Cài đặt nhắc lại hiệu lực của một người dùng (đã kẹp trong giới hạn cho phép). */
export function readSnoozeSettings(
  preferences: Record<string, unknown> | null | undefined,
): SnoozeSettings {
  const prefs = preferences ?? {};
  return {
    minutes: readInt(prefs.snoozeMinutes, SNOOZE_MINUTES_DEFAULT, SNOOZE_MINUTES_MIN, SNOOZE_MINUTES_MAX),
    max: readInt(prefs.snoozeMax, SNOOZE_MAX_DEFAULT, SNOOZE_MAX_MIN, SNOOZE_MAX_MAX),
  };
}
