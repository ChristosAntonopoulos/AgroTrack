import type { OilLot, OilPack } from '../services/oilStockService';
import type { OilPackInput } from './packInput';

const NONE_KEY = '__none__';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** One field's oil, every pressing of that field added together. */
export type FieldOilPool = {
  key: string;
  fieldIds: string[];
  /** Oldest pressing first, so use and fill start with the oldest oil. */
  lots: OilLot[];
  packing: OilPack;
  available: OilPack;
  reserved: OilPack;
  farmerLitres: number;
  millKept: number;
};

export type LotPackSlice = {
  oilLotId: string;
  pack: OilPackInput;
};

export type RepackSlice = {
  oilLotId: string;
  addTin16: number;
  addTin17: number;
};

const emptyPack = (): OilPack => ({ tin16: 0, tin17: 0, bulkLitres: 0, litres: 0 });

export const sumOilPacks = (
  packs: Array<Pick<OilPack, 'tin16' | 'tin17' | 'bulkLitres'>>
): OilPack => {
  let tin16 = 0;
  let tin17 = 0;
  let bulkLitres = 0;
  for (const pack of packs) {
    tin16 += pack.tin16 || 0;
    tin17 += pack.tin17 || 0;
    bulkLitres += pack.bulkLitres || 0;
  }
  bulkLitres = round1(bulkLitres);
  return {
    tin16,
    tin17,
    bulkLitres,
    litres: round1(tin16 * 16 + tin17 * 17 + bulkLitres),
  };
};

/** Same fields, any order, share one pool. A pressing with no field is its own pool. */
export const fieldPoolKey = (fieldIds: string[] | null | undefined): string => {
  const ids = [...new Set((fieldIds || []).map((id) => id.trim()).filter(Boolean))].sort();
  return ids.length ? ids.join('|') : NONE_KEY;
};

const byPressed = (a: OilLot, b: OilLot) => {
  const delta = new Date(a.pressedOn).getTime() - new Date(b.pressedOn).getTime();
  if (delta !== 0 && !Number.isNaN(delta)) return delta;
  return a.id.localeCompare(b.id);
};

/**
 * Collapse pressings into field piles.
 * A pressing that belongs to several fields stays one pile named with all of them,
 * so litres are never counted twice.
 */
export const groupLotsByField = (lots: OilLot[]): FieldOilPool[] => {
  const map = new Map<string, OilLot[]>();
  for (const lot of lots) {
    const key = fieldPoolKey(lot.fieldIds);
    const list = map.get(key) || [];
    list.push(lot);
    map.set(key, list);
  }

  const pools: FieldOilPool[] = [];
  for (const [key, group] of map) {
    const ordered = [...group].sort(byPressed);
    const fieldIds = (ordered[0]?.fieldIds || []).map((id) => id.trim()).filter(Boolean);
    pools.push({
      key,
      fieldIds: key === NONE_KEY ? [] : fieldIds,
      lots: ordered,
      packing: sumOilPacks(ordered.map((lot) => lot.packing || emptyPack())),
      available: sumOilPacks(ordered.map((lot) => lot.available || emptyPack())),
      reserved: sumOilPacks(ordered.map((lot) => lot.reserved || emptyPack())),
      farmerLitres: round1(ordered.reduce((sum, lot) => sum + (lot.farmerLitres || 0), 0)),
      millKept: round1(ordered.reduce((sum, lot) => sum + (lot.millKept || 0), 0)),
    });
  }

  return pools.sort((a, b) => {
    if (!a.fieldIds.length && b.fieldIds.length) return 1;
    if (a.fieldIds.length && !b.fieldIds.length) return -1;
    return b.packing.litres - a.packing.litres || a.key.localeCompare(b.key);
  });
};

export const poolLabel = (
  pool: Pick<FieldOilPool, 'fieldIds'>,
  fieldNames: Record<string, string>,
  unnamed: string
): string => {
  if (!pool.fieldIds.length) return unnamed;
  const names = pool.fieldIds.map((id) => fieldNames[id]?.trim() || '').filter(Boolean);
  return names.join(' · ') || unnamed;
};

export const poolHasOil = (pool: FieldOilPool): boolean =>
  pool.packing.litres > 0.05 || pool.reserved.litres > 0.05 || pool.available.litres > 0.05;

export const poolHasFreeOil = (pool: FieldOilPool): boolean => pool.available.litres > 0.05;

/** Take oil from the field's pressings, oldest first, and never from oil already held. */
export const planFieldDrain = (lots: OilLot[], wanted: OilPackInput): LotPackSlice[] => {
  let tin16 = Math.max(0, Math.round(wanted.tin16 || 0));
  let tin17 = Math.max(0, Math.round(wanted.tin17 || 0));
  let bulk = Math.max(0, wanted.bulkLitres || 0);
  const slices: LotPackSlice[] = [];

  for (const lot of [...lots].sort(byPressed)) {
    if (tin16 <= 0 && tin17 <= 0 && bulk <= 0.05) break;
    const free = lot.available || emptyPack();
    const take16 = Math.min(tin16, Math.max(0, free.tin16));
    const take17 = Math.min(tin17, Math.max(0, free.tin17));
    const takeBulk = round1(Math.min(bulk, Math.max(0, free.bulkLitres)));
    if (take16 <= 0 && take17 <= 0 && takeBulk <= 0.05) continue;
    slices.push({
      oilLotId: lot.id,
      pack: { tin16: take16, tin17: take17, bulkLitres: takeBulk },
    });
    tin16 -= take16;
    tin17 -= take17;
    bulk = round1(Math.max(0, bulk - takeBulk));
  }

  return slices;
};

