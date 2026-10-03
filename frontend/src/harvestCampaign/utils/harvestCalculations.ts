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

/** Farmer-facing oil is always litres, even when the lot was stored in kilograms. */
export const convertOliveOilKgToLitres = (kg: number): number => {
  if (!Number.isFinite(kg) || kg <= 0) return 0;
  return kg / OLIVE_OIL_KG_PER_LITRE;
};

/** Numeric litres only — pair with a separate unit label (λίτρα). */
export const formatOilLitresAmountFromKg = (kg: number, locale = 'el'): string => {
  const litres = convertOliveOilKgToLitres(kg);
  if (litres <= 0) return '—';
  if (litres >= 100) return String(Math.round(litres));
  const rounded = Math.round(litres * 10) / 10;
  return new Intl.NumberFormat(localeTagFor(locale), { maximumFractionDigits: 1 }).format(rounded);
};

export const oilKgFromAmount = (amount: number, unit: HarvestOilUnit): number => {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return unit === 'litres' ? convertOliveOilLitresToKg(amount) : amount;
};

export const extractionYieldPercent = (oliveKg: number, oilKg: number): number | null =>
  oilYieldPercent(oliveKg, oilKg);

/** Typical olive oil extraction; hide absurd % (e.g. oil kg > olives). */
export const plausibleOilYield = (pct: number | null | undefined): number | null => {
  if (pct == null || !Number.isFinite(pct)) return null;
  if (pct < 5 || pct > 40) return null;
  return pct;
};

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

export const TIN_16_LITRES = 16;
export const TIN_17_LITRES = 17;

export type OilSplitPartKey = 'stored' | 'tin16' | 'tin17' | 'bulk' | 'mill';

export type OilSplitPart = {
  key: OilSplitPartKey;
  /** Amount in the same unit as the total. */
  amount: number;
  /** Share of the whole oil quantity, 0–100. */
  percent: number;
};

export type OilSettlement = {
  total: number;
  unit: HarvestOilUnit;
  millAmount: number;
  farmerAmount: number;
  tin16Amount: number;
  tin17Amount: number;
  bulkAmount: number;
  /** Tins larger than the oil left after the mill's share. */
  overAmount: number;
  /** Mill share larger than the total. */
  millOver: boolean;
  parts: OilSplitPart[];
};

const roundOil = (value: number) => Math.round(value * 1000) / 1000;

export const litresToOilUnit = (litres: number, unit: HarvestOilUnit): number => {
  if (!Number.isFinite(litres) || litres < 0) return 0;
  return unit === 'kg' ? convertOliveOilLitresToKg(litres) : litres;
};

export const readOilTinCounts = (entry: {
  tin16Count?: number;
  tin17Count?: number;
  tinSizeLitres?: 16 | 17;
  tinCount?: number;
}): { tin16: number; tin17: number } => ({
  tin16: entry.tin16Count ?? (entry.tinSizeLitres === 16 ? entry.tinCount ?? 0 : 0),
  tin17: entry.tin17Count ?? (entry.tinSizeLitres === 17 ? entry.tinCount ?? 0 : 0),
});

/**
 * Split one oil total into what the mill kept and how the farmer stored the rest.
 * Tin sizes are litres; they convert into kilograms when the total is in kg.
 */
export const settleOil = (input: {
  total: number;
  unit: HarvestOilUnit;
  millKept: number;
  millMode: 'amount' | 'percent';
  tin16Count: number;
  tin17Count: number;
  splitTins: boolean;
}): OilSettlement => {
  const total = roundOil(Math.max(0, input.total || 0));
  const millRaw = Math.max(0, input.millKept || 0);
  const millOver = input.millMode === 'percent' ? millRaw > 100 : millRaw > total + 1e-6;
  const millAmount = millOver
    ? roundOil(input.millMode === 'percent' ? (total * millRaw) / 100 : millRaw)
    : roundOil(input.millMode === 'percent' ? (total * millRaw) / 100 : Math.min(millRaw, total));
  const farmerAmount = millOver ? 0 : roundOil(Math.max(0, total - millAmount));
  const tin16Amount = input.splitTins
    ? roundOil(litresToOilUnit(Math.max(0, input.tin16Count) * TIN_16_LITRES, input.unit))
    : 0;
  const tin17Amount = input.splitTins
    ? roundOil(litresToOilUnit(Math.max(0, input.tin17Count) * TIN_17_LITRES, input.unit))
    : 0;
  const tins = roundOil(tin16Amount + tin17Amount);
  const overAmount = roundOil(Math.max(0, tins - farmerAmount));
  const bulkAmount = overAmount > 0 ? 0 : roundOil(Math.max(0, farmerAmount - tins));
  const percent = (amount: number) => (total > 0 ? (amount / total) * 100 : 0);
  const parts: OilSplitPart[] = [];
  if (!input.splitTins && farmerAmount > 0) {
    parts.push({ key: 'stored', amount: farmerAmount, percent: percent(farmerAmount) });
  }
  if (input.splitTins && tin16Amount > 0) {
    parts.push({ key: 'tin16', amount: tin16Amount, percent: percent(tin16Amount) });
  }
  if (input.splitTins && tin17Amount > 0) {
    parts.push({ key: 'tin17', amount: tin17Amount, percent: percent(tin17Amount) });
  }
  if (input.splitTins && bulkAmount > 0) {
    parts.push({ key: 'bulk', amount: bulkAmount, percent: percent(bulkAmount) });
  }
  parts.push({ key: 'mill', amount: millAmount, percent: percent(millAmount) });
  return {
    total,
    unit: input.unit,
    millAmount,
    farmerAmount,
    tin16Amount,
    tin17Amount,
    bulkAmount,
    overAmount,
    millOver,
    parts,
  };
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

/** Amount with its unit. Litres already include “L”; kilograms get a “kg” suffix. */
export const formatHarvestOilAmountLabel = (
  amount: number | null | undefined,
  unit: HarvestOilUnit,
  locale: string,
  unknownLabel = '—'
): string => {
  const formatted = formatHarvestOilAmount(amount, unit, locale, unknownLabel);
  if (formatted === unknownLabel || unit === 'litres') return formatted;
  return `${formatted} kg`;
};
