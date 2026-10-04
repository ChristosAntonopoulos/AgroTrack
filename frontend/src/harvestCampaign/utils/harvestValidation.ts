import { parseDecimal } from '../../finance/quantityCalculator';

export const parseHarvestDecimal = (raw: string | null | undefined): number | null =>
  parseDecimal(raw);

export const isPositiveAmount = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value) && value > 0;

export const clampMin = (value: number, min: number): number =>
  Number.isFinite(value) ? Math.max(min, value) : min;
