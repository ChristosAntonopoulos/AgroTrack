import type { OilLot } from '../services/oilStockService';

const round1 = (n: number) => Math.round(n * 10) / 10;

export type PackDelta = { tin16: number; tin17: number; bulkLitres: number };

export type LotSlice = { oilLotId: string; pack: PackDelta };

export const emptyDelta = (): PackDelta => ({ tin16: 0, tin17: 0, bulkLitres: 0 });

export const isEmptyDelta = (p: PackDelta): boolean =>
  p.tin16 <= 0 && p.tin17 <= 0 && p.bulkLitres <= 0.05;

export const deltaLitres = (p: PackDelta): number =>
  round1(p.tin16 * 16 + p.tin17 * 17 + p.bulkLitres);

/**
 * What a physical count found against what the books said, split into oil to book in and oil
 * to book out. A count can be short on tins and long on bulk at the same time.
 */
export const stockCountDeltas = (
  expected: PackDelta,
  actual: PackDelta
): { add: PackDelta; remove: PackDelta } => ({
  add: {
    tin16: Math.max(0, Math.round(actual.tin16 - expected.tin16)),
    tin17: Math.max(0, Math.round(actual.tin17 - expected.tin17)),
    bulkLitres: round1(Math.max(0, actual.bulkLitres - expected.bulkLitres)),
  },
  remove: {
    tin16: Math.max(0, Math.round(expected.tin16 - actual.tin16)),
    tin17: Math.max(0, Math.round(expected.tin17 - actual.tin17)),
    bulkLitres: round1(Math.max(0, expected.bulkLitres - actual.bulkLitres)),
  },
});

/** Take a pack out of the oldest lots first, so the books follow the physical FIFO. */
export const planLotDrain = (lots: OilLot[], pack: PackDelta): LotSlice[] => {
  const left = { ...pack };
  const slices: LotSlice[] = [];
  const oldestFirst = [...lots].sort((a, b) => a.pressedOn.localeCompare(b.pressedOn));

  for (const lot of oldestFirst) {
    if (isEmptyDelta(left)) break;
    const take: PackDelta = {
      tin16: Math.min(left.tin16, lot.packing.tin16),
      tin17: Math.min(left.tin17, lot.packing.tin17),
      bulkLitres: round1(Math.min(left.bulkLitres, lot.packing.bulkLitres)),
    };
    if (isEmptyDelta(take)) continue;
    slices.push({ oilLotId: lot.id, pack: take });
    left.tin16 -= take.tin16;
    left.tin17 -= take.tin17;
    left.bulkLitres = round1(left.bulkLitres - take.bulkLitres);
  }

  return slices;
};

/** Surplus oil lands on the freshest lot — that is where an uncounted tin most likely came from. */
export const newestLotId = (lots: OilLot[]): string | null => {
  if (lots.length === 0) return null;
  return [...lots].sort((a, b) => b.pressedOn.localeCompare(a.pressedOn))[0].id;
};
