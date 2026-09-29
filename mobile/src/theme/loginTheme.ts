/**
 * Auth screens — warm grove wash + ivory glass card + sage actions.
 * Isolated from app dark mode so sign-in stays readable day or night.
 */
export const loginTheme = {
  /** Deep olive wash over full-bleed grove photo */
  overlay: 'rgba(14, 24, 12, 0.48)',
  overlayRegister: 'rgba(12, 22, 10, 0.52)',
  /** Soft gold-green veil for depth without muddying the photo */
  overlayWarm: 'rgba(78, 92, 48, 0.22)',
  overlayBottom: 'rgba(6, 12, 4, 0.48)',
  heroText: '#F8F3E9',
  heroMuted: 'rgba(248, 243, 233, 0.74)',
  cardBg: 'rgba(255, 253, 248, 0.97)',
  cardBorder: 'rgba(255, 255, 255, 0.34)',
  cardRadius: 28,
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(58, 72, 44, 0.14)',
  inputBorderFocused: 'rgba(90, 118, 72, 0.85)',
  inputPlaceholder: '#8B9286',
  /** Deep charcoal-olive for titles */
  textPrimary: '#182016',
  /** Readable body / subtitles */
  textSecondary: '#4E5748',
  /** Labels, helpers, quiet chrome */
  textMuted: '#7C8476',
  /** Links and secondary actions */
  link: '#35502A',
  linkMuted: '#5A6E4C',
  /** Sage submit — calm, confident */
  buttonBg: '#6F8A5E',
  buttonBgPressed: '#7E9A6C',
  buttonText: '#F7FBF4',
  divider: 'rgba(58, 72, 44, 0.14)',
  googleBorder: 'rgba(58, 72, 44, 0.14)',
  googleBg: '#FFFFFF',
  demoBg: 'rgba(255, 253, 248, 0.97)',
  shadow: 'rgba(8, 14, 6, 0.30)',
  softSelected: 'rgba(111, 138, 94, 0.16)',
  softSelectedText: '#35502A',
  inviteBg: 'rgba(111, 138, 94, 0.08)',
  inviteBorder: 'rgba(111, 138, 94, 0.28)',
  inviteIconBg: 'rgba(111, 138, 94, 0.16)',
  stepPillBg: 'rgba(111, 138, 94, 0.12)',
  stepPillText: '#35502A',
  error: '#B85A4A',
  errorBg: 'rgba(184, 90, 74, 0.10)',
  success: '#3F6B48',
  successBg: 'rgba(63, 107, 72, 0.12)',
} as const;
