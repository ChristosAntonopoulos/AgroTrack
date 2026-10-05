import type { UpsertOilLotInput } from '../services/oilStockService';
import { packLitresOf, type OilPackInput } from './packInput';

/**
 * Oil typed straight into storage.
 * No grove, mill ticket, or harvest record — the cellar is the whole story.
 */
export const directStorageLot = (
  pack: OilPackInput,
  notes?: string,
  now = new Date(),
  nonce = Math.random().toString(36).slice(2, 8)
): UpsertOilLotInput => {
  const trimmed = notes?.trim();
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  return {
    batchId: `storage-${day}-${nonce}`,
    pressedOn: now.toISOString(),
    totalAmount: packLitresOf(pack),
    unit: 'litres',
    millKept: 0,
    packing: {
      tin16: pack.tin16,
      tin17: pack.tin17,
      bulkLitres: pack.bulkLitres,
    },
    notes: trimmed || undefined,
  };
};
