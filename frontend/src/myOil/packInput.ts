import type { OilPack } from '../services/oilStockService';

export type OilPackInput = {
  tin16: number;
  tin17: number;
  bulkLitres: number;
};

export const emptyOilPackInput = (): OilPackInput => ({ tin16: 0, tin17: 0, bulkLitres: 0 });

export const packLitresOf = (pack: OilPackInput): number =>
  Math.round((pack.tin16 * 16 + pack.tin17 * 17 + pack.bulkLitres) * 10) / 10;

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * 16 L and 17 L stay tins. Litres in any other size stay in the loose remainder
 * so the typed total is what lands in storage.
 */
export const packFromSplit = (
  totalLitres: number,
  mode: 'all' | 'tins',
  counts: Record<number, number>
): OilPackInput => {
  if (mode !== 'tins') {
    return { tin16: 0, tin17: 0, bulkLitres: round1(Math.max(0, totalLitres)) };
  }
  const tin16 = Math.max(0, Math.round(counts[16] || 0));
  const tin17 = Math.max(0, Math.round(counts[17] || 0));
  const named = tin16 * 16 + tin17 * 17;
  return {
    tin16,
    tin17,
    bulkLitres: round1(Math.max(0, totalLitres - named)),
  };
};

export const clampPackInput = (pack: OilPackInput, max?: OilPack): OilPackInput => {
  if (!max) {
    return {
      tin16: Math.max(0, Math.round(pack.tin16)),
      tin17: Math.max(0, Math.round(pack.tin17)),
      bulkLitres: Math.max(0, Math.round(pack.bulkLitres * 10) / 10),
    };
  }
  return {
    tin16: Math.min(max.tin16, Math.max(0, Math.round(pack.tin16))),
    tin17: Math.min(max.tin17, Math.max(0, Math.round(pack.tin17))),
    bulkLitres: Math.min(max.bulkLitres, Math.max(0, Math.round(pack.bulkLitres * 10) / 10)),
  };
};
