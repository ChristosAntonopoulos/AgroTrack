export type SupportedLocale = 'en' | 'el' | 'it';

export const DEFAULT_LOCALE: SupportedLocale = 'en';
export const FALLBACK_LOCALE: SupportedLocale = 'en';

export const SUPPORTED_LOCALES: ReadonlyArray<{
  code: SupportedLocale;
  nativeLabel: string;
}> = [
  { code: 'en', nativeLabel: 'English' },
  { code: 'el', nativeLabel: 'Ελληνικά' },
  { code: 'it', nativeLabel: 'Italiano' },
];

export const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'settings',
  'errors',
  'dashboard',
  'fields',
  'tasks',
  'calendar',
  'analytics',
  'reports',
  'ministry',
  'approvals',
  'issues',
  'today',
] as const;

export type AppNamespace = (typeof NAMESPACES)[number];

export const isSupportedLocale = (value: string): value is SupportedLocale =>
  SUPPORTED_LOCALES.some((l) => l.code === value);

export const normalizeLocale = (value: string | undefined): SupportedLocale => {
  if (value && isSupportedLocale(value)) return value;
  const browser = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : '';
  if (browser && isSupportedLocale(browser)) return browser;
  return DEFAULT_LOCALE;
};
