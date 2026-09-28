import { getHarvestService } from '../services/serviceFactory';
import {
  allocateAmount,
  millFieldShares,
  oilFieldShares,
  shareTotalWeight,
} from './allocation';
import type { HarvestCampaign } from './types';
import {
  HARVEST_METHOD_MILL,
  HARVEST_METHOD_OIL,
  HARVEST_METHOD_PEOPLE,
  HARVEST_METHOD_SACKS,
} from './types';
import type {
  HarvestMillWeightEntry,
  HarvestOilEntry,
  HarvestPeopleEntry,
  HarvestSackEntry,
} from './types';
import { oilAmountToKg } from './totals';
import { newHarvestEntryId } from './storage';
import { upsertOilLotFromEntry } from '../myOil/syncOilLots';

const firstFieldId = (campaign: HarvestCampaign, preferred?: string | null) =>
  preferred || campaign.fieldOrder[0];

const atNoon = (date: string) => new Date(`${date}T12:00:00`).toISOString();

export type PersistBatchResult = {
  batchId: string;
  harvestRecordIds: string[];
  /** First record id for backwards-compatible callers. */
  harvestRecordId?: string;
};

const shareNote = (
  base: string | undefined,
  weight: number,
  total: number,
  fieldCount: number
): string | undefined => {
  if (fieldCount <= 1) return base;
  const fraction = `${weight}/${total}`;
  const shared = `κοινό λιοτριβείο · μερίδιο ${fraction}`;
  return base ? `${base} · ${shared}` : shared;
};

export async function persistSackRecord(
  campaign: HarvestCampaign,
  entry: HarvestSackEntry
): Promise<string | undefined> {
  const fieldId = firstFieldId(campaign, entry.fieldId);
  if (!fieldId) return undefined;
  try {
    const created = await getHarvestService().create({
      fieldId,
      harvestDate: atNoon(entry.date),
      harvestMethod: HARVEST_METHOD_SACKS,
      oliveKg: 0,
      sackCount: entry.sacks,
      notes: entry.kgPerSack
        ? `${entry.sacks} σακιά · περίπου ${Math.round(entry.sacks * entry.kgPerSack)} kg`
        : `${entry.sacks} σακιά`,
    });
    return created.id;
  } catch {
    return undefined;
  }
}

export async function persistMillRecord(
  campaign: HarvestCampaign,
  entry: HarvestMillWeightEntry
): Promise<PersistBatchResult | undefined> {
  const shares = millFieldShares(campaign, {
    ...entry,
    fieldShares: entry.fieldShares,
  });
  const fieldIds =
    shares.length > 0
      ? shares.map((s) => s.fieldId)
      : entry.fieldIds.length > 0
        ? entry.fieldIds
        : firstFieldId(campaign)
          ? [firstFieldId(campaign)!]
          : [];
  if (fieldIds.length === 0) return undefined;

  const batchId = entry.batchId || newHarvestEntryId();
  const effectiveShares =
    shares.length > 0
      ? shares
      : fieldIds.map((fieldId) => ({ fieldId, weight: 1 }));
  const totalWeight = shareTotalWeight(effectiveShares);
  const allocated = allocateAmount(entry.kg, effectiveShares);
  const ids: string[] = [];

  try {
    for (const share of effectiveShares) {
      const oliveKg = allocated.get(share.fieldId) ?? 0;
      if (oliveKg <= 0 && entry.kg > 0) continue;
      const created = await getHarvestService().create({
        fieldId: share.fieldId,
        harvestDate: atNoon(entry.date),
        harvestMethod: HARVEST_METHOD_MILL,
        oliveKg: Math.round(oliveKg * 1000) / 1000,
        notes: shareNote(
          [entry.receiptRef ? `receipt: ${entry.receiptRef}` : '', entry.note]
            .filter(Boolean)
            .join(' · ') || undefined,
          share.weight,
          totalWeight,
          effectiveShares.length
        ),
        batchId,
        allocationWeight: share.weight,
      });
      ids.push(created.id);
    }
    if (ids.length === 0) return undefined;
    return { batchId, harvestRecordIds: ids, harvestRecordId: ids[0] };
  } catch {
    return ids.length > 0
      ? { batchId, harvestRecordIds: ids, harvestRecordId: ids[0] }
      : undefined;
  }
}

export async function persistOilRecord(
  campaign: HarvestCampaign,
  entry: HarvestOilEntry,
  relatedOliveKg?: number
): Promise<PersistBatchResult | undefined> {
  const oilKg = oilAmountToKg(entry);
  const shares = oilFieldShares(campaign, entry);
  const fieldIds =
    shares.length > 0
      ? shares.map((s) => s.fieldId)
      : entry.fieldIds.length > 0
        ? entry.fieldIds
        : firstFieldId(campaign)
          ? [firstFieldId(campaign)!]
          : [];
  if (fieldIds.length === 0) return undefined;

  const batchId = entry.batchId || newHarvestEntryId();
  const effectiveShares =
    shares.length > 0
      ? shares
      : fieldIds.map((fieldId) => ({ fieldId, weight: 1 }));
  const totalWeight = shareTotalWeight(effectiveShares);
  const allocated = allocateAmount(oilKg, effectiveShares);
  const yieldPct =
    relatedOliveKg && relatedOliveKg > 0
      ? Math.round((oilKg / relatedOliveKg) * 1000) / 10
      : undefined;
  const ids: string[] = [];

  try {
    for (const share of effectiveShares) {
      const portion = allocated.get(share.fieldId) ?? 0;
      if (portion <= 0 && oilKg > 0) continue;
      const litres =
        entry.unit === 'litres' && totalWeight > 0
          ? Math.round((entry.amount * share.weight) / totalWeight * 1000) / 1000
          : undefined;
      const created = await getHarvestService().create({
        fieldId: share.fieldId,
        harvestDate: atNoon(entry.date),
        harvestMethod: HARVEST_METHOD_OIL,
        oliveKg: 0,
        oilKg: Math.round(portion * 1000) / 1000,
        oilLitres: litres,
        oilYieldPercent: yieldPct,
        notes: shareNote(entry.note, share.weight, totalWeight, effectiveShares.length),
        batchId,
        allocationWeight: share.weight,
      });
      ids.push(created.id);
    }
    if (ids.length === 0) return undefined;
    try {
      await upsertOilLotFromEntry({ ...entry, batchId, harvestRecordIds: ids }, ids);
    } catch {
      /* harvest records are saved; packing sync can retry from My Oil */
    }
    return { batchId, harvestRecordIds: ids, harvestRecordId: ids[0] };
  } catch {
    return ids.length > 0
      ? { batchId, harvestRecordIds: ids, harvestRecordId: ids[0] }
      : undefined;
  }
}

export async function persistPeopleRecord(
  campaign: HarvestCampaign,
  entry: HarvestPeopleEntry
): Promise<string | undefined> {
  const fieldId = firstFieldId(campaign);
  if (!fieldId) return undefined;
  try {
    const created = await getHarvestService().create({
      fieldId,
      harvestDate: atNoon(entry.date),
      harvestMethod: HARVEST_METHOD_PEOPLE,
      oliveKg: 0,
      workersUsed: entry.people,
      notes: [entry.hours, entry.costEur ? `${entry.costEur}€` : ''].filter(Boolean).join(' · ') || undefined,
    });
    return created.id;
  } catch {
    return undefined;
  }
}
