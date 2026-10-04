export type YearMonth = { year: number; month: number };

/**
 * Days keeps the period you are already in.
 * Only return-to-today jumps to the live month.
 */
export const daysLandingMonth = (
  periodYear: number,
  current: YearMonth,
  now: YearMonth
): YearMonth | null => {
  if (current.year === periodYear) return null;
  return {
    year: periodYear,
    month: periodYear === now.year ? now.month : 9,
  };
};
