export type SupportedLocale = 'en' | 'el' | 'it';

export const DEFAULT_LOCALE: SupportedLocale = 'el';
export const FALLBACK_LOCALE: SupportedLocale = 'el';

export const SUPPORTED_LOCALES: ReadonlyArray<{
  code: SupportedLocale;
  nativeLabel: string;
}> = [
  { code: 'el', nativeLabel: 'Ελληνικά' },
  { code: 'en', nativeLabel: 'English' },
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
  'today',
  'taskTemplates',
  'landing',
  'admin',
  'partners',
  'chronologio',
  'capture',
  'economics',
] as const;

export type AppNamespace = (typeof NAMESPACES)[number];

export const isSupportedLocale = (value: string): value is SupportedLocale =>
  SUPPORTED_LOCALES.some((l) => l.code === value);

export const normalizeLocale = (value: string | undefined): SupportedLocale => {
  if (value && isSupportedLocale(value)) return value;
  return DEFAULT_LOCALE;
};
