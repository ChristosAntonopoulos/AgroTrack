import type {
  HarvestCampaign,
  HarvestFieldShare,
  HarvestMillWeightEntry,
  HarvestOilEntry,
  HarvestSackEntry,
} from './types';

const OIL_KG_PER_LITRE = 0.916;

export const oilKgFromEntry = (entry: HarvestOilEntry): number =>
  entry.unit === 'litres' ? entry.amount * OIL_KG_PER_LITRE : entry.amount;

/** Build equal shares for a list of field ids (legacy / no sacks). */
export const equalFieldShares = (fieldIds: string[]): HarvestFieldShare[] => {
  const unique = [...new Set(fieldIds.filter(Boolean))];
  return unique.map((fieldId) => ({ fieldId, weight: 1 }));
};

/** Resolve shares for a mill lot from linked sacks, then explicit shares, then equal fieldIds. */
export const millFieldShares = (
  campaign: HarvestCampaign,
  mill: HarvestMillWeightEntry
): HarvestFieldShare[] => {
  if (mill.fieldShares && mill.fieldShares.length > 0) {
    return mill.fieldShares.filter((s) => s.weight > 0 && s.fieldId);
  }

  const sackIds = new Set(mill.sackIds);
  const linkedSacks = campaign.sacks.filter(
    (sack) => sackIds.has(sack.id) || sack.millWeightId === mill.id
  );
  if (linkedSacks.length > 0) {
    const byField = new Map<string, number>();
    for (const sack of linkedSacks) {
      byField.set(sack.fieldId, (byField.get(sack.fieldId) || 0) + sack.sacks);
    }
    return [...byField.entries()].map(([fieldId, weight]) => ({ fieldId, weight }));
  }

  return equalFieldShares(mill.fieldIds);
};

/** Resolve shares for an oil lot: explicit shares, else merge mill shares, else equal fieldIds. */
export const oilFieldShares = (
  campaign: HarvestCampaign,
  oil: HarvestOilEntry
): HarvestFieldShare[] => {
  if (oil.fieldShares && oil.fieldShares.length > 0) {
    return oil.fieldShares.filter((s) => s.weight > 0 && s.fieldId);
  }

  if (oil.millWeightIds.length > 0) {
    const byField = new Map<string, number>();
    for (const millId of oil.millWeightIds) {
      const mill = campaign.millWeights.find((row) => row.id === millId);
      if (!mill) continue;
      for (const share of millFieldShares(campaign, mill)) {
        byField.set(share.fieldId, (byField.get(share.fieldId) || 0) + share.weight);
      }
    }
    if (byField.size > 0) {
      return [...byField.entries()].map(([fieldId, weight]) => ({ fieldId, weight }));
    }
  }

  return equalFieldShares(oil.fieldIds);
};

export const shareTotalWeight = (shares: HarvestFieldShare[]): number =>
  shares.reduce((sum, s) => sum + (s.weight > 0 ? s.weight : 0), 0);

export const allocateAmount = (amount: number, shares: HarvestFieldShare[]): Map<string, number> => {
  const result = new Map<string, number>();
  const total = shareTotalWeight(shares);
  if (total <= 0 || amount <= 0) return result;
  for (const share of shares) {
    if (share.weight <= 0) continue;
    result.set(share.fieldId, (result.get(share.fieldId) || 0) + (amount * share.weight) / total);
  }
  return result;
};

/** Derive fieldShares from sack counts for the given sack ids (fallback equal on fieldIds). */
export const sharesFromSacks = (
  sacks: HarvestSackEntry[],
  sackIds: string[],
  fallbackFieldIds: string[]
): HarvestFieldShare[] => {
  const wanted = new Set(sackIds);
  const linked = sacks.filter((s) => wanted.has(s.id));
  if (linked.length === 0) return equalFieldShares(fallbackFieldIds);
  const byField = new Map<string, number>();
  for (const sack of linked) {
    byField.set(sack.fieldId, (byField.get(sack.fieldId) || 0) + sack.sacks);
  }
  return [...byField.entries()].map(([fieldId, weight]) => ({ fieldId, weight }));
};

export const fieldIdsFromShares = (shares: HarvestFieldShare[]): string[] =>
  [...new Set(shares.map((s) => s.fieldId).filter(Boolean))];

/** Ensure mill/oil entries have fieldShares and fieldIds aligned. */
export const withDerivedMillShares = (
  campaign: HarvestCampaign,
  mill: HarvestMillWeightEntry
): HarvestMillWeightEntry => {
  const shares =
    mill.fieldShares && mill.fieldShares.length > 0
      ? mill.fieldShares
      : millFieldShares(campaign, mill);
  return {
    ...mill,
    fieldShares: shares,
    fieldIds: fieldIdsFromShares(shares).length > 0 ? fieldIdsFromShares(shares) : mill.fieldIds,
  };
};

export const withDerivedOilShares = (
  campaign: HarvestCampaign,
  oil: HarvestOilEntry
): HarvestOilEntry => {
  const shares =
    oil.fieldShares && oil.fieldShares.length > 0 ? oil.fieldShares : oilFieldShares(campaign, oil);
  return {
    ...oil,
    fieldShares: shares,
    fieldIds: fieldIdsFromShares(shares).length > 0 ? fieldIdsFromShares(shares) : oil.fieldIds,
  };
};

export const allocatedMillKgForField = (
  campaign: HarvestCampaign,
  mill: HarvestMillWeightEntry,
  fieldId: string
): number => allocateAmount(mill.kg, millFieldShares(campaign, mill)).get(fieldId) || 0;

export const allocatedOilKgForField = (
  campaign: HarvestCampaign,
  oil: HarvestOilEntry,
  fieldId: string
): number => allocateAmount(oilKgFromEntry(oil), oilFieldShares(campaign, oil)).get(fieldId) || 0;

export const parseFieldShares = (value: unknown): HarvestFieldShare[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const shares: HarvestFieldShare[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const fieldId = typeof row.fieldId === 'string' ? row.fieldId : '';
    const weight = typeof row.weight === 'number' && Number.isFinite(row.weight) ? row.weight : 0;
    if (!fieldId || weight <= 0) continue;
    shares.push({ fieldId, weight });
  }
  return shares.length > 0 ? shares : undefined;
};
