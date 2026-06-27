import { colors as lightColors } from './colors';

export type AppColors = typeof lightColors;

export const darkColors: AppColors = {
  ...lightColors,
  primary: '#9AB973',
  primaryDark: '#6B8E23',
  primaryLight: '#B8D4A0',
  secondary: '#A68B6B',
  secondaryDark: '#8B7355',
  secondaryLight: '#C4A88A',
  background: '#1A1F18',
  backgroundLight: '#2A3328',
  backgroundDark: '#1A1F18',
  white: '#2A3328',
  textPrimary: '#FAF9F6',
  textSecondary: '#9CA392',
  textTertiary: '#6B7568',
  textInverse: '#2A3328',
  border: '#3A4338',
  borderLight: '#2A3328',
  borderDark: '#4A5548',
  gray50: '#2A3328',
  gray100: '#3A4338',
  gray200: '#4A5548',
  gray300: '#6B7568',
  gray400: '#9CA392',
  gray500: '#B8C4B0',
  gray600: '#D4D4C8',
  gray700: '#E8E8E0',
  gray800: '#F5F5F0',
  gray900: '#FAFAF8',
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
};

export { lightColors };

export type ThemeMode = 'system' | 'light' | 'dark';
