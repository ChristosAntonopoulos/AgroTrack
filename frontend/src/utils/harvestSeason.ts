/**
 * CropSeason (QA-005/QA-006): 1 Feb Y → 31 Jan Y+1 in Europe/Athens.
 *
 * Decision: Harvest, My Oil, Money and Chronologio share ONE season definition — the backend
 * `AgriculturalYear` mirrored in chronologio/agriculturalYear.ts. The previous Sep–Aug window
 * disagreed with Money/Chronologio totals, so it was removed. "Picking months" (Oct–Jan) remain a
 * separate UX concept (`isOliveHarvestSeason`) and never define season totals.
 */

import {
  AGRICULTURAL_YEAR_START_MONTH,
  agriculturalYearBounds,
  agriculturalYearFor,
  agriculturalYearSlashLabel,
} from '../chronologio/agriculturalYear';
import { athensParts, parseBusinessDate } from './athensDate';

export const SEASON_START_MONTH = AGRICULTURAL_YEAR_START_MONTH;

export interface SeasonBounds {
  seasonStartYear: number;
  from: Date;
  to: Date;
}

/** Season start year for a date (Feb–Dec → same year; Jan → previous year). */
export const getSeasonStartYear = (now: Date | string | number = new Date()): number =>
  agriculturalYearFor(now);

export const currentHarvestSeason = (now = new Date()): string => String(getSeasonStartYear(now));

/** Picking months: October through January. */
export const isOliveHarvestSeason = (now: Date | string | number = new Date()): boolean => {
  const month = athensParts(parseBusinessDate(now)).month;
  return month >= 10 || month === 1;
};

export const getSeasonBounds = (seasonStartYear: number): SeasonBounds => ({
  seasonStartYear,
  ...agriculturalYearBounds(seasonStartYear),
});

/** Shared label for every surface that names a season, e.g. 2025 → "2025/26". */
export const formatSeasonLabel = (seasonStartYear: number): string =>
  agriculturalYearSlashLabel(seasonStartYear);

export const formatSeasonRange = (seasonStartYear: number, locale = 'el-GR'): string => {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const from = new Date(seasonStartYear, SEASON_START_MONTH - 1, 1);
  const to = new Date(seasonStartYear + 1, 0, 31);
  return `${from.toLocaleDateString(locale, opts)} – ${to.toLocaleDateString(locale, opts)}`;
};

export const isDateInSeason = (value: string | Date | null | undefined, bounds: SeasonBounds): boolean => {
  if (!value) return false;
  const d = parseBusinessDate(value);
  if (Number.isNaN(d.getTime())) return false;
  return getSeasonStartYear(d) === bounds.seasonStartYear;
};

export const isCalendarYear = (value: string | Date | null | undefined, year: number): boolean => {
  if (!value) return false;
  return athensParts(parseBusinessDate(value)).year === year;
};

export const isSeasonEnded = (seasonStartYear: number, now = new Date()): boolean => {
  const { to } = getSeasonBounds(seasonStartYear);
  return now.getTime() > to.getTime();
};

export const isSeasonIncomplete = (seasonStartYear: number, now = new Date()): boolean =>
  !isSeasonEnded(seasonStartYear, now);

export const getOpenSeasonStartYear = (now = new Date()): number => getSeasonStartYear(now);

export const listRecentSeasonYears = (count = 8, now = new Date()): number[] => {
  const current = getSeasonStartYear(now);
  return Array.from({ length: count }, (_, i) => current - i);
};
