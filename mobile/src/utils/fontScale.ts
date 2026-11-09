import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontScale = 'sm' | 'md' | 'lg';

const STORAGE_KEY = 'fontScale';

export const FONT_SCALE_LABEL: Record<FontScale, string> = { sm: 'Nhỏ', md: 'Vừa', lg: 'Lớn' };
export const FONT_SCALE_MULTIPLIER: Record<FontScale, number> = { sm: 0.92, md: 1, lg: 1.15 };

export async function readFontScale(): Promise<FontScale> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    return saved === 'sm' || saved === 'md' || saved === 'lg' ? saved : 'md';
  } catch {
    return 'md';
  }
}

export async function saveFontScale(scale: FontScale): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, scale);
  } catch {}
}
