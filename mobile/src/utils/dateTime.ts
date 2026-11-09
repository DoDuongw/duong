export type Buoi = 'sang' | 'trua' | 'chieu' | 'toi';

export const BUOI_LABEL: Record<Buoi, string> = {
  sang: 'Sáng',
  trua: 'Trưa',
  chieu: 'Chiều',
  toi: 'Tối',
};

/** 00:00–09:59 sáng, 10:00–13:59 trưa, 14:00–17:59 chiều, 18:00–23:59 tối (khớp web). */
export function buoiOfTime(time: string): Buoi {
  const hour = Number(time.slice(0, 2));
  if (hour < 10) return 'sang';
  if (hour < 14) return 'trua';
  if (hour < 18) return 'chieu';
  return 'toi';
}

export function formatTime(iso?: string | null, timeZone = 'Asia/Ho_Chi_Minh'): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone }).format(new Date(iso));
  } catch {
    try {
      return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}

export function formatDate(iso: string, timeZone = 'Asia/Ho_Chi_Minh'): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string | null, timeZone = 'Asia/Ho_Chi_Minh'): string {
  if (!iso) return '';
  return `${formatDate(iso, timeZone)} ${formatTime(iso, timeZone)}`;
}

export function buoiOfIso(iso?: string | null, timeZone = 'Asia/Ho_Chi_Minh'): Buoi {
  if (!iso) return 'sang';
  try {
    return buoiOfTime(formatTime(iso, timeZone));
  } catch {
    return 'sang';
  }
}

/** yyyy-mm-dd → "Thứ Hai, dd/mm/yyyy" */
export function formatDisplayDate(ymd: string): string {
  try {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) throw new Error('bad');
    const date = new Date(Date.UTC(y, m - 1, d));
    const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(date);
    const rest = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
    return `${weekday}, ${rest}`;
  } catch {
    try {
      const date = new Date(ymd.includes('T') ? ymd : `${ymd}T00:00:00`);
      return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return ymd;
    }
  }
}

export function todayYmd(timeZone = 'Asia/Ho_Chi_Minh'): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
  } catch {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
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

export function formatTimezoneLabel(timeZone: string): string {
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
  return offset && offset !== 'GMT' ? `${label} (${offset})` : label;
}

const FALLBACK_TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Asia/Kuala_Lumpur',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

export function timezoneOptions(current?: string | null): string[] {
  let list: string[] = [];
  try {
    const supported = (Intl as any)?.supportedValuesOf;
    if (typeof supported === 'function') list = supported('timeZone') as string[];
  } catch {
    list = [];
  }
  if (!Array.isArray(list) || list.length === 0) list = FALLBACK_TIMEZONES;
  const cur = (current || '').trim();
  return cur && !list.includes(cur) ? [cur, ...list] : list;
}

export function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}
