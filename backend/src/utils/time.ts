export function nowUtc(): Date {
  return new Date();
}

export function todayLocal(tz: string): string {
  return localYmd(new Date(), tz);
}

export function isSameLocalDay(a: Date, tz: string): boolean {
  return localYmd(new Date(), tz) === localYmd(a, tz);
}

/** Ngày địa phương (YYYY-MM-DD) của một thời điểm, theo múi giờ `tz` */
export function localYmd(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Hai thời điểm có cùng ngày địa phương theo `tz` không */
export function isSameLocalDayAs(a: Date, b: Date, tz: string): boolean {
  return localYmd(a, tz) === localYmd(b, tz);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

/** Chênh lệch (ms) giữa giờ địa phương theo `tz` và UTC tại thời điểm UTC cho trước */
function tzOffsetMs(utcMs: number, tz: string): number {
  const base = Math.floor(utcMs / 1000) * 1000;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(base));
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // `hour` có thể trả '24' cho nửa đêm → quy về 0
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - base;
}

/**
 * Đổi "ngày + giờ địa phương" (theo múi giờ `tz`) thành thời điểm UTC thật để lưu CSDL.
 * Ví dụ: ('2026-10-20', '08:00', 'Asia/Ho_Chi_Minh') → 2026-10-20T01:00:00.000Z.
 */
export function localDateTimeToUtc(ymd: string, hhmm: string, tz: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const asIfUtc = Date.UTC(y, m - 1, d, h, mi, 0, 0);
  // Bù chênh lệch múi giờ; lặp 2 bước để vẫn đúng quanh thời điểm đổi giờ mùa hè (DST)
  let ts = asIfUtc - tzOffsetMs(asIfUtc, tz);
  ts = asIfUtc - tzOffsetMs(ts, tz);
  return new Date(ts);
}

/** 00:00:00.000 giờ địa phương `tz` của ngày `ymd`, quy về UTC */
export function startOfLocalDayUtc(tz: string, ymd: string): Date {
  return localDateTimeToUtc(ymd, '00:00', tz);
}

/** 23:59:59.999 giờ địa phương `tz` của ngày `ymd`, quy về UTC */
export function endOfLocalDayUtc(tz: string, ymd: string): Date {
  return new Date(startOfLocalDayUtc(tz, shiftYmd(ymd, 1)).getTime() - 1);
}
