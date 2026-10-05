import type { AppColors } from '../../theme';

/**
 * Storage screen, dark only. Industrial green-black, not the harvest tavern brown.
 * Applied through ThemeScope so other pages keep their own palette.
 */
export const STORAGE_DARK = {
  background: '#151911',
  card: '#20251C',
  elevated: '#272D21',
  olive: '#A9B972',
  text: '#F4F1E8',
  secondary: '#A7AA9F',
  gold: '#D2A23D',
  sand: '#C4B48A',
  border: 'rgba(255,255,255,0.08)',
} as const;

export const storageScreenColors = (base: AppColors): AppColors => ({
  ...base,
  background: STORAGE_DARK.background,
  backgroundLight: STORAGE_DARK.background,
  backgroundSidebar: '#1B2017',
  surface: STORAGE_DARK.card,
  surfaceElevated: STORAGE_DARK.elevated,
  surfaceMuted: STORAGE_DARK.elevated,
  surface3: STORAGE_DARK.elevated,
  surfaceHover: '#2E3527',
  white: STORAGE_DARK.card,
  primary: STORAGE_DARK.olive,
  primaryDark: '#97A866',
  primaryActive: '#97A866',
  primaryLight: 'rgba(169, 185, 114, 0.16)',
  olive: STORAGE_DARK.olive,
  leaf: STORAGE_DARK.olive,
  oliveBorder: STORAGE_DARK.border,
  accentGold: STORAGE_DARK.gold,
  warning: STORAGE_DARK.sand,
  textPrimary: STORAGE_DARK.text,
  textSecondary: STORAGE_DARK.secondary,
  textTertiary: '#8E9186',
  textInverse: STORAGE_DARK.background,
  onOlive: '#151911',
  border: STORAGE_DARK.border,
  borderLight: STORAGE_DARK.border,
  borderDark: 'rgba(255,255,255,0.14)',
  headerForeground: STORAGE_DARK.text,
  headerForegroundMuted: STORAGE_DARK.secondary,
  shadow: 'transparent',
  shadowDark: 'transparent',
});
