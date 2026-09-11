import { colors } from './colors';

/**
 * Auth screens use the same olive tokens on the grove photo —
 * limestone form card, olive primary (matches web LoginPage).
 */
export const loginTheme = {
  overlay: 'rgba(24, 29, 21, 0.52)',
  heroText: '#F3F4EF',
  heroMuted: 'rgba(243, 244, 239, 0.78)',
  cardBg: colors.surface,
  cardBorder: colors.border,
  inputBg: colors.surface,
  inputBorder: colors.border,
  inputBorderFocused: colors.primary,
  inputPlaceholder: colors.textTertiary,
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textMuted: colors.textTertiary,
  link: colors.link,
  buttonBg: colors.primary,
  buttonBgPressed: colors.primaryDark,
  buttonText: colors.onOlive,
  divider: colors.border,
  googleBorder: colors.border,
  googleBg: colors.surfaceMuted,
  demoBg: 'rgba(255, 254, 250, 0.92)',
  shadow: colors.shadowDark,
  softSelected: colors.primaryLight,
  softSelectedText: colors.primary,
} as const;
