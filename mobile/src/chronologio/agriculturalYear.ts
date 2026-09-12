/** Olive agricultural / harvest year: 1 Feb Y → 31 Jan Y+1. */
export const AGRICULTURAL_YEAR_START_MONTH = 2;

export const agriculturalYearFor = (value: Date | number = new Date()): number => {
  const d = typeof value === 'number' ? new Date(value, 0, 1) : value;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return month >= AGRICULTURAL_YEAR_START_MONTH ? year : year - 1;
};

export const agriculturalYearRangeLabel = (resultYear: number, language = 'en'): string => {
  const locale = language.toLowerCase().startsWith('el') ? 'el-GR' : 'en-GB';
  const from = new Date(resultYear, AGRICULTURAL_YEAR_START_MONTH - 1, 1);
  const to = new Date(resultYear + 1, 0, 31);
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
};
