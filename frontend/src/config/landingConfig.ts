/** Official alpha APK path (bundled in frontend/public/downloads/ at build time). */
export const ALPHA_APK_URL = '/downloads/oleachron-alpha.apk';
export const ALPHA_APK_FILENAME = 'oleachron-alpha.apk';
export const LANDING_CONTACT_EMAIL = 'hello@oleachron.app';

export const LANDING_NAV = [
  { id: 'product', key: 'product' },
  { id: 'how-it-works', key: 'howItWorks' },
  { id: 'download', key: 'download' },
  { id: 'faq', key: 'faq' },
] as const;
