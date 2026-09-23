import {
  agriculturalYearFor,
  agriculturalYearMonths,
  agriculturalYearRangeLabel,
} from '../chronologio/agriculturalYear';
import { monthSeasonStage } from '../chronologio/monthPresentation';
import { seasonStageIndex, SEASON_STAGES, type SeasonStage } from '../chronologio/yearPresentation';

/** Grower-facing span for a ResultYear. 2026 means 1 Feb 2026 – 31 Jan 2027. */
export const harvestYearSpan = (resultYear: number): string => {
  const end = String(resultYear + 1).slice(-2);
  return `${resultYear}/${end}`;
};

export const harvestYearRangeLabel = agriculturalYearRangeLabel;

export type HarvestYearStatus = 'current' | 'closed' | 'upcoming';

export const harvestYearStatus = (resultYear: number, now = new Date()): HarvestYearStatus => {
  const current = agriculturalYearFor(now);
  if (resultYear > current) return 'upcoming';
  if (resultYear < current) return 'closed';
  return 'current';
};

export const currentHarvestStage = (now = new Date()): SeasonStage => SEASON_STAGES[seasonStageIndex(now)];

export const HARVEST_YEAR_STAGES: SeasonStage[] = SEASON_STAGES;

/** February of the harvest year through January of the next calendar year. */
export function orderHarvestYearMonths<T extends { month: number }>(
  resultYear: number,
  rows: readonly T[]
): Array<{ calendarYear: number; month: number; stage: SeasonStage; row: T | undefined }> {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return agriculturalYearMonths(resultYear).map(({ year, month }) => ({
    calendarYear: year,
    month,
    stage: monthSeasonStage(month),
    row: byMonth.get(month),
  }));
}

/** Calendar month inside a harvest year. January is the closing month of the next calendar year. */
export function harvestMonthTitle(resultYear: number, month: number, locale: string): string {
  const hit = agriculturalYearMonths(resultYear).find((item) => item.month === month);
  const calendarYear = hit?.year ?? resultYear;
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(calendarYear, month - 1, 1)
  );
}
