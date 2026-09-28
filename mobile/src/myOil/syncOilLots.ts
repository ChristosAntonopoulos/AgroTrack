import AsyncStorage from '@react-native-async-storage/async-storage';
import { oilEntryPack, farmerOilLitres } from '../harvestCampaign/oilSaleLots';
import type { HarvestOilEntry } from '../harvestCampaign/types';
import { listRecentSeasonYears } from '../ravdos/season';
import { loadCampaign } from '../harvestCampaign/storage';
import { oilStockService, type UpsertOilLotInput } from '../services/oilStockService';
import { OLIVE_OIL_KG_PER_LITRE } from '../harvestCampaign/utils/harvestCalculations';

const MIGRATED_KEY = (userId: string) => `oleachron.oilLots.migrated.${userId}`;

export const packingFromOilEntry = (entry: HarvestOilEntry) => {
  const pack = oilEntryPack(entry);
  return {
    tin16: pack.tin16,
    tin17: pack.tin17,
    bulkLitres: pack.bulkLitres,
  };
};

export const upsertOilLotFromEntry = async (
  entry: HarvestOilEntry,
  harvestRecordIds: string[]
): Promise<void> => {
  const batchId = entry.batchId || harvestRecordIds[0];
  if (!batchId) return;

  const packing = packingFromOilEntry(entry);
  const input: UpsertOilLotInput = {
    batchId,
    pressedOn: new Date(`${entry.date}T12:00:00`).toISOString(),
    harvestRecordIds: harvestRecordIds.length
      ? harvestRecordIds
      : entry.harvestRecordIds || (entry.harvestRecordId ? [entry.harvestRecordId] : []),
    fieldIds: entry.fieldIds || [],
    totalAmount: entry.amount,
    unit: entry.unit,
    millKept: entry.millKept ?? 0,
    conversionFactor: entry.unit === 'kg' ? OLIVE_OIL_KG_PER_LITRE : undefined,
    packing,
    notes: entry.note,
  };

  if (!(farmerOilLitres(entry) > 0.05) && packing.tin16 + packing.tin17 + packing.bulkLitres <= 0.05) {
    return;
  }

  await oilStockService.upsertLot(input);
};

export const migrateLocalOilPackingOnce = async (userId: string): Promise<number> => {
  if (!userId) return 0;
  try {
    if ((await AsyncStorage.getItem(MIGRATED_KEY(userId))) === '1') return 0;
  } catch {
    /* ignore */
  }

  let pushed = 0;
  const campaigns = await Promise.all(
    listRecentSeasonYears(8).map((season) => loadCampaign(userId, season))
  );
  for (const campaign of campaigns) {
    for (const entry of campaign.oils) {
      if (!entry.batchId && !(entry.harvestRecordIds?.length || entry.harvestRecordId)) continue;
      try {
        await upsertOilLotFromEntry(
          entry,
          entry.harvestRecordIds?.length
            ? entry.harvestRecordIds
            : entry.harvestRecordId
              ? [entry.harvestRecordId]
              : []
        );
        pushed += 1;
      } catch {
        /* continue */
      }
    }
  }

  if (pushed > 0 || campaigns.every((c) => c.oils.length === 0)) {
    try {
      await AsyncStorage.setItem(MIGRATED_KEY(userId), '1');
    } catch {
      /* ignore */
    }
  }
  return pushed;
};
