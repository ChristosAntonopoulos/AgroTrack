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
  campaign: HarvestCampaign,
  today: string
): string => clampHarvestWorkingDay(shiftAthensDateKey(current, delta), campaign, today);

export const harvestWorkingDayHasActivity = (row: HarvestDaySummary): boolean =>
  row.sacks > 0 ||
  row.officialKg > 0 ||
  row.people > 0 ||
  row.expenseEur > 0 ||
  row.oilKg > 0 ||
  row.photos > 0 ||
  row.closed;

/** Days to show in the strip: every choosable day from campaign start through today. */
export const harvestDayStripDates = (campaign: HarvestCampaign, today: string): string[] => {
  const start = campaignStartDay(campaign, today);
  if (start > today) return [today];
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= today) {
    dates.push(cursor);
    cursor = shiftAthensDateKey(cursor, 1);
  }
  return dates;
};

export const harvestDayStripRows = (
  campaign: HarvestCampaign,
  today: string
): HarvestDaySummary[] =>
  harvestDayStripDates(campaign, today).map((date) => daySummary(campaign, date));
