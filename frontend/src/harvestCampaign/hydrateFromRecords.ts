import type { HarvestRecord } from '../services/harvestService';
import { getHarvestService } from '../services/serviceFactory';
import { athensCalendarDateKey } from '../utils/athensDate';
import { getSeasonStartYear } from '../utils/harvestSeason';
import {
  emptyCampaign,
  HARVEST_METHOD_MILL,
  HARVEST_METHOD_OIL,
  HARVEST_METHOD_PEOPLE,
  HARVEST_METHOD_SACKS,
  type HarvestCampaign,
  type HarvestMillWeightEntry,
  type HarvestOilEntry,
  type HarvestPeopleEntry,
  type HarvestSackEntry,
} from './types';

const methodOf = (row: HarvestRecord) => (row.harvestMethod || '').toLowerCase();

/** Posted records whose harvest date falls in the olive season year. */
export const filterSeasonHarvestRecords = (
  rows: HarvestRecord[],
  seasonStartYear: number
): HarvestRecord[] =>
  rows.filter((row) => {
    if (row.status === 'voided') return false;
    return getSeasonStartYear(row.harvestDate) === seasonStartYear;
  });

export const fetchHarvestRecordsForFields = async (
  fieldIds: string[]
): Promise<HarvestRecord[]> => {
  const unique = [...new Set(fieldIds.filter(Boolean))];
  if (unique.length === 0) return [];
  const chunks = await Promise.all(
    unique.map((id) => getHarvestService().listByField(id).catch(() => [] as HarvestRecord[]))
  );
  const byId = new Map<string, HarvestRecord>();
  for (const rows of chunks) {
    for (const row of rows) {
      if (row?.id) byId.set(row.id, row);
    }
  }
  return [...byId.values()];
};

