import type { OilPack } from '../services/oilStockService';

export type OilPackInput = {
  tin16: number;
  tin17: number;
  bulkLitres: number;
};

export const emptyOilPackInput = (): OilPackInput => ({ tin16: 0, tin17: 0, bulkLitres: 0 });

export const packLitresOf = (pack: OilPackInput): number =>
  Math.round((pack.tin16 * 16 + pack.tin17 * 17 + pack.bulkLitres) * 10) / 10;

/** True when a typed quantity is above the stock that can be taken. */
export const packExceedsAvailable = (pack: OilPackInput, max?: OilPack | null): boolean => {
  if (!max) return false;
  return (
    pack.tin16 > Math.max(0, max.tin16) ||
    pack.tin17 > Math.max(0, max.tin17) ||
    pack.bulkLitres > Math.max(0, max.bulkLitres) + 0.05
  );
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
