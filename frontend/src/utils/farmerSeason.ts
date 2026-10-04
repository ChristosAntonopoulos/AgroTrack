import { athensParts } from './athensDate';

/**
 * Farmer-facing agricultural stage labels for the Tasks page context strip.
 * Orthogonal to FieldTask status — never use these as task statuses.
 * Chronologio's four-stage track is separate; aligning them is a follow-up.
 */
export type FarmerSeasonId =
  | 'afterHarvest'
  | 'winterCare'
  | 'springGrowth'
  | 'summerProtection'
  | 'harvestPrep'
  | 'harvest';

export type FarmerSeason = {
  id: FarmerSeasonId;
  labelKey: string;
};

const SEASONS: Record<FarmerSeasonId, FarmerSeason> = {
  afterHarvest: { id: 'afterHarvest', labelKey: 'fieldWork.season.afterHarvest' },
  winterCare: { id: 'winterCare', labelKey: 'fieldWork.season.winterCare' },
  springGrowth: { id: 'springGrowth', labelKey: 'fieldWork.season.springGrowth' },
  summerProtection: { id: 'summerProtection', labelKey: 'fieldWork.season.summerProtection' },
  harvestPrep: { id: 'harvestPrep', labelKey: 'fieldWork.season.harvestPrep' },
  harvest: { id: 'harvest', labelKey: 'fieldWork.season.harvest' },
};

/**
 * Six-label presentation from calendar month (+ optional harvest campaign).
 * Dec–Jan → winter care; Feb–Mar → after harvest; Apr–May → spring;
 * Jun–Jul → summer; Aug–Sep → harvest prep; Oct–Nov → harvest.
 */
export const farmerSeasonFor = (
  now = new Date(),
  options?: { harvestActive?: boolean }
): FarmerSeason => {
  const month = athensParts(now).month;
  if (options?.harvestActive && month >= 10 && month <= 12) return SEASONS.harvest;
  if (month === 12 || month === 1) return SEASONS.winterCare;
  if (month >= 2 && month <= 3) return SEASONS.afterHarvest;
  if (month >= 4 && month <= 5) return SEASONS.springGrowth;
  if (month >= 6 && month <= 7) return SEASONS.summerProtection;
  if (month >= 8 && month <= 9) return SEASONS.harvestPrep;
  return SEASONS.harvest;
};
