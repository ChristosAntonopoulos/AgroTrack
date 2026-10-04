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
  key: string;
  fieldIds: string[];
  primaryFieldId: string | null;
  lots: OilLot[];
  available: OilPack;
  onHand: OilPack;
};

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

/** Shelf title, and the groves inside a shared shelf. */
export const groveShelfTitle = (
  group: Pick<GroveOilGroup, 'fieldIds'>,
  fieldNames: Record<string, string>,
  copy: { shared: string; unassigned: string }
): { title: string; subtitle?: string } => {
  if (group.fieldIds.length === 0) return { title: copy.unassigned };
  const names = group.fieldIds.map((id) => fieldNames[id] || id).filter(Boolean);
  if (names.length <= 1) return { title: names[0] || copy.unassigned };
  return { title: copy.shared, subtitle: names.join(' + ') };
};

/** Fullest shelf first — what you see when you open the cellar. */
export const orderShelves = (groups: GroveOilGroup[]): GroveOilGroup[] =>
  [...groups].sort((a, b) => b.onHand.litres - a.onHand.litres || a.key.localeCompare(b.key));

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
