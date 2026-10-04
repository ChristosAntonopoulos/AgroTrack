import type { OilLot, OilPack } from '../services/oilStockService';

const round1 = (n: number) => Math.round(n * 10) / 10;

const emptyPack = (): OilPack => ({ tin16: 0, tin17: 0, bulkLitres: 0, litres: 0 });

const addPack = (a: OilPack, b: Pick<OilPack, 'tin16' | 'tin17' | 'bulkLitres'>): OilPack => {
  const tin16 = a.tin16 + (b.tin16 || 0);
  const tin17 = a.tin17 + (b.tin17 || 0);
  const bulkLitres = round1(a.bulkLitres + (b.bulkLitres || 0));
  return {
    tin16,
    tin17,
    bulkLitres,
    litres: round1(tin16 * 16 + tin17 * 17 + bulkLitres),
  };
};

export type GroveOilGroup = {
  /** Stable key: field id, or `__shared__:` + sorted ids, or `__none__`. */
  key: string;
  fieldIds: string[];
  /** Single field id when group is one grove; null for shared / unassigned. */
  primaryFieldId: string | null;
  lots: OilLot[];
  available: OilPack;
  onHand: OilPack;
};

/** Human grove label from field names. Shared lots get a joined label. */
export const groveGroupLabel = (
  group: Pick<GroveOilGroup, 'fieldIds' | 'primaryFieldId'>,
  fieldNames: Record<string, string>,
  copy: { shared: (names: string) => string; unassigned: string }
): string => {
  if (group.fieldIds.length === 0) return copy.unassigned;
  const names = group.fieldIds.map((id) => fieldNames[id] || id).filter(Boolean);
  if (names.length === 1) return names[0];
  return copy.shared(names.join(' + '));
};

/**
 * Group cellar lots by grove origin.
 * One field → that grove. Several fields on one lot → shared group (not split).
 */
export const groupLotsByGrove = (lots: OilLot[]): GroveOilGroup[] => {
  const map = new Map<string, GroveOilGroup>();

  for (const lot of lots) {
    const ids = [...new Set((lot.fieldIds || []).filter(Boolean))].sort();
    const key =
      ids.length === 0 ? '__none__' : ids.length === 1 ? ids[0] : `__shared__:${ids.join(',')}`;
    const existing = map.get(key);
    if (existing) {
      existing.lots.push(lot);
      existing.available = addPack(existing.available, lot.available);
      existing.onHand = addPack(existing.onHand, lot.packing);
    } else {
      map.set(key, {
        key,
        fieldIds: ids,
        primaryFieldId: ids.length === 1 ? ids[0] : null,
        lots: [lot],
        available: addPack(emptyPack(), lot.available),
        onHand: addPack(emptyPack(), lot.packing),
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.key === '__none__') return 1;
    if (b.key === '__none__') return -1;
    return b.available.litres - a.available.litres || a.key.localeCompare(b.key);
  });
};

/** Fraction of a lot that came from one grove, 0 when the grove is not in the mix. */
export const groveShareOfLot = (lot: OilLot, fieldId: string): number => {
  if (!fieldId) return 0;
  const entries = lot.provenance?.length ? lot.provenance : null;
  if (entries) {
    return entries
      .filter((entry) => entry.fieldId === fieldId)
      .reduce((sum, entry) => sum + (entry.share || 0), 0);
  }
  // No measured split: every grove on the lot weighs the same.
  const ids = [...new Set((lot.fieldIds || []).filter(Boolean))];
  return ids.includes(fieldId) ? 1 / ids.length : 0;
};

/**
 * Litres available in the signed-in user's cellar from one grove.
 * A lot pressed from several groves only counts for its share.
 */
export const availableLitresForField = (lots: OilLot[], fieldId: string): number => {
  if (!fieldId) return 0;
  return round1(
    lots.reduce(
      (sum, lot) => sum + (lot.available?.litres || 0) * groveShareOfLot(lot, fieldId),
      0
    )
  );
};
