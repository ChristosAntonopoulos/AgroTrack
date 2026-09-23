/** Official alpha APK path (bundled in frontend/public/downloads/ at build time). */
export const ALPHA_APK_URL = '/downloads/oleachron-alpha.apk';
export const ALPHA_APK_FILENAME = 'oleachron-alpha.apk';
export const LANDING_HELLO_EMAIL = 'hello@oleachron.com';
export const LANDING_SUPPORT_EMAIL = 'support@oleachron.com';
export const LANDING_CONTACT_EMAIL = LANDING_HELLO_EMAIL;

/** Story nav only — the page carries the feature detail. */
export const LANDING_NAV = [
  { id: 'how-it-works', key: 'howItWorks' },
  { id: 'capabilities', key: 'features' },
  { id: 'chronologio', key: 'chronologio' },
] as const;
