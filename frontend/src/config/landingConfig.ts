/** Official alpha APK path (bundled in frontend/public/downloads/ at build time). */
export const ALPHA_APK_URL = '/downloads/theolivelot.apk';
export const ALPHA_APK_FILENAME = 'theolivelot.apk';
/** Official contact for privacy, support, and landing mailto links. */
export const LANDING_SUPPORT_EMAIL = 'support@theolivelot.com';
export const LANDING_CONTACT_EMAIL = LANDING_SUPPORT_EMAIL;
/** @deprecated Use LANDING_SUPPORT_EMAIL — kept for older imports. */
export const LANDING_HELLO_EMAIL = LANDING_SUPPORT_EMAIL;

/** Story nav only — the page carries the detail. */
export const LANDING_NAV = [
  { id: 'how-it-works', key: 'howItWorks' },
  { id: 'keeps', key: 'keeps' },
  { id: 'for-whom', key: 'forWhom' },
  { id: 'pricing', key: 'pricing' },
] as const;
