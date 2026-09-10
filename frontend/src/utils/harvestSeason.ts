/** Olive cultivation season: 1 Sep Y → 31 Aug Y+1 in Europe/Athens. */

import { athensParts, parseBusinessDate } from './athensDate';

export const SEASON_START_MONTH = 9; // September

export interface SeasonBounds {
  seasonStartYear: number;
  from: Date;
  to: Date;
}

/** Season start year for a date (Sep–Dec → same year; Jan–Aug → previous year). */
export const getSeasonStartYear = (now: Date | string | number = new Date()): number => {
  const p = athensParts(parseBusinessDate(now));
  return p.month >= SEASON_START_MONTH ? p.year : p.year - 1;
};

export const currentHarvestSeason = (now = new Date()): string => String(getSeasonStartYear(now));

export const getSeasonBounds = (seasonStartYear: number): SeasonBounds => {
  const from = new Date(seasonStartYear, SEASON_START_MONTH - 1, 1, 0, 0, 0, 0);
  const to = new Date(seasonStartYear + 1, SEASON_START_MONTH - 1, 1, 0, 0, 0, 0);
  to.setMilliseconds(to.getMilliseconds() - 1);
  return { seasonStartYear, from, to };
};

export const formatSeasonLabel = (seasonStartYear: number): string =>
  `${seasonStartYear}/${seasonStartYear + 1}`;

export const formatSeasonRange = (seasonStartYear: number, locale = 'el-GR'): string => {
  const { from, to } = getSeasonBounds(seasonStartYear);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
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
