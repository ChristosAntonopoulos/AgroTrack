import { colors as lightColors } from './colors';

export type AppColors = typeof lightColors;

export const darkColors: AppColors = {
  ...lightColors,
  primary: '#8BA84A',
  primaryDark: '#5C7A1F',
  primaryLight: '#A8C46E',
  secondary: '#A08E72',
  secondaryDark: '#7A6B4F',
  secondaryLight: '#C4B49A',
  background: '#1A2016',
  backgroundLight: '#283020',
  backgroundDark: '#121810',
  surface: '#283020',
  surfaceElevated: '#324030',
  surfaceMuted: '#222A1C',
  white: '#324030',
  textPrimary: '#EFF4E8',
  textSecondary: '#A8B89A',
  textTertiary: '#6B8060',
  textInverse: '#283020',
  border: '#3D4A34',
  borderLight: '#324030',
  borderDark: '#4A5A42',
  gray50: '#283020',
  gray100: '#324030',
  gray200: '#3D4A34',
  gray300: '#4A5A42',
  gray400: '#6B8060',
  gray500: '#8A9A7E',
  gray600: '#A8B89A',
  gray700: '#CDD8BE',
  gray800: '#E0E8D4',
  gray900: '#EFF4E8',
  shadow: 'rgba(0, 0, 0, 0.35)',
  shadowDark: 'rgba(0, 0, 0, 0.55)',
};

export { lightColors };

export type ThemeMode = 'system' | 'light' | 'dark';