const parsePeopleCostFromNotes = (notes?: string): number | undefined => {
  if (!notes) return undefined;
  const match = notes.match(/(\d+(?:[.,]\d+)?)\s*€/);
  if (!match) return undefined;
  const n = Number(match[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const parseReceiptFromNotes = (
  notes?: string
): { receiptRef?: string; note?: string } => {
  if (!notes) return {};
  const receiptMatch = notes.match(/(?:receipt|απόδειξη|ζύγισμα|scontrino)\s*[:#]?\s*([^\s·|]+)/i);
  if (!receiptMatch) return { note: notes };
  const receiptRef = receiptMatch[1];
  const note = notes.replace(receiptMatch[0], '').replace(/^[·|\s]+|[·|\s]+$/g, '').trim() || undefined;
  return { receiptRef, note };
};

/**
 * Map server harvest-records into a HarvestCampaign shape (best-effort FE hydrate).
 * Shared mill/oil lots are grouped by batchId.
 * Pass `ignoreSeason: true` for Chronologio day cards across every result year.
 */
export const campaignFromHarvestRecords = (
  rows: HarvestRecord[],
  seasonStartYear: number,
  options?: { ignoreSeason?: boolean }
): HarvestCampaign => {
  const seasonRows = options?.ignoreSeason
    ? rows.filter((row) => row.status !== 'voided')
    : filterSeasonHarvestRecords(rows, seasonStartYear);
  const base = emptyCampaign(seasonStartYear);
  if (seasonRows.length === 0) return base;

  const fieldOrder: string[] = [];
  const seenField = new Set<string>();
  const touchField = (id: string) => {
    if (!id || seenField.has(id)) return;
    seenField.add(id);
    fieldOrder.push(id);
  };

  const sacks: HarvestSackEntry[] = [];
  const millWeights: HarvestMillWeightEntry[] = [];
  const oils: HarvestOilEntry[] = [];
  const peopleLogs: HarvestPeopleEntry[] = [];

  const millBatches = new Map<string, HarvestRecord[]>();
  const oilBatches = new Map<string, HarvestRecord[]>();
  const millSingles: HarvestRecord[] = [];
  const oilSingles: HarvestRecord[] = [];

  for (const row of seasonRows) {
    touchField(row.fieldId);
    const method = methodOf(row);
    if (method === HARVEST_METHOD_SACKS || (row.sackCount && row.sackCount > 0 && !row.oliveKg && !row.oilKg)) {
      sacks.push({
        id: `srv-sack-${row.id}`,
        date: athensCalendarDateKey(row.harvestDate),
        fieldId: row.fieldId,
        sacks: row.sackCount || 0,
        harvestRecordId: row.id,
        createdAt: row.harvestDate,
      });
      continue;
    }
    if (method === HARVEST_METHOD_PEOPLE || (row.workersUsed > 0 && !row.oliveKg && !row.oilKg && !row.sackCount)) {
      peopleLogs.push({
        id: `srv-people-${row.id}`,
        date: athensCalendarDateKey(row.harvestDate),
        people: row.workersUsed || 1,
        hours: 'full',
        costEur: parsePeopleCostFromNotes(row.notes),
        harvestRecordId: row.id,
        createdAt: row.harvestDate,
      });
      continue;
    }
    if (method === HARVEST_METHOD_OIL || (row.oilKg != null && row.oilKg > 0) || (row.oilLitres != null && row.oilLitres > 0)) {
      if (row.batchId) {
        const list = oilBatches.get(row.batchId) || [];
        list.push(row);
        oilBatches.set(row.batchId, list);
      } else {
        oilSingles.push(row);
      }
      continue;
    }
    if (method === HARVEST_METHOD_MILL || row.oliveKg > 0) {
      if (row.batchId) {
        const list = millBatches.get(row.batchId) || [];
        list.push(row);
        millBatches.set(row.batchId, list);
      } else {
        millSingles.push(row);
      }
    }
  }

  const pushMillGroup = (group: HarvestRecord[], batchId?: string) => {
    const kg = group.reduce((sum, r) => sum + (r.oliveKg || 0), 0);
    if (kg <= 0) return;
    const fieldIds = [...new Set(group.map((r) => r.fieldId))];
    const { receiptRef, note } = parseReceiptFromNotes(group[0]?.notes);
    millWeights.push({
      id: `srv-mill-${batchId || group[0].id}`,
      date: athensCalendarDateKey(group[0].harvestDate),
      kg,
      fieldIds,
      fieldShares: group.map((r) => ({
        fieldId: r.fieldId,
        weight: r.allocationWeight != null && r.allocationWeight > 0 ? r.allocationWeight : 1,
      })),
      sackIds: [],
      receiptRef,
      note,
      batchId,
      harvestRecordId: group[0].id,
      harvestRecordIds: group.map((r) => r.id),
      createdAt: group[0].harvestDate,
    });
  };

  for (const [batchId, group] of millBatches) pushMillGroup(group, batchId);
  for (const row of millSingles) pushMillGroup([row]);

  const pushOilGroup = (group: HarvestRecord[], batchId?: string) => {
    const oilKg = group.reduce((sum, r) => sum + (r.oilKg || 0), 0);
    const oilLitres = group.reduce((sum, r) => sum + (r.oilLitres || 0), 0);
    if (oilKg <= 0 && oilLitres <= 0) return;
    const useLitres = oilKg <= 0 && oilLitres > 0;
    oils.push({
      id: `srv-oil-${batchId || group[0].id}`,
      date: athensCalendarDateKey(group[0].harvestDate),
      amount: useLitres ? oilLitres : oilKg,
      unit: useLitres ? 'litres' : 'kg',
      millWeightIds: [],
      fieldIds: [...new Set(group.map((r) => r.fieldId))],
      fieldShares: group.map((r) => ({
        fieldId: r.fieldId,
        weight: r.allocationWeight != null && r.allocationWeight > 0 ? r.allocationWeight : 1,
      })),
      note: group[0].notes,
      batchId,
      harvestRecordId: group[0].id,
      harvestRecordIds: group.map((r) => r.id),
      createdAt: group[0].harvestDate,
    });
  };

  for (const [batchId, group] of oilBatches) pushOilGroup(group, batchId);
  for (const row of oilSingles) pushOilGroup([row]);

  const dates = seasonRows.map((r) => athensCalendarDateKey(r.harvestDate)).sort();
  const hasProduction =
    sacks.length > 0 || millWeights.length > 0 || oils.length > 0 || peopleLogs.length > 0;

  return {
    ...base,
    status: hasProduction ? 'active' : 'idle',
    startedAt: dates[0] ? `${dates[0]}T12:00:00.000Z` : undefined,
    fieldOrder,
    millName: seasonRows.find((r) => r.millName)?.millName || '',
    sacks,
    millWeights,
    oils,
    peopleLogs,
  };
};

const knownServerIds = (campaign: HarvestCampaign): Set<string> => {
  const ids = new Set<string>();
  for (const row of campaign.sacks) if (row.harvestRecordId) ids.add(row.harvestRecordId);
  for (const row of campaign.millWeights) {
    if (row.harvestRecordId) ids.add(row.harvestRecordId);
    for (const id of row.harvestRecordIds || []) ids.add(id);
  }
  for (const row of campaign.oils) {
    if (row.harvestRecordId) ids.add(row.harvestRecordId);
    for (const id of row.harvestRecordIds || []) ids.add(id);
  }
  for (const row of campaign.peopleLogs) if (row.harvestRecordId) ids.add(row.harvestRecordId);
  return ids;
};

/**
 * Merge server-derived campaign into local. Local drafts (no harvestRecordId) win;
 * missing server entries are appended. Idle local + server production → active.
 */
export const mergeCampaignWithHydrated = (
  local: HarvestCampaign,
  hydrated: HarvestCampaign
): HarvestCampaign => {
  const known = knownServerIds(local);
  const millKnownBatches = new Set(
    local.millWeights.map((m) => m.batchId).filter(Boolean) as string[]
  );
  const oilKnownBatches = new Set(local.oils.map((o) => o.batchId).filter(Boolean) as string[]);

  const sacks = [
    ...local.sacks,
    ...hydrated.sacks.filter(
      (row) => row.harvestRecordId && !known.has(row.harvestRecordId)
    ),
  ];
  const millWeights = [
    ...local.millWeights,
    ...hydrated.millWeights.filter((row) => {
      if (row.batchId && millKnownBatches.has(row.batchId)) return false;
      return (row.harvestRecordIds || [row.harvestRecordId]).every(
        (id) => !id || !known.has(id)
      );
    }),
  ];
  const oils = [
    ...local.oils,
    ...hydrated.oils.filter((row) => {
      if (row.batchId && oilKnownBatches.has(row.batchId)) return false;
      return (row.harvestRecordIds || [row.harvestRecordId]).every(
        (id) => !id || !known.has(id)
      );
    }),
  ];
  const peopleLogs = [
    ...local.peopleLogs,
    ...hydrated.peopleLogs.filter(
      (row) => row.harvestRecordId && !known.has(row.harvestRecordId)
    ),
  ];

  const fieldSeen = new Set(local.fieldOrder);
  const fieldOrder = [
    ...local.fieldOrder,
    ...hydrated.fieldOrder.filter((id) => {
      if (fieldSeen.has(id)) return false;
      fieldSeen.add(id);
      return true;
    }),
  ];

  const hydratedHas =
    hydrated.sacks.length +
      hydrated.millWeights.length +
      hydrated.oils.length +
      hydrated.peopleLogs.length >
    0;

  let status = local.status;
  if (local.status === 'idle' && hydratedHas) status = 'active';
  if (local.status === 'closed') status = 'closed';

  const startedAt =
    local.startedAt ||
    hydrated.startedAt ||
    (status !== 'idle' ? new Date().toISOString() : undefined);

  return {
    ...local,
    status,
    startedAt,
    fieldOrder: fieldOrder.length ? fieldOrder : local.fieldOrder,
    millName: local.millName || hydrated.millName,
    sacks,
    millWeights,
    oils,
    peopleLogs,
  };
};

/**
 * Drop retired / deleted field ids from a campaign (and their sacks / shares).
 * Keeps the harvest journey aligned with the live Fields list after demo reseeds.
 */
export const pruneCampaignToKnownFields = (
  campaign: HarvestCampaign,
  knownFieldIds: readonly string[]
): HarvestCampaign => {
  const known = new Set(knownFieldIds);
  if (known.size === 0) return campaign;

  const fieldOrder = campaign.fieldOrder.filter((id) => known.has(id));
  const groveDoneIds = campaign.groveDoneIds.filter((id) => known.has(id));
  const dayLogs = campaign.dayLogs.filter((row) => !row.fieldId || known.has(row.fieldId));
  const sacks = campaign.sacks.filter((row) => known.has(row.fieldId));
  const keptSackIds = new Set(sacks.map((row) => row.id));

  const millWeights = campaign.millWeights
    .map((row) => {
      const fieldIds = row.fieldIds.filter((id) => known.has(id));
      const fieldShares = row.fieldShares?.filter((share) => known.has(share.fieldId));
      if (row.fieldIds.length > 0 && fieldIds.length === 0) return null;
      return {
        ...row,
        fieldIds,
        fieldShares: fieldShares && fieldShares.length > 0 ? fieldShares : undefined,
        sackIds: row.sackIds.filter((id) => keptSackIds.has(id)),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const keptMillIds = new Set(millWeights.map((row) => row.id));
  const oils = campaign.oils
    .map((row) => {
      const fieldIds = row.fieldIds.filter((id) => known.has(id));
      const fieldShares = row.fieldShares?.filter((share) => known.has(share.fieldId));
      if (row.fieldIds.length > 0 && fieldIds.length === 0) return null;
      return {
        ...row,
        fieldIds,
        fieldShares: fieldShares && fieldShares.length > 0 ? fieldShares : undefined,
        millWeightIds: row.millWeightIds.filter((id) => keptMillIds.has(id)),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  return {
    ...campaign,
    fieldOrder,
    groveDoneIds,
    dayLogs,
    sacks,
    millWeights,
    oils,
  };
};
