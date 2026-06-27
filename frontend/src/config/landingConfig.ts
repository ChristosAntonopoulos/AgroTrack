/** Official alpha APK path (bundled in frontend/public/downloads/ at build time). */
export const ALPHA_APK_URL = '/downloads/olivecycle-alpha.apk';
export const ALPHA_APK_FILENAME = 'olivecycle-alpha.apk';
export const LANDING_CONTACT_EMAIL = 'hello@olivecycle.app';

export const LANDING_NAV = [
  { id: 'product', key: 'product' },
  { id: 'features', key: 'features' },
  { id: 'web-app', key: 'webApp' },
  { id: 'mobile-app', key: 'mobileApp' },
  { id: 'pricing', key: 'pricing' },
  { id: 'alpha-apk', key: 'alphaApk' },
  { id: 'faq', key: 'faq' },
] as const;
