import type { OilPack } from '../services/oilStockService';

const round1 = (value: number) => Math.round(value * 10) / 10;

export const formatOilPack = (
  pack: Pick<OilPack, 'tin16' | 'tin17' | 'bulkLitres' | 'litres'>,
  labels: {
    tin: (count: number, size: number) => string;
    bulk: (litres: number) => string;
    litres: (litres: number) => string;
  }
): string => {
  const bits: string[] = [];
  if (pack.tin16 > 0) bits.push(labels.tin(pack.tin16, 16));
  if (pack.tin17 > 0) bits.push(labels.tin(pack.tin17, 17));
  if (pack.bulkLitres > 0.05) bits.push(labels.bulk(round1(pack.bulkLitres)));
  if (bits.length === 0) return labels.litres(round1(pack.litres || 0));
  return bits.join(' · ');
};

export const packIsEmpty = (pack: Pick<OilPack, 'tin16' | 'tin17' | 'bulkLitres'>): boolean =>
  pack.tin16 <= 0 && pack.tin17 <= 0 && pack.bulkLitres <= 0.05;
