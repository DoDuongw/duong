/** Preference cỡ chữ (M08) — lưu localStorage, áp dụng qua data-font-scale (xem index.css) */

export type FontScale = 'sm' | 'md' | 'lg';

const STORAGE_KEY = 'fontScale';

export const FONT_SCALE_LABEL: Record<FontScale, string> = { sm: 'Nhỏ', md: 'Vừa', lg: 'Lớn' };

export function readFontScale(): FontScale {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'sm' || saved === 'md' || saved === 'lg' ? saved : 'md';
}

export function applyFontScale(scale: FontScale): void {
  document.documentElement.dataset.fontScale = scale;
  localStorage.setItem(STORAGE_KEY, scale);
}

/** Gọi trước khi render — khôi phục cỡ chữ đã lưu */
export function restoreFontScale(): void {
  document.documentElement.dataset.fontScale = readFontScale();
}
