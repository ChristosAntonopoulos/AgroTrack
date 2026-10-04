import type { HarvestCampaign } from './types';

/** Campaign restricted to a single calendar day (for Fields flow in Chronologio peek). */
export const filterCampaignToDay = (campaign: HarvestCampaign, date: string): HarvestCampaign => ({
  ...campaign,
  sacks: campaign.sacks.filter((row) => row.date === date),
  millWeights: campaign.millWeights.filter((row) => row.date === date),
  oils: campaign.oils.filter((row) => row.date === date),
  peopleLogs: campaign.peopleLogs.filter((row) => row.date === date),
  expenses: campaign.expenses.filter((row) => row.date === date),
  incomes: (campaign.incomes || []).filter((row) => row.date === date),
  notes: campaign.notes.filter((row) => row.date === date),
  closedDays: campaign.closedDays.filter((d) => d === date),
});

export const campaignDayHasFlow = (campaign: HarvestCampaign): boolean =>
  campaign.sacks.length > 0 ||
  campaign.millWeights.length > 0 ||
  campaign.oils.length > 0 ||
  campaign.peopleLogs.length > 0;
