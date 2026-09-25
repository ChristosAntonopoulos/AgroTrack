import { athensCalendarDateKey, shiftAthensDateKey } from '../utils/athensDate';
import type { HarvestCampaign } from './types';
import type { HarvestDaySummary } from './totals';
import { daySummary } from './totals';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const isAthensDateKey = (value?: string | null): value is string =>
  Boolean(value && DATE_KEY.test(value));

/** Earliest day the farmer can log: campaign start, or today if not started. */
export const campaignStartDay = (campaign: HarvestCampaign, today: string): string => {
  if (!campaign.startedAt) return today;
  const start = athensCalendarDateKey(campaign.startedAt);
  return start <= today ? start : today;
};

/** Clamp a requested day into [campaign start, today]. Invalid keys fall back to today. */
export const clampHarvestWorkingDay = (
  requested: string | null | undefined,
  campaign: HarvestCampaign,
  today: string
): string => {
  const start = campaignStartDay(campaign, today);
  if (!isAthensDateKey(requested)) return today;
  if (requested > today) return today;
  if (requested < start) return start;
  return requested;
};

export const shiftHarvestWorkingDay = (
  current: string,
  delta: -1 | 1,
  _campaign: HarvestCampaign,
  today: string
): string => clampHarvestNavDay(shiftAthensDateKey(current, delta), today);

export const harvestWorkingDayHasActivity = (row: HarvestDaySummary): boolean =>
  row.sacks > 0 ||
  row.officialKg > 0 ||
  row.people > 0 ||
  row.expenseEur > 0 ||
  row.oilKg > 0 ||
  row.photos > 0 ||
  row.closed;

/** How many calendar days to show on each side of the open day, and per extra page. */
export const HARVEST_STRIP_STEP = 5;

/** How far before and after today the row can keep loading. */
export const HARVEST_STRIP_HISTORY_DAYS = 370;

export const harvestStripFloor = (today: string): string =>
  shiftAthensDateKey(today, -HARVEST_STRIP_HISTORY_DAYS);

export const harvestStripCeiling = (today: string): string =>
  shiftAthensDateKey(today, HARVEST_STRIP_HISTORY_DAYS);

/** Clamp navigation to real calendar days, including days before the harvest and days after today. */
export const clampHarvestNavDay = (
  requested: string | null | undefined,
  today: string
): string => {
  const floor = harvestStripFloor(today);
  const ceiling = harvestStripCeiling(today);
  if (!isAthensDateKey(requested)) return today;
  if (requested > ceiling) return ceiling;
  if (requested < floor) return floor;
  return requested;
};

export type HarvestStripBounds = { from: string; to: string };

const walkHarvestDate = (
  from: string,
  steps: number,
  limit: string,
  direction: -1 | 1
): string => {
  let cursor = from;
  for (let i = 0; i < steps; i += 1) {
    const next = shiftAthensDateKey(cursor, direction);
    if (direction < 0 && next < limit) return limit;
    if (direction > 0 && next > limit) return limit;
    cursor = next;
  }
  return cursor;
};

/** Five real calendar days before and after the open day, including days after today. */
export const harvestStripWindow = (
  selectedDay: string,
  _campaign: HarvestCampaign,
  today: string,
  radius = HARVEST_STRIP_STEP
): HarvestStripBounds => {
  const floor = harvestStripFloor(today);
  const ceiling = harvestStripCeiling(today);
  const day = clampHarvestNavDay(selectedDay, today);
  return {
    from: walkHarvestDate(day, radius, floor, -1),
    to: walkHarvestDate(day, radius, ceiling, 1),
  };
};

/** Add another page of calendar days in one direction. Stops about a year from today. */
export const extendHarvestStripBounds = (
  bounds: HarvestStripBounds,
  direction: -1 | 1,
  _campaign: HarvestCampaign,
  today: string,
  step = HARVEST_STRIP_STEP
): HarvestStripBounds => {
  const floor = harvestStripFloor(today);
  const ceiling = harvestStripCeiling(today);
  const from = bounds.from < floor ? floor : bounds.from;
  const to = bounds.to > ceiling ? ceiling : bounds.to;
  if (direction < 0) {
    if (from <= floor) return { from, to };
    return { from: walkHarvestDate(from, step, floor, -1), to };
  }
  if (to >= ceiling) return { from, to };
  return { from, to: walkHarvestDate(to, step, ceiling, 1) };
};

/** Inclusive calendar days inside the strip window. */
export const harvestDayStripDates = (
  _campaign: HarvestCampaign,
  today: string,
  bounds: HarvestStripBounds
): string[] => {
  const floor = harvestStripFloor(today);
  const ceiling = harvestStripCeiling(today);
  let cursor = bounds.from < floor ? floor : bounds.from;
  const end = bounds.to > ceiling ? ceiling : bounds.to;
  if (cursor > end) return [end];
  const dates: string[] = [];
  while (cursor <= end) {
    dates.push(cursor);
    cursor = shiftAthensDateKey(cursor, 1);
  }
  return dates;
};

export const harvestDayStripRows = (
  campaign: HarvestCampaign,
  today: string,
  bounds: HarvestStripBounds
): HarvestDaySummary[] =>
  harvestDayStripDates(campaign, today, bounds).map((date) => daySummary(campaign, date));
