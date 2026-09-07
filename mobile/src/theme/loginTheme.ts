import { colors } from './colors';

/** Fixed dark palette for auth screens — independent of app light/dark mode */
export const loginTheme = {
  overlay: 'rgba(8, 14, 6, 0.78)',
  heroText: '#F0EBE0',
  heroMuted: 'rgba(240, 235, 224, 0.78)',
  cardBg: 'rgba(32, 38, 28, 0.94)',
  cardBorder: 'rgba(196, 184, 150, 0.16)',
  inputBg: '#1A2016',
  inputBorder: '#3D4634',
  inputBorderFocused: colors.primaryLight,
  inputPlaceholder: '#7A7568',
  textPrimary: '#F0EBE0',
  textSecondary: '#A8A090',
  textMuted: '#8A8578',
  link: '#B8C98A',
  buttonBg: '#3D5230',
  buttonBgPressed: '#324428',
  buttonText: '#F5F0E6',
  divider: '#4A5548',
  googleBorder: '#4A5548',
  googleBg: 'rgba(26, 32, 22, 0.85)',
  demoBg: 'rgba(26, 32, 22, 0.72)',
  shadow: 'rgba(0, 0, 0, 0.35)',
} as const;
