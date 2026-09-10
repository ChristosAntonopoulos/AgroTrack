import { readFieldViewPreferences } from './fieldViewPreferences';

export const FIELD_PAGE_TABS = ['overview', 'map', 'chronologio', 'details'] as const;

export type FieldPageTab = (typeof FIELD_PAGE_TABS)[number];

const isTab = (value: string | null): value is FieldPageTab =>
  value === 'overview' || value === 'map' || value === 'chronologio' || value === 'details';

/** Resolve the Field page tab from the URL, including the legacy Chronologio alias. */
export const parseFieldPageTab = (search: URLSearchParams): FieldPageTab => {
  if (isTab(search.get('tab'))) return search.get('tab') as FieldPageTab;
  if (search.get('mode') === 'chronologio') return 'chronologio';
  return readFieldViewPreferences().lastTab ?? 'overview';
};

export const parseFieldResultYear = (search: URLSearchParams, fallback: number): number => {
  const year = Number(search.get('year'));
  if (Number.isInteger(year) && year >= 1990 && year <= 2100) return year;
  return fallback;
};

export const buildAvailableYears = (currentYear: number, periodYears: number[]): number[] => {
  const years = new Set<number>([currentYear, currentYear - 1, ...periodYears]);
  return [...years].filter((year) => Number.isInteger(year)).sort((a, b) => b - a);
};
