import { athensHour, shiftAthensDateKey } from '../utils/athensDate';
import { isHarvestLive, type HarvestCampaign } from './types';
import { daySummary } from './totals';

export const HARVEST_EVENING_HOUR = 17;

export type HarvestEveningNudge = {
  date: string;
  kind: 'today' | 'yesterday';
};

const dayHasActivity = (campaign: HarvestCampaign, date: string): boolean => {
  const row = daySummary(campaign, date);
  return (
    row.sacks > 0 ||
    row.officialKg > 0 ||
    row.people > 0 ||
    row.expenseEur > 0 ||
    row.oilKg > 0 ||
    row.photos > 0
  );
};

export const harvestEveningNudge = (
  campaign: HarvestCampaign,
  today: string,
  now: Date = new Date()
): HarvestEveningNudge | null => {
  if (!isHarvestLive(campaign.status)) return null;

  const hour = athensHour(now);
  const evening = hour >= HARVEST_EVENING_HOUR;
  const todayClosed = campaign.closedDays.includes(today);
  const yesterday = shiftAthensDateKey(today, -1);
  const yesterdayClosed = campaign.closedDays.includes(yesterday);
  const yesterdayWorked = dayHasActivity(campaign, yesterday);

  if (evening && !todayClosed) {
    return { date: today, kind: 'today' };
  }

  if (!yesterdayClosed && yesterdayWorked) {
    return { date: yesterday, kind: 'yesterday' };
  }

  return null;
};
