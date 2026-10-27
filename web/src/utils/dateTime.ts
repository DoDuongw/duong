/** Định dạng ngày/giờ theo múi giờ người dùng — dùng cho M01/M03/M06 */

export type Buoi = 'sang' | 'trua' | 'chieu' | 'toi';

export const BUOI_LABEL: Record<Buoi, string> = {
  sang: 'Sáng',
  trua: 'Trưa',
  chieu: 'Chiều',
  toi: 'Tối',
};

/**
 * Nhóm giờ trong ngày theo buổi:
 * 00:00–09:59 sáng, 10:00–13:59 trưa, 14:00–17:59 chiều, 18:00–23:59 tối.
 */
export function buoiOfTime(time: string): Buoi {
  const hour = Number(time.slice(0, 2));
  if (hour < 10) return 'sang';
  if (hour < 14) return 'trua';
  if (hour < 18) return 'chieu';
  return 'toi';
}

/** ISO (UTC) → “HH:mm” theo múi giờ (mặc định Asia/Ho_Chi_Minh) */
export function formatTime(iso: string, timeZone = 'Asia/Ho_Chi_Minh'): string {
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone }).format(
    new Date(iso),
  );
}

/** ISO (UTC) → “dd/MM/yyyy” theo múi giờ */
export function formatDate(iso: string, timeZone = 'Asia/Ho_Chi_Minh'): string {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone }).format(
    new Date(iso),
  );
}

/** ISO (UTC) → “dd/MM/yyyy HH:mm” theo múi giờ (dùng cho lịch sử M06) */
export function formatDateTime(iso: string, timeZone = 'Asia/Ho_Chi_Minh'): string {
  return `${formatDate(iso, timeZone)} ${formatTime(iso, timeZone)}`;
}

/** ISO (UTC) → buổi trong ngày theo múi giờ (dùng để nhóm M01/M03) */
export function buoiOfIso(iso: string, timeZone = 'Asia/Ho_Chi_Minh'): Buoi {
  return buoiOfTime(formatTime(iso, timeZone));
}

/** yyyy-mm-dd → “Thứ Hai, dd/mm/yyyy” (ngày địa phương, không phụ thuộc UTC) */
export function formatDisplayDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(date);
  const rest = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
  return `${weekday}, ${rest}`;
}

/** “yyyy-mm-dd” của hôm nay theo múi giờ người dùng */
export function todayYmd(timeZone = 'Asia/Ho_Chi_Minh'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

const TIMEZONE_NAME_VI: Record<string, string> = {
  'Asia/Ho_Chi_Minh': 'Việt Nam',
  'Asia/Bangkok': 'Thái Lan',
  'Asia/Singapore': 'Singapore',
  'Asia/Tokyo': 'Nhật Bản',
  'Asia/Seoul': 'Hàn Quốc',
  'Australia/Sydney': 'Sydney',
  'Europe/London': 'Luân Đôn',
  'Europe/Paris': 'Paris',
  'America/New_York': 'New York',
  'America/Los_Angeles': 'Los Angeles',
  UTC: 'Giờ quốc tế',
};

const timezoneLabelCache = new Map<string, string>();

/** Mã múi giờ (Asia/Ho_Chi_Minh) → nhãn tiếng Việt kèm chênh lệch GMT, ví dụ “Việt Nam (GMT+7)”. */
export function formatTimezoneLabel(timeZone: string): string {
  const cached = timezoneLabelCache.get(timeZone);
  if (cached) return cached;

  let label = TIMEZONE_NAME_VI[timeZone];
  if (!label) {
    try {
      label =
        new Intl.DateTimeFormat('vi-VN', { timeZone, timeZoneName: 'long' })
          .formatToParts(new Date())
          .find((part) => part.type === 'timeZoneName')?.value ?? timeZone;
    } catch {
      label = timeZone;
    }
  }

  let offset = '';
  try {
    offset =
      new Intl.DateTimeFormat('vi-VN', { timeZone, timeZoneName: 'shortOffset' })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value ?? '';
  } catch {
    offset = '';
  }

  const result = offset && offset !== 'GMT' ? `${label} (${offset})` : label;
  timezoneLabelCache.set(timeZone, result);
  return result;
}

/** Cộng/trừ ngày trên chuỗi yyyy-mm-dd (không lệch múi giờ) */
export function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}
