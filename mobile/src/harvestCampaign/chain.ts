import { unconfirmedSacks } from './storage';
import { oilAmountToKg } from './totals';
import type {
  HarvestCampaign,
  HarvestMillWeightEntry,
  HarvestSackEntry,
} from './types';

export type PendingSacksDayGroup = {
  date: string;
  sacks: HarvestSackEntry[];
  sackCount: number;
  fieldIds: string[];
};

/** Unweighed sacks grouped by date (newest first). */
export const pendingSacksByDay = (
  campaign: HarvestCampaign,
  fieldIds?: string[]
): PendingSacksDayGroup[] => {
  const pending = unconfirmedSacks(campaign, fieldIds);
  const byDate = new Map<string, HarvestSackEntry[]>();
  for (const sack of pending) {
    const list = byDate.get(sack.date) || [];
    list.push(sack);
    byDate.set(sack.date, list);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, sacks]) => ({
      date,
      sacks,
      sackCount: sacks.reduce((sum, row) => sum + row.sacks, 0),
      fieldIds: [...new Set(sacks.map((row) => row.fieldId))],
    }));
};

export const pendingSackTotal = (campaign: HarvestCampaign, fieldIds?: string[]) =>
  unconfirmedSacks(campaign, fieldIds).reduce((sum, row) => sum + row.sacks, 0);

/** Mill tickets that still need oil (unless an oil entry covers the whole harvest). */
export const millsNeedingOil = (campaign: HarvestCampaign): HarvestMillWeightEntry[] => {
  if (campaign.oils.some((row) => row.millWeightIds.length === 0)) return [];
  const covered = new Set(campaign.oils.flatMap((row) => row.millWeightIds));
  return campaign.millWeights
    .filter((row) => !covered.has(row.id))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
};

export const millKgNeedingOil = (campaign: HarvestCampaign) =>
  millsNeedingOil(campaign).reduce((sum, row) => sum + row.kg, 0);

/**
 * Suggest which pending sacks to include in a mill ticket on `asOfDate`.
 * - Prefer last 3 harvest days that still have pending sacks
 * - Never include sacks dated after the mill day
 */
export const suggestMillIncludes = (
  campaign: HarvestCampaign,
  asOfDate: string,
  fieldIds?: string[]
): HarvestSackEntry[] => {
  const pending = unconfirmedSacks(campaign, fieldIds).filter((sack) => sack.date <= asOfDate);
  if (pending.length === 0) return [];

  const days = [...new Set(pending.map((s) => s.date))].sort((a, b) => b.localeCompare(a));
  const window = new Set(days.slice(0, 3));
  const suggested = pending.filter((sack) => window.has(sack.date));
  return suggested.length > 0 ? suggested : pending;
};

export const dateRangeLabel = (dates: string[]): string | null => {
  const unique = [...new Set(dates.filter(Boolean))].sort();
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  return `${unique[0]}–${unique[unique.length - 1]}`;
};

export type HarvestChainStatus = {
  pendingSackCount: number;
  pendingSackDays: string[];
  pendingSackIds: string[];
  millKgWithoutOil: number;
  millsWithoutOil: HarvestMillWeightEntry[];
  latestCompleteYield: number | null;
  latestCompleteMillKg: number | null;
  latestCompleteOilKg: number | null;
};

/** Season-level open links for the Day tab chain card. */
export const harvestChainStatus = (campaign: HarvestCampaign): HarvestChainStatus => {
  const pending = unconfirmedSacks(campaign);
  const mills = millsNeedingOil(campaign);
  const covered = new Set(campaign.oils.flatMap((row) => row.millWeightIds));
  let latestCompleteYield: number | null = null;
  let latestCompleteMillKg: number | null = null;
  let latestCompleteOilKg: number | null = null;

  const oilsNewest = [...campaign.oils].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );
  for (const oil of oilsNewest) {
    const oilKg = oilAmountToKg(oil);
    const millKg =
      oil.millWeightIds.length > 0
        ? campaign.millWeights
            .filter((m) => oil.millWeightIds.includes(m.id))
            .reduce((sum, m) => sum + m.kg, 0)
        : campaign.millWeights.reduce((sum, m) => sum + m.kg, 0);
    if (millKg > 0 && oilKg > 0) {
      latestCompleteYield = (oilKg / millKg) * 100;
      latestCompleteMillKg = millKg;
      latestCompleteOilKg = oilKg;
      break;
    }
  }

  // Prefer a completed mill ticket over an oil-only estimate when available.
  const completedMills = [...campaign.millWeights]
    .filter((m) => covered.has(m.id) || campaign.oils.some((o) => o.millWeightIds.length === 0))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (completedMills[0] && latestCompleteYield == null) {
    const mill = completedMills[0];
    const oil = campaign.oils.find(
      (o) => o.millWeightIds.includes(mill.id) || o.millWeightIds.length === 0
    );
    if (oil) {
      const oilKg = oilAmountToKg(oil);
      if (mill.kg > 0 && oilKg > 0) {
        latestCompleteYield = (oilKg / mill.kg) * 100;
        latestCompleteMillKg = mill.kg;
        latestCompleteOilKg = oilKg;
      }
    }
  }

  return {
    pendingSackCount: pending.reduce((sum, row) => sum + row.sacks, 0),
    pendingSackDays: [...new Set(pending.map((s) => s.date))].sort(),
    pendingSackIds: pending.map((s) => s.id),
    millKgWithoutOil: mills.reduce((sum, row) => sum + row.kg, 0),
    millsWithoutOil: mills,
    latestCompleteYield,
    latestCompleteMillKg,
    latestCompleteOilKg,
  };
};

export const formatDaySpan = (dates: string[], locale: string): string => {
  const unique = [...new Set(dates.filter(Boolean))].sort();
  if (unique.length === 0) return '';
  const fmt = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
    });
  if (unique.length === 1) return fmt(unique[0]);
  return `${fmt(unique[0])}–${fmt(unique[unique.length - 1])}`;
};
