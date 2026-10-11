import type { OilLot } from '../services/oilStockService';

const time = (iso?: string | null) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/**
 * QA-037: lots that still hold loose oil, oldest first (FIFO). Ties on pressing date fall back to
 * creation time then id, so "no harvest link" packaging always draws from the same lot.
 */
export const fifoBulkLots = (lots: OilLot[]): OilLot[] =>
  lots
    .filter((l) => l.packing.bulkLitres > 0.05)
    .sort(
      (a, b) =>
        time(a.pressedOn) - time(b.pressedOn) ||
        time(a.createdAt) - time(b.createdAt) ||
        a.id.localeCompare(b.id)
    );

/** The lot an unlinked packing run draws from, or null when no loose oil is left. */
export const defaultPackSource = (lots: OilLot[]): OilLot | null => fifoBulkLots(lots)[0] ?? null;
