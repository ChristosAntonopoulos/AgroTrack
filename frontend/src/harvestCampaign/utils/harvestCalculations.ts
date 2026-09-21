import { formatGroveLitres, formatGroveMassKg, oilYieldPercent } from '../../utils/groveTotals';
import { localeTagFor } from '../../utils/localeFormatters';

/**
 * Typical olive-oil density used for rough litre → kg conversion in the field.
 * This is an estimate for farmer UX, not lab precision.
 */
export const OLIVE_OIL_KG_PER_LITRE = 0.916;

export type HarvestOilUnit = 'kg' | 'litres';

export const convertOliveOilLitresToKg = (litres: number): number => {
  if (!Number.isFinite(litres) || litres < 0) return 0;
  return litres * OLIVE_OIL_KG_PER_LITRE;
};

export const oilKgFromAmount = (amount: number, unit: HarvestOilUnit): number => {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return unit === 'litres' ? convertOliveOilLitresToKg(amount) : amount;
};

export const extractionYieldPercent = (oliveKg: number, oilKg: number): number | null =>
  oilYieldPercent(oliveKg, oilKg);

export const estimateSacksKg = (sacks: number, kgPerSack: number): number => {
  if (!(sacks > 0) || !(kgPerSack > 0)) return 0;
  return sacks * kgPerSack;
};

export const formatHarvestYieldPercent = (
  pct: number | null | undefined,
  locale: string,
  unknownLabel = '—'
): string => {
  if (pct == null || !Number.isFinite(pct)) return unknownLabel;
  const rounded = Math.round(pct * 10) / 10;
  return new Intl.NumberFormat(localeTagFor(locale), {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
  }).format(rounded);
};

export const formatHarvestOilAmount = (
  amount: number | null | undefined,
  unit: HarvestOilUnit,
  locale: string,
  unknownLabel = '—'
): string => {
  if (unit === 'litres') return formatGroveLitres(amount, locale, unknownLabel);
  return formatGroveMassKg(amount, locale, unknownLabel);
};
