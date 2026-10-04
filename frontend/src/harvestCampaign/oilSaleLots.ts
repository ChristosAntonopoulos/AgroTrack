import type { HarvestCampaign, HarvestOilEntry } from './types';
import {
  OLIVE_OIL_KG_PER_LITRE,
  readOilTinCounts,
  settleOil,
  TIN_16_LITRES,
  TIN_17_LITRES,
} from './utils/harvestCalculations';

/** What the farmer stored and can sell from one oil lot, or from several combined. */
export type OilPackStock = {
  tin16: number;
  tin17: number;
  bulkLitres: number;
};

export const emptyOilPack = (): OilPackStock => ({ tin16: 0, tin17: 0, bulkLitres: 0 });

const round1 = (value: number) => Math.round(value * 10) / 10;

const toLitres = (amount: number, unit: HarvestOilEntry['unit']): number => {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return unit === 'litres' ? amount : amount / OLIVE_OIL_KG_PER_LITRE;
};

/** Oil the farmer can sell: what was made, minus what the mill kept. */
export type SaleableOilLot = {
  id: string;
  date: string;
  /** Litres still available to sell. */
  litres: number;
  /** Farmer litres before any sale. */
  farmerLitres: number;
  /** Litres already sold from this lot. */
  soldLitres: number;
  /** True when nothing is left to sell. */
  sold: boolean;
  fieldIds: string[];
  harvestRecordId?: string;
  harvestRecordIds: string[];
  /** Remaining pack (stored minus sold). */
  pack: OilPackStock;
};

export const farmerOilLitres = (entry: HarvestOilEntry): number => {
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) return 0;
  const kept = Number.isFinite(entry.millKept) ? Math.max(0, entry.millKept ?? 0) : 0;
  const farmer = Math.max(0, entry.amount - Math.min(kept, entry.amount));
  const litres = entry.unit === 'litres' ? farmer : farmer / OLIVE_OIL_KG_PER_LITRE;
  return Math.round(litres * 10) / 10;
};

export const oilSoldPack = (entry: HarvestOilEntry): OilPackStock => ({
  tin16: Math.max(0, Math.round(entry.soldTin16 ?? 0)),
  tin17: Math.max(0, Math.round(entry.soldTin17 ?? 0)),
  bulkLitres: round1(Math.max(0, entry.soldBulkLitres ?? 0)),
});

export const oilSoldLitres = (entry: HarvestOilEntry): number => {
  const recorded = Number.isFinite(entry.soldLitres) ? Math.max(0, entry.soldLitres ?? 0) : 0;
  if (recorded > 0) return round1(recorded);
  return packLitres(oilSoldPack(entry));
};

/** Tins the farmer counted, and the litres left as bulk. No tins means the whole lot is bulk. */
export const oilEntryPack = (entry: HarvestOilEntry): OilPackStock => {
  const counts = readOilTinCounts(entry);
  const split = counts.tin16 + counts.tin17 > 0;
  const settlement = settleOil({
    total: toLitres(entry.amount, entry.unit),
    unit: 'litres',
    millKept: toLitres(entry.millKept ?? 0, entry.unit),
    millMode: 'amount',
    tin16Count: counts.tin16,
    tin17Count: counts.tin17,
    splitTins: split,
  });
  return {
    tin16: split ? counts.tin16 : 0,
    tin17: split ? counts.tin17 : 0,
    bulkLitres: round1(Math.max(0, split ? settlement.bulkAmount : settlement.farmerAmount)),
  };
};

/** Stored pack minus what was already sold. */
export const remainingOilPack = (entry: HarvestOilEntry): OilPackStock => {
  const stored = oilEntryPack(entry);
  const sold = oilSoldPack(entry);
  return {
    tin16: Math.max(0, stored.tin16 - sold.tin16),
    tin17: Math.max(0, stored.tin17 - sold.tin17),
    bulkLitres: round1(Math.max(0, stored.bulkLitres - sold.bulkLitres)),
  };
};

export const combineOilPacks = (lots: Pick<SaleableOilLot, 'pack'>[]): OilPackStock => ({
  tin16: lots.reduce((sum, lot) => sum + lot.pack.tin16, 0),
  tin17: lots.reduce((sum, lot) => sum + lot.pack.tin17, 0),
  bulkLitres: round1(lots.reduce((sum, lot) => sum + lot.pack.bulkLitres, 0)),
});

export const packLitres = (pack: OilPackStock): number =>
  round1(pack.tin16 * TIN_16_LITRES + pack.tin17 * TIN_17_LITRES + pack.bulkLitres);