export const drainCovers = (lots: OilLot[], wanted: OilPackInput): boolean => {
  const got = sumOilPacks(planFieldDrain(lots, wanted).map((slice) => slice.pack));
  return (
    got.tin16 >= Math.max(0, Math.round(wanted.tin16 || 0)) &&
    got.tin17 >= Math.max(0, Math.round(wanted.tin17 || 0)) &&
    got.bulkLitres + 0.05 >= Math.max(0, wanted.bulkLitres || 0)
  );
};

/** Extra oil stays on this field by landing on its newest pressing. */
export const planFieldAdd = (lots: OilLot[], pack: OilPackInput): LotPackSlice[] => {
  const ordered = [...lots].sort(byPressed);
  const lot = ordered[ordered.length - 1];
  if (!lot) return [];
  const tin16 = Math.max(0, Math.round(pack.tin16 || 0));
  const tin17 = Math.max(0, Math.round(pack.tin17 || 0));
  const bulkLitres = Math.max(0, pack.bulkLitres || 0);
  if (tin16 <= 0 && tin17 <= 0 && bulkLitres <= 0.05) return [];
  return [{ oilLotId: lot.id, pack: { tin16, tin17, bulkLitres } }];
};

/** Fill whole tins from the field's free bulk, oldest pressing first. */
export const planFieldRepack = (
  lots: OilLot[],
  addTin16: number,
  addTin17: number
): RepackSlice[] => {
  let need16 = Math.max(0, Math.round(addTin16 || 0));
  let need17 = Math.max(0, Math.round(addTin17 || 0));
  const slices: RepackSlice[] = [];

  for (const lot of [...lots].sort(byPressed)) {
    if (need16 <= 0 && need17 <= 0) break;
    let bulk = Math.max(0, lot.available?.bulkLitres || 0);
    let n16 = 0;
    let n17 = 0;
    while (need16 > 0 && bulk + 0.05 >= 16) {
      n16 += 1;
      need16 -= 1;
      bulk = round1(bulk - 16);
    }
    while (need17 > 0 && bulk + 0.05 >= 17) {
      n17 += 1;
      need17 -= 1;
      bulk = round1(bulk - 17);
    }
    if (n16 > 0 || n17 > 0) {
      slices.push({ oilLotId: lot.id, addTin16: n16, addTin17: n17 });
    }
  }

  return slices;
};

export type PackingWrite = {
  oilLotId: string;
  packing: { tin16: number; tin17: number; bulkLitres: number };
};

/**
 * Fill tins from the field's free bulk.
 * When no single pressing has enough bulk for the next tin, gather free bulk
 * onto the fullest pressing first so the field behaves as one pile.
 */
export const planFieldFill = (
  lots: OilLot[],
  addTin16: number,
  addTin17: number
): { moves: PackingWrite[]; repacks: RepackSlice[] } => {
  const want16 = Math.max(0, Math.round(addTin16 || 0));
  const want17 = Math.max(0, Math.round(addTin17 || 0));
  const direct = planFieldRepack(lots, want16, want17);
  const got16 = direct.reduce((sum, slice) => sum + slice.addTin16, 0);
  const got17 = direct.reduce((sum, slice) => sum + slice.addTin17, 0);
  if (got16 >= want16 && got17 >= want17) {
    return { moves: [], repacks: direct };
  }

  const ordered = [...lots].sort(
    (a, b) => (b.available?.bulkLitres || 0) - (a.available?.bulkLitres || 0) || byPressed(a, b)
  );
  const target = ordered[0];
  if (!target || want16 + want17 <= 0) return { moves: [], repacks: [] };

  let moved = 0;
  const moves: PackingWrite[] = [];
  for (const lot of ordered) {
    if (lot.id === target.id) continue;
    const free = Math.max(0, lot.available?.bulkLitres || 0);
    if (free <= 0.05) continue;
    moves.push({
      oilLotId: lot.id,
      packing: {
        tin16: lot.packing.tin16,
        tin17: lot.packing.tin17,
        bulkLitres: round1(Math.max(0, lot.packing.bulkLitres - free)),
      },
    });
    moved = round1(moved + free);
  }
  if (moved > 0.05) {
    moves.push({
      oilLotId: target.id,
      packing: {
        tin16: target.packing.tin16,
        tin17: target.packing.tin17,
        bulkLitres: round1(target.packing.bulkLitres + moved),
      },
    });
  }

  return {
    moves,
    repacks: [{ oilLotId: target.id, addTin16: want16, addTin17: want17 }],
  };
};

/** Fields a hold actually draws from — names, never pressing dates. */
export const commitmentFieldLabel = (
  allocations: { oilLotId: string }[],
  lots: OilLot[],
  fieldNames: Record<string, string>,
  unnamed: string
): string | null => {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const allocation of allocations) {
    const lot = lots.find((item) => item.id === allocation.oilLotId);
    const ids = (lot?.fieldIds || []).map((id) => id.trim()).filter(Boolean);
    if (!lot || ids.length === 0) {
      if (lot && !seen.has(NONE_KEY)) {
        seen.add(NONE_KEY);
        names.push(unnamed);
      }
      continue;
    }
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const name = fieldNames[id]?.trim();
      if (name) {
        names.push(name);
      }
    }
  }
  return names.length ? names.join(' · ') : null;
};
