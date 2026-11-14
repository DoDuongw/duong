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
