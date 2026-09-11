import { athensParts, parseBusinessDate } from '../utils/athensDate';

/** Olive agricultural / harvest year: 1 Feb Y → 31 Jan Y+1. Matches backend ResultYear. */
export const AGRICULTURAL_YEAR_START_MONTH = 2;

export const agriculturalYearFor = (value: string | Date | number): number => {
  const parts = athensParts(parseBusinessDate(value));
  return parts.month >= AGRICULTURAL_YEAR_START_MONTH ? parts.year : parts.year - 1;
};

export const agriculturalYearBounds = (resultYear: number): { from: Date; to: Date } => ({
  from: new Date(Date.UTC(resultYear, AGRICULTURAL_YEAR_START_MONTH - 1, 1, 0, 0, 0)),
  to: new Date(Date.UTC(resultYear + 1, AGRICULTURAL_YEAR_START_MONTH - 1, 1, 0, 0, 0) - 1),
});

export const agriculturalYearMonths = (resultYear: number): { year: number; month: number }[] => {
  const months: { year: number; month: number }[] = [];
  for (let month = AGRICULTURAL_YEAR_START_MONTH; month <= 12; month += 1) {
    months.push({ year: resultYear, month });
  }
  for (let month = 1; month < AGRICULTURAL_YEAR_START_MONTH; month += 1) {
    months.push({ year: resultYear + 1, month });
  }
  return months;
};

export const agriculturalYearTitle = (resultYear: number, language = 'el'): string =>
  language.toLowerCase().startsWith('en')
    ? `Agricultural year ${resultYear}`
    : `Καλλιεργητική χρονιά ${resultYear}`;

export const agriculturalYearRangeLabel = (resultYear: number, language = 'el'): string => {
  const locale = language.toLowerCase().startsWith('en') ? 'en-GB' : 'el-GR';
  const from = new Date(resultYear, AGRICULTURAL_YEAR_START_MONTH - 1, 1);
  const to = new Date(resultYear + 1, 0, 31);
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
};
