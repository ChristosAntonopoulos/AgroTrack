import { FinancialBucket } from '../services/financialEntryService';

export const FINANCIAL_CATEGORIES = [
  'labor',
  'fertilizers',
  'treatments',
  'irrigation_water',
  'electricity_fuel',
  'equipment',
  'repairs',
  'pruning',
  'harvest_workers',
  'mill_cost',
  'transport',
  'packaging',
  'storage',
  'agronomist',
  'other',
] as const;

export type FinancialCategoryId = (typeof FINANCIAL_CATEGORIES)[number];

export const CATEGORY_TO_BUCKET: Record<FinancialCategoryId, FinancialBucket> = {
  labor: 'labor',
  pruning: 'labor',
  fertilizers: 'inputs',
  treatments: 'inputs',
  irrigation_water: 'inputs',
  electricity_fuel: 'inputs',
  equipment: 'inputs',
  repairs: 'inputs',
  harvest_workers: 'harvest',
  mill_cost: 'harvest',
  transport: 'harvest',
  packaging: 'harvest',
  storage: 'harvest',
  agronomist: 'other',
  other: 'other',
};

export const CATEGORY_TO_PNL_KEY: Record<FinancialCategoryId, string> = {
  labor: 'labor',
  fertilizers: 'fertilizers',
  treatments: 'treatments',
  irrigation_water: 'irrigationWater',
  electricity_fuel: 'electricityFuel',
  equipment: 'equipment',
  repairs: 'repairs',
  pruning: 'pruning',
  harvest_workers: 'harvestWorkers',
  mill_cost: 'millCost',
  transport: 'transport',
  packaging: 'packaging',
  storage: 'storage',
  agronomist: 'agronomist',
  other: 'other',
};
