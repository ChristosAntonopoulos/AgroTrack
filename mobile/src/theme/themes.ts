import { colors as lightColors } from './colors';

export type AppColors = typeof lightColors;

export const darkColors: AppColors = {
  ...lightColors,
  primary: '#A8C46E',
  primaryDark: '#8BA84A',
  primaryLight: '#C4D88A',

  secondary: '#A08E72',
  secondaryDark: '#7A6B4F',
  secondaryLight: '#C4B49A',

  background: '#121810',
  backgroundLight: '#1A2016',
  backgroundDark: '#0A0C08',
  surface: '#1E2618',
  surfaceElevated: '#283020',
  surfaceMuted: '#222A1C',

  white: '#283020',
  textPrimary: '#EFF4E8',
  textSecondary: '#A8B89A',
  textTertiary: '#6B8060',
  // Light cream — for text on colored surfaces (header/tab bar)
  textInverse: '#FFFCF6',

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

  shadow: 'rgba(0, 0, 0, 0.45)',
  shadowDark: 'rgba(0, 0, 0, 0.65)',

  // Header — deep olive with gold accent (readable on dark backgrounds)
  headerBackground: '#2E4A2E',
  headerForeground: '#F8F7EE',
  headerForegroundMuted: 'rgba(248, 247, 238, 0.65)',
  headerAccent: '#C9A257',
  headerBorder: 'rgba(201, 162, 87, 0.35)',

  // Tab bar — elevated surface, high-contrast icons
  tabBarBackground: '#243824',
  tabBarForeground: '#F8F7EE',
  tabBarForegroundInactive: 'rgba(167, 179, 138, 0.75)',
  tabBarBorder: 'rgba(201, 162, 87, 0.25)',
  tabBarActivePill: 'rgba(201, 162, 87, 0.22)',

  successLight: '#2A3D20',
  warningLight: '#3D3420',
  errorLight: '#3D2820',
  infoLight: '#243028',

  bannerErrorBg: '#3D2820',
  bannerErrorBorder: '#D46A52',
  bannerWarningBg: '#3D3420',
  bannerWarningBorder: '#D4A84A',
};

export { lightColors };

export type ThemeMode = 'system' | 'light' | 'dark';
