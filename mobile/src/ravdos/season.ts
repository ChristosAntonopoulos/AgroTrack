/** Olive cultivation season: 1 Sep Y → 31 Aug Y+1 */

export const SEASON_START_MONTH = 9;

export interface SeasonBounds {
  seasonStartYear: number;
  from: Date;
  to: Date;
}

export const getSeasonStartYear = (now = new Date()): number => {
  const d = new Date(now);
  return d.getMonth() + 1 >= SEASON_START_MONTH ? d.getFullYear() : d.getFullYear() - 1;
};

export const currentHarvestSeason = (now = new Date()): string => String(getSeasonStartYear(now));

export const getSeasonBounds = (seasonStartYear: number): SeasonBounds => {
  const from = new Date(Date.UTC(seasonStartYear, SEASON_START_MONTH - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(seasonStartYear + 1, SEASON_START_MONTH - 1, 1, 0, 0, 0, 0));
  to.setUTCMilliseconds(to.getUTCMilliseconds() - 1);
  return { seasonStartYear, from, to };
};

export const formatSeasonLabel = (seasonStartYear: number): string =>
  `${seasonStartYear}/${seasonStartYear + 1}`;

export const isDateInSeason = (value: string | Date | null | undefined, bounds: SeasonBounds): boolean => {
  if (!value) return false;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const t = d.getTime();
  return t >= bounds.from.getTime() && t <= bounds.to.getTime();
};

export const isSeasonEnded = (seasonStartYear: number, now = new Date()): boolean => {
  const { to } = getSeasonBounds(seasonStartYear);
  return now.getTime() > to.getTime();
};

export const listRecentSeasonYears = (count = 8, now = new Date()): number[] => {
  const current = getSeasonStartYear(now);
  return Array.from({ length: count }, (_, i) => current - i);
};

export const overlappingCalendarYears = (seasonStartYear: number): string[] => [
  String(seasonStartYear),
  String(seasonStartYear + 1),
];
