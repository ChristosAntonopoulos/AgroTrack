import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { AppColors, darkColors, lightColors, sunColors, ThemeMode } from '../theme/themes';
import { applyHarvestLivePalette } from '../theme/harvestTheme';
import { useAmbientSunlight } from '../theme/useAmbientSunlight';
import { TAP_MIN_PX } from '../experience/types';
import { usePreferences } from './PreferencesContext';
import { useHarvestCampaignOptional } from './HarvestCampaignContext';

interface ThemeContextType {
  colors: AppColors;
  isDark: boolean;
  /** True when the high-contrast sun palette is active (manual or auto). */
  isSun: boolean;
  mode: ThemeMode;
  /** Whether this device can read ambient light for Bright field. */
  brightFieldAvailable: boolean;
  fontScaleMultiplier: number;
  tapMin: number;
}

const FALLBACK_THEME: ThemeContextType = {
  colors: lightColors,
  isDark: false,
  isSun: false,
  mode: 'system',
  brightFieldAvailable: false,
  fontScaleMultiplier: 1,
  tapMin: TAP_MIN_PX.default,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const { themeMode, brightFieldAuto, fontScaleMultiplier, tapMin } = usePreferences();
  const harvest = useHarvestCampaignOptional();

  // Probe availability always; listen only when auto can override the chosen theme.
  const listen = brightFieldAuto && themeMode !== 'sun';
  const { available: brightFieldAvailable, isSunny } = useAmbientSunlight(listen);
  const autoSun = listen && brightFieldAvailable && isSunny;

  const isSun = themeMode === 'sun' || autoSun;

  const isDark = useMemo(() => {
    if (isSun) return false;
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemScheme === 'dark';
  }, [isSun, themeMode, systemScheme]);

  const value = useMemo(() => {
    const base = isSun ? sunColors : isDark ? darkColors : lightColors;
    const colors =
      harvest?.isLive && !isSun ? applyHarvestLivePalette(base, isDark) : base;
    return {
      colors,
      isDark,
      isSun,
      mode: themeMode,
      brightFieldAvailable,
      fontScaleMultiplier,
      tapMin,
    };
  }, [
    isDark,
    isSun,
    themeMode,
    brightFieldAvailable,
    fontScaleMultiplier,
    tapMin,
    harvest?.isLive,
  ]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  return context ?? FALLBACK_THEME;
};

/** One screen can swap surface colors without changing the rest of the app. */
export const ThemeScope: React.FC<{ colors: AppColors; children: ReactNode }> = ({
  colors,
  children,
}) => {
  const parent = useTheme();
  const value = useMemo(() => ({ ...parent, colors }), [parent, colors]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
