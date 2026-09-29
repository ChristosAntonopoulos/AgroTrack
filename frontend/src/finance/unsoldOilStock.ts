import { agriculturalYearFor } from '../chronologio/agriculturalYear';
import { saleableOilLots } from '../harvestCampaign/oilSaleLots';
import { loadCampaign } from '../harvestCampaign/storage';
import type { HarvestCampaign } from '../harvestCampaign/types';
import { listRecentSeasonYears } from '../utils/harvestSeason';

/** How many past seasons to scan for oil still in the cellar. Keep in sync with mobile/src/finance/unsoldOilStock.ts. */
const SEASONS_TO_SCAN = 8;

/** Oil still unsold from one pressing. Litres are the farmer's share after sales. */
export type UnsoldOilLot = {
  id: string;
  date: string;
  /** Agricultural year of the pressing, matching the Money year switcher. */
  harvestYear: number;
  fieldIds: string[];
  litres: number;
  tin16: number;
  tin17: number;
  bulkLitres: number;
};

export type UnsoldOilTotals = {
  litres: number;
  tin16: number;
  tin17: number;
  bulkLitres: number;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

const harvestYearOf = (date: string, fallback: number): number => {
  try {
    const year = agriculturalYearFor(date);
    return Number.isFinite(year) ? year : fallback;
  } catch {
    return fallback;
  }
};

/** Unsold lots across campaigns, newest pressing first. Fully sold lots are left out. */
export const unsoldOilFromCampaigns = (campaigns: HarvestCampaign[]): UnsoldOilLot[] => {
  const rows: UnsoldOilLot[] = [];
  for (const campaign of campaigns) {
    for (const lot of saleableOilLots(campaign)) {
      if (lot.sold || lot.litres <= 0.05) continue;
      const hasPack = lot.pack.tin16 > 0 || lot.pack.tin17 > 0 || lot.pack.bulkLitres > 0.05;
      rows.push({
        id: `${campaign.seasonStartYear}:${lot.id}`,
        date: lot.date,
        harvestYear: harvestYearOf(lot.date, campaign.seasonStartYear),
        fieldIds: lot.fieldIds,
        litres: lot.litres,
        tin16: lot.pack.tin16,
        tin17: lot.pack.tin17,
        bulkLitres: hasPack ? lot.pack.bulkLitres : lot.litres,
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
};

export const sumUnsoldOil = (lots: UnsoldOilLot[]): UnsoldOilTotals => ({
  litres: round1(lots.reduce((sum, lot) => sum + lot.litres, 0)),
  tin16: lots.reduce((sum, lot) => sum + lot.tin16, 0),
  tin17: lots.reduce((sum, lot) => sum + lot.tin17, 0),
  bulkLitres: round1(lots.reduce((sum, lot) => sum + lot.bulkLitres, 0)),
});

export const groupUnsoldOil = (lots: UnsoldOilLot[], year: number) => {
  const thisYear = lots.filter((lot) => lot.harvestYear === year);
  const byYear = new Map<number, UnsoldOilLot[]>();
  for (const lot of lots) {
    if (lot.harvestYear === year) continue;
    const list = byYear.get(lot.harvestYear) ?? [];
    list.push(lot);
    byYear.set(lot.harvestYear, list);
  }
  const otherYears = [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([harvestYear, rows]) => ({ harvestYear, lots: rows }));
  return { thisYear, otherYears };
};

/** Keep lots for the selected field. A shared lot stays whole when any of its fields match. */
export const filterUnsoldOilLots = (
  lots: UnsoldOilLot[],
  fieldId?: string | null,
  unassignedId = '__unassigned__'
): UnsoldOilLot[] => {
  if (!fieldId) return lots;
  if (fieldId === unassignedId) return lots.filter((lot) => lot.fieldIds.length === 0);
  return lots.filter((lot) => lot.fieldIds.includes(fieldId));
};

export const loadUnsoldOilLots = (userId: string, now = new Date()): UnsoldOilLot[] => {
  if (!userId) return [];
  const campaigns = listRecentSeasonYears(SEASONS_TO_SCAN, now).map((season) =>
    loadCampaign(userId, season)
  );
  return unsoldOilFromCampaigns(campaigns);
};
