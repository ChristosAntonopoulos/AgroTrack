/** Olive cultivation season: 1 Sep Y → 31 Aug Y+1 (aligned with Chronologio). */

export const SEASON_START_MONTH = 9; // September

export interface SeasonBounds {
  seasonStartYear: number;
  from: Date;
  to: Date;
}

/** Season start year for a date (Sep–Dec → same year; Jan–Aug → previous year). */
export const getSeasonStartYear = (now = new Date()): number => {
  const d = new Date(now);
  return d.getMonth() + 1 >= SEASON_START_MONTH ? d.getFullYear() : d.getFullYear() - 1;
};

/** Label key used in UI: season start year as string, e.g. "2025". */
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

/** Season is closed when its end date is in the past. */
export const isSeasonEnded = (seasonStartYear: number, now = new Date()): boolean => {
  const { to } = getSeasonBounds(seasonStartYear);
  return now.getTime() > to.getTime();
};

/** Current open season start year (always the in-progress cultivation season). */
export const getOpenSeasonStartYear = (now = new Date()): number => getSeasonStartYear(now);

/** Build a list of recent season start years for pickers (newest first). */
export const listRecentSeasonYears = (count = 8, now = new Date()): number[] => {
  const current = getSeasonStartYear(now);
  return Array.from({ length: count }, (_, i) => current - i);
};
