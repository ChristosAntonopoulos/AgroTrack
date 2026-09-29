import type { OilPack } from '../services/oilStockService';

const round1 = (value: number) => Math.round(value * 10) / 10;

export const formatOilNumber = (value: number, locale: string): string => {
  const n = round1(value);
  const isInt = Math.abs(n - Math.round(n)) < 0.05;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: isInt ? 0 : 1,
    minimumFractionDigits: 0,
  }).format(isInt ? Math.round(n) : n);
};

export const formatOilLitres = (litres: number, locale: string): string =>
  `${formatOilNumber(litres, locale)} L`;

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

/** Hero line: "34 τενεκέδες + 1.180,5 L χύμα" */
export const formatHeroStock = (
  pack: Pick<OilPack, 'tin16' | 'tin17' | 'bulkLitres'>,
  locale: string,
  labels: {
    tins: (count: number) => string;
    bulkPlus: (amount: string) => string;
    bulkOnly: (amount: string) => string;
    empty: string;
  }
): string => {
  const tins = Math.max(0, pack.tin16) + Math.max(0, pack.tin17);
  const bulk = round1(pack.bulkLitres);
  if (tins <= 0 && bulk <= 0.05) return labels.empty;
  if (tins > 0 && bulk > 0.05) {
    return `${labels.tins(tins)} + ${labels.bulkPlus(formatOilNumber(bulk, locale))}`;
  }
  if (tins > 0) return labels.tins(tins);
  return labels.bulkOnly(formatOilNumber(bulk, locale));
};

export const packIsEmpty = (pack: Pick<OilPack, 'tin16' | 'tin17' | 'bulkLitres'>): boolean =>
  pack.tin16 <= 0 && pack.tin17 <= 0 && pack.bulkLitres <= 0.05;
