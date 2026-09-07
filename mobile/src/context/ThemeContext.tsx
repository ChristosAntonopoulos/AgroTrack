import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { AppColors, darkColors, lightColors, ThemeMode } from '../theme/themes';
import { TAP_MIN_PX } from '../experience/types';
import { usePreferences } from './PreferencesContext';

interface ThemeContextType {
  colors: AppColors;
  isDark: boolean;
  mode: ThemeMode;
  fontScaleMultiplier: number;
  tapMin: number;
}

const FALLBACK_THEME: ThemeContextType = {
  colors: lightColors,
  isDark: false,
  mode: 'system',
  fontScaleMultiplier: 1,
  tapMin: TAP_MIN_PX.default,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const { themeMode, fontScaleMultiplier, tapMin } = usePreferences();

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemScheme === 'dark';
  }, [themeMode, systemScheme]);

  const value = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      mode: themeMode,
      fontScaleMultiplier,
      tapMin,
    }),
    [isDark, themeMode, fontScaleMultiplier, tapMin]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  return context ?? FALLBACK_THEME;
};
