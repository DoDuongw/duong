import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FONT_SCALE_MULTIPLIER, readFontScale, saveFontScale, type FontScale } from '../utils/fontScale';

interface FontScaleContextValue {
  scale: FontScale;
  multiplier: number;
  setScale: (next: FontScale) => Promise<void>;
}

const FontScaleContext = createContext<FontScaleContextValue>({
  scale: 'md',
  multiplier: 1,
  setScale: async () => {},
});

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState<FontScale>('md');

  useEffect(() => {
    readFontScale().then(setScaleState).catch(() => {});
  }, []);

  const setScale = useCallback(async (next: FontScale) => {
    setScaleState(next);
    await saveFontScale(next);
  }, []);

  const value = useMemo(
    () => ({ scale, multiplier: FONT_SCALE_MULTIPLIER[scale], setScale }),
    [scale, setScale],
  );

  return <FontScaleContext.Provider value={value}>{children}</FontScaleContext.Provider>;
}

export function useFontScale() {
  return useContext(FontScaleContext);
}

export function scaledStyle<T extends Record<string, any> | undefined | null>(
  style: T,
  multiplier: number,
): T {
  if (!style || multiplier === 1) return style;
  const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
  if (!flat || typeof flat !== 'object') return style;
  const out: any = { ...(flat as any) };
  if (typeof out.fontSize === 'number') out.fontSize = Math.round(out.fontSize * multiplier);
  if (typeof out.lineHeight === 'number') out.lineHeight = Math.round(out.lineHeight * multiplier);
  return out as T;
}
