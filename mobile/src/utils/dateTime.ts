export type Buoi = 'sang' | 'trua' | 'chieu' | 'toi';

const BUOI_ORDER: Buoi[] = ['sang', 'trua', 'chieu', 'toi'];

export const BUOI_LABEL: Record<Buoi, string> = {
  sang: 'Sáng',
  trua: 'Trưa',
  chieu: 'Chiều',
  toi: 'Tối',
};

const TIME_RANGES: Record<Buoi, [number, number]> = {
  sang: [5, 11],
  trua: [11, 14],
  chieu: [14, 18],
  toi: [18, 24],
};

export function buoiOfIso(iso?: string | null): Buoi {
  if (!iso) return 'sang';
  try {
    const d = new Date(iso);
    const h = d.getHours();
    for (const b of BUOI_ORDER) {
      const [s, e] = TIME_RANGES[b];
      if (h >= s && h < e) return b;
    }
    return 'toi';
  } catch {
    return 'sang';
  }
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatDisplayDate(isoOrYmd: string): string {
  try {
    const d = new Date(isoOrYmd.includes('T') ? isoOrYmd : `${isoOrYmd}T00:00:00`);
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return isoOrYmd;
  }
}

export function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