/** Keep one container inside what was stored and inside the oil those lots still hold. */
export const setPackAmount = (
  current: OilPackStock,
  stock: OilPackStock,
  availableLitres: number,
  key: keyof OilPackStock,
  raw: number
): OilPackStock => {
  const next: OilPackStock = { ...current };
  if (key === 'bulkLitres') {
    next.bulkLitres = round1(Math.min(stock.bulkLitres, Math.max(0, raw)));
  } else {
    next[key] = Math.min(stock[key], Math.max(0, Math.round(raw)));
  }
  const over = packLitres(next) - availableLitres;
  if (over > 0.05) {
    if (key === 'bulkLitres') next.bulkLitres = round1(Math.max(0, next.bulkLitres - over));
    else if (key === 'tin16') next.tin16 = Math.max(0, next.tin16 - Math.ceil(over / TIN_16_LITRES));
    else next.tin17 = Math.max(0, next.tin17 - Math.ceil(over / TIN_17_LITRES));
  }
  return next;
};

/** Sell everything stored, without going past the oil in the chosen lots. */
export const fillOilPack = (stock: OilPackStock, availableLitres: number): OilPackStock => {
  let tin16 = stock.tin16;
  let tin17 = stock.tin17;
  while (tin16 * TIN_16_LITRES + tin17 * TIN_17_LITRES > availableLitres + 0.05 && (tin16 > 0 || tin17 > 0)) {
    if (tin17 > 0) tin17 -= 1;
    else tin16 -= 1;
  }
  const used = tin16 * TIN_16_LITRES + tin17 * TIN_17_LITRES;
  return {
    tin16,
    tin17,
    bulkLitres: round1(Math.min(stock.bulkLitres, Math.max(0, availableLitres - used))),
  };
};

/** One grove id when the oil is from a single field; empty when several stay together. */
export const oilSaleFieldId = (lots: Pick<SaleableOilLot, 'fieldIds'>[]): string => {
  const ids = [...new Set(lots.flatMap((lot) => lot.fieldIds))];
  return ids.length === 1 ? ids[0] : '';
};

/**
 * Split a sold pack across chosen lots (greedy, lot order).
 * Each take stays inside that lot’s remaining pack and litres.
 */
export const allocateSoldPack = (
  lots: SaleableOilLot[],
  sold: OilPackStock
): { id: string; pack: OilPackStock }[] => {
  let left: OilPackStock = { ...sold };
  const out: { id: string; pack: OilPackStock }[] = [];
  for (const lot of lots) {
    if (packLitres(left) <= 0.05 || lot.litres <= 0) continue;
    const take: OilPackStock = {
      tin16: Math.min(lot.pack.tin16, left.tin16),
      tin17: Math.min(lot.pack.tin17, left.tin17),
      bulkLitres: 0,
    };
    left = {
      tin16: left.tin16 - take.tin16,
      tin17: left.tin17 - take.tin17,
      bulkLitres: left.bulkLitres,
    };
    const afterTins = lot.litres - take.tin16 * TIN_16_LITRES - take.tin17 * TIN_17_LITRES;
    take.bulkLitres = round1(
      Math.min(lot.pack.bulkLitres, left.bulkLitres, Math.max(0, afterTins))
    );
    left = { ...left, bulkLitres: round1(left.bulkLitres - take.bulkLitres) };
    if (packLitres(take) > 0.05) out.push({ id: lot.id, pack: take });
  }
  return out;
};

/** Add a sale onto campaign oil entries so the next picker sees remaining / sold. */
export const applyOilSale = (
  campaign: HarvestCampaign,
  allocations: { id: string; pack: OilPackStock }[]
): HarvestCampaign => {
  if (allocations.length === 0) return campaign;
  const byId = new Map(allocations.map((row) => [row.id, row.pack]));
  return {
    ...campaign,
    oils: campaign.oils.map((entry) => {
      const pack = byId.get(entry.id);
      if (!pack) return entry;
      const add = packLitres(pack);
      if (add <= 0) return entry;
      return {
        ...entry,
        soldLitres: round1(oilSoldLitres(entry) + add),
        soldTin16: (entry.soldTin16 ?? 0) + pack.tin16,
        soldTin17: (entry.soldTin17 ?? 0) + pack.tin17,
        soldBulkLitres: round1((entry.soldBulkLitres ?? 0) + pack.bulkLitres),
      };
    }),
  };
};

/** Newest oil first. Empty mill-kept lots are left out; fully sold lots stay visible. */
export const saleableOilLots = (campaign: HarvestCampaign): SaleableOilLot[] =>
  campaign.oils
    .map((entry) => {
      const farmerLitres = farmerOilLitres(entry);
      const soldLitres = Math.min(farmerLitres, oilSoldLitres(entry));
      const litres = round1(Math.max(0, farmerLitres - soldLitres));
      return {
        id: entry.id,
        date: entry.date,
        litres,
        farmerLitres,
        soldLitres,
        sold: litres <= 0.05,
        fieldIds: entry.fieldIds,
        harvestRecordId: entry.harvestRecordId,
        harvestRecordIds: [
          ...new Set(
            [...(entry.harvestRecordIds || []), entry.harvestRecordId].filter(
              (id): id is string => Boolean(id)
            )
          ),
        ],
        pack: remainingOilPack(entry),
      };
    })
    .filter((lot) => lot.farmerLitres > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
