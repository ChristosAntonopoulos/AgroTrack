/** Official alpha APK path (bundled in frontend/public/downloads/ at build time). */
export const ALPHA_APK_URL = '/downloads/theolivelot.apk';
export const ALPHA_APK_FILENAME = 'theolivelot.apk';
export const LANDING_HELLO_EMAIL = 'hello@oleachron.com';
export const LANDING_SUPPORT_EMAIL = 'support@oleachron.com';
export const LANDING_CONTACT_EMAIL = LANDING_HELLO_EMAIL;

/** Story nav only — the page carries the detail. */
export const LANDING_NAV = [
  { id: 'how-it-works', key: 'howItWorks' },
  { id: 'keeps', key: 'keeps' },
  { id: 'for-whom', key: 'forWhom' },
  { id: 'pricing', key: 'pricing' },
] as const;
