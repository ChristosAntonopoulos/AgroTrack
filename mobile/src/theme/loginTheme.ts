/**
 * Auth screens — matches frontend LoginPage.css light auth tokens.
 * Isolated from app dark mode; grove photo + ivory glass card + sage submit.
 */
export const loginTheme = {
  /** Grove wash over full-bleed photo (web --login-overlay-left average) */
  overlay: 'rgba(10, 16, 8, 0.58)',
  overlayRegister: 'rgba(10, 16, 8, 0.64)',
  heroText: '#f5f0e6',
  heroMuted: 'rgba(245, 240, 230, 0.72)',
  cardBg: 'rgba(255, 254, 250, 0.92)',
  cardBorder: 'rgba(255, 255, 255, 0.16)',
  cardRadius: 24,
  inputBg: 'rgba(255, 255, 255, 0.62)',
  inputBorder: 'rgba(80, 90, 60, 0.18)',
  inputBorderFocused: 'rgba(133, 154, 109, 0.65)',
  inputPlaceholder: '#697065',
  textPrimary: '#22281F',
  textSecondary: '#697065',
  textMuted: '#92978E',
  link: '#486038',
  /** Sage submit — web --login-submit-* (not brand olive) */
  buttonBg: '#859A6D',
  buttonBgPressed: '#94A97A',
  buttonText: '#11170F',
  divider: 'rgba(80, 90, 60, 0.18)',
  googleBorder: 'rgba(80, 90, 60, 0.18)',
  googleBg: 'rgba(255, 255, 255, 0.42)',
  demoBg: 'rgba(255, 254, 250, 0.92)',
  shadow: 'rgba(10, 16, 8, 0.35)',
  softSelected: 'rgba(133, 154, 109, 0.22)',
  softSelectedText: '#486038',
  error: '#C96656',
  errorBg: 'rgba(201, 102, 86, 0.12)',
  success: '#4f7a58',
  successBg: 'rgba(98, 145, 109, 0.16)',
} as const;
