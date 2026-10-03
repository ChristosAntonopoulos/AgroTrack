import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  equalFieldShares,
  fieldIdsFromShares,
  parseFieldShares,
  sharesFromSacks,
} from './allocation';
import {
  emptyCampaign,
  type HarvestCampaign,
  type HarvestDayLog,
  type HarvestExpenseEntry,
  type HarvestMillWeightEntry,
  type HarvestNoteEntry,
  type HarvestOilEntry,
  type HarvestPeopleEntry,
  type HarvestSackEntry,
  type HarvestSkipReason,
} from './types';

export const campaignStorageKey = (userId: string, seasonStartYear: number) =>
  `oleachron.harvestCampaign.${userId}.${seasonStartYear}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const parseTinLines = (value: unknown): HarvestOilEntry['tinLines'] => {
  if (!Array.isArray(value)) return undefined;
  const lines = value.flatMap((row) => {
    if (!isRecord(row)) return [];
    const sizeLitres = asNumber(row.sizeLitres);
    const count = asNumber(row.count);
    if (sizeLitres == null || count == null || count <= 0) return [];
    return [{ sizeLitres, count: Math.round(count) }];
  });
  return lines.length > 0 ? lines : undefined;
};

export const newHarvestEntryId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const parseDayLog = (value: unknown): HarvestDayLog | null => {
  if (!isRecord(value) || typeof value.date !== 'string') return null;
  const skipReason = value.skipReason;
  return {
    date: value.date,
    fieldId: asString(value.fieldId),
    oliveKg: asNumber(value.oliveKg),
    people: asNumber(value.people),
    hours: asNumber(value.hours),
    skipped: Boolean(value.skipped),
    skipReason:
      skipReason === 'rain' ||
      skipReason === 'no_crew' ||
      skipReason === 'mill' ||
      skipReason === 'rest' ||
      skipReason === 'other'
        ? skipReason
        : undefined,
    millVisit: Boolean(value.millVisit),
  };
};

const parseSack = (value: unknown): HarvestSackEntry | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.date !== 'string') return null;
  const sacks = asNumber(value.sacks);
  if (sacks == null || sacks <= 0 || typeof value.fieldId !== 'string') return null;
  return {
    id: value.id,
    date: value.date,
    fieldId: value.fieldId,
    sacks,
    kgPerSack: asNumber(value.kgPerSack),
    millWeightId: asString(value.millWeightId),
    harvestRecordId: asString(value.harvestRecordId),
    createdAt: asString(value.createdAt) || value.date,
  };
};

const parseMillWeight = (value: unknown): HarvestMillWeightEntry | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.date !== 'string') return null;
  const kg = asNumber(value.kg);
  if (kg == null || kg <= 0) return null;
  const fieldIds = asStringArray(value.fieldIds);
  const fieldShares = parseFieldShares(value.fieldShares) ?? (fieldIds.length > 0 ? equalFieldShares(fieldIds) : undefined);
  return {
    id: value.id,
    date: value.date,
    kg,
    fieldIds: fieldShares ? fieldIdsFromShares(fieldShares) : fieldIds,
    fieldShares,
    sackIds: asStringArray(value.sackIds),
    note: asString(value.note),
    photoCount: asNumber(value.photoCount),
    batchId: asString(value.batchId),
    harvestRecordId: asString(value.harvestRecordId),
    harvestRecordIds: asStringArray(value.harvestRecordIds),
    createdAt: asString(value.createdAt) || value.date,
  };
};

const parseOil = (value: unknown): HarvestOilEntry | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.date !== 'string') return null;
  const amount = asNumber(value.amount);
  if (amount == null || amount <= 0) return null;
  const fieldIds = asStringArray(value.fieldIds);
  const fieldShares = parseFieldShares(value.fieldShares) ?? (fieldIds.length > 0 ? equalFieldShares(fieldIds) : undefined);
  return {
    id: value.id,
    date: value.date,
    amount,
    unit: value.unit === 'litres' ? 'litres' : 'kg',
    millKept: asNumber(value.millKept),
    tin16Count:
      asNumber(value.tin16Count) ??
      (value.tinSizeLitres === 16 ? asNumber(value.tinCount) : undefined),
    tin17Count:
      asNumber(value.tin17Count) ??
      (value.tinSizeLitres === 17 ? asNumber(value.tinCount) : undefined),
    tinSizeLitres: value.tinSizeLitres === 16 || value.tinSizeLitres === 17 ? value.tinSizeLitres : undefined,
    tinCount: asNumber(value.tinCount),
    tinLines: parseTinLines(value.tinLines),
    extraLitres: asNumber(value.extraLitres),
    millWeightIds: asStringArray(value.millWeightIds),
    fieldIds: fieldShares ? fieldIdsFromShares(fieldShares) : fieldIds,
    fieldShares,
    acidity: asNumber(value.acidity),
    note: asString(value.note),
    batchId: asString(value.batchId),
    harvestRecordId: asString(value.harvestRecordId),
    harvestRecordIds: asStringArray(value.harvestRecordIds),
    cellarOwnerUserId: asString(value.cellarOwnerUserId),
    soldLitres: asNumber(value.soldLitres),
    soldTin16: asNumber(value.soldTin16),
    soldTin17: asNumber(value.soldTin17),
    soldBulkLitres: asNumber(value.soldBulkLitres),
    createdAt: asString(value.createdAt) || value.date,
  };
};

const parsePeople = (value: unknown): HarvestPeopleEntry | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.date !== 'string') return null;
  const people = asNumber(value.people);
  if (people == null || people <= 0) return null;
  const hours = value.hours;
  return {
    id: value.id,
    date: value.date,
    people,
    hours: hours === 'half' || hours === 'full' || hours === 'other' || hours === 'skip' ? hours : 'skip',
    otherHours: asNumber(value.otherHours),
    costEur: asNumber(value.costEur),
    addedToMoney: Boolean(value.addedToMoney),
    harvestRecordId: asString(value.harvestRecordId),
    createdAt: asString(value.createdAt) || value.date,
  };
};

const parseExpense = (value: unknown): HarvestExpenseEntry | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.date !== 'string') return null;
  const amountEur = asNumber(value.amountEur);
  if (amountEur == null || amountEur <= 0) return null;
  return {
    id: value.id,
    date: value.date,
    amountEur,
    note: asString(value.note),
    transactionId: asString(value.transactionId),
    createdAt: asString(value.createdAt) || value.date,
  };
};

const parseNote = (value: unknown): HarvestNoteEntry | null => {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.date !== 'string') return null;
  return {
    id: value.id,
    date: value.date,
    body: asString(value.body),
    photoCount: asNumber(value.photoCount),
    noteId: asString(value.noteId),
    createdAt: asString(value.createdAt) || value.date,
  };
};

const migrateDayLogs = (campaign: HarvestCampaign): HarvestCampaign => {
  if (campaign.dayLogs.length === 0) return campaign;
  if (
    campaign.sacks.length > 0 ||
    campaign.millWeights.length > 0 ||
    campaign.peopleLogs.length > 0
  ) {
    return campaign;
  }

  const millWeights: HarvestMillWeightEntry[] = [];
  const peopleLogs: HarvestPeopleEntry[] = [];
  for (const log of campaign.dayLogs) {
    if (log.skipped) continue;
    if (log.oliveKg && log.oliveKg > 0) {
      millWeights.push({
        id: `legacy-mill-${log.date}-${log.fieldId || 'farm'}`,
        date: log.date,
        kg: log.oliveKg,
        fieldIds: log.fieldId ? [log.fieldId] : [],
        sackIds: [],
        createdAt: log.date,
      });
    }
    if (log.people && log.people > 0) {
      peopleLogs.push({
        id: `legacy-people-${log.date}`,
        date: log.date,
        people: log.people,
        hours: log.hours && log.hours > 0 && log.hours < 6 ? 'half' : log.hours ? 'other' : 'full',
        otherHours: log.hours,
        createdAt: log.date,
      });
    }
  }
  return { ...campaign, millWeights, peopleLogs };
};

export const parseCampaign = (raw: unknown, seasonStartYear: number): HarvestCampaign => {
  const base = emptyCampaign(seasonStartYear);
  if (!isRecord(raw)) return base;
  const status = raw.status;
  const parsed: HarvestCampaign = {
    seasonStartYear,
    status:
      status === 'active' || status === 'paused' || status === 'closed' || status === 'idle'
        ? status
        : 'idle',
    startedAt: asString(raw.startedAt),
    closedAt: asString(raw.closedAt),
    pausedAt: asString(raw.pausedAt),
    fieldOrder: asStringArray(raw.fieldOrder),
    groveDoneIds: asStringArray(raw.groveDoneIds),
    millName: typeof raw.millName === 'string' ? raw.millName : '',
    expectedOilLitres: typeof raw.expectedOilLitres === 'number' ? raw.expectedOilLitres : null,
    usualSackKg: asNumber(raw.usualSackKg) ?? 45,
    dayLogs: Array.isArray(raw.dayLogs)
      ? raw.dayLogs.map(parseDayLog).filter((row): row is HarvestDayLog => Boolean(row))
      : [],
    sacks: Array.isArray(raw.sacks)
      ? raw.sacks.map(parseSack).filter((row): row is HarvestSackEntry => Boolean(row))
      : [],
    millWeights: Array.isArray(raw.millWeights)
      ? raw.millWeights.map(parseMillWeight).filter((row): row is HarvestMillWeightEntry => Boolean(row))
      : [],
    oils: Array.isArray(raw.oils)
      ? raw.oils.map(parseOil).filter((row): row is HarvestOilEntry => Boolean(row))
      : [],
    peopleLogs: Array.isArray(raw.peopleLogs)
      ? raw.peopleLogs.map(parsePeople).filter((row): row is HarvestPeopleEntry => Boolean(row))
      : [],
    expenses: Array.isArray(raw.expenses)
      ? raw.expenses.map(parseExpense).filter((row): row is HarvestExpenseEntry => Boolean(row))
      : [],
    incomes: Array.isArray(raw.incomes)
      ? raw.incomes.map(parseExpense).filter((row): row is HarvestExpenseEntry => Boolean(row))
      : [],
    notes: Array.isArray(raw.notes)
      ? raw.notes.map(parseNote).filter((row): row is HarvestNoteEntry => Boolean(row))
      : [],
    closedDays: asStringArray(raw.closedDays),
  };
  return migrateDayLogs(parsed);
};

export const loadCampaign = async (
  userId: string,
  seasonStartYear: number
): Promise<HarvestCampaign> => {
  try {
    const raw = await AsyncStorage.getItem(campaignStorageKey(userId, seasonStartYear));
    if (!raw) return emptyCampaign(seasonStartYear);
    return parseCampaign(JSON.parse(raw), seasonStartYear);
  } catch {
    return emptyCampaign(seasonStartYear);
  }
};

export const saveCampaign = async (userId: string, campaign: HarvestCampaign): Promise<void> => {
  await AsyncStorage.setItem(
    campaignStorageKey(userId, campaign.seasonStartYear),
    JSON.stringify(campaign)
  );
};

export const startCampaign = (
  campaign: HarvestCampaign,
  input: { fieldOrder: string[]; millName?: string; expectedOilLitres?: number | null },
  now = new Date()
): HarvestCampaign => ({
  ...campaign,
  status: 'active',
  startedAt: now.toISOString(),
  closedAt: undefined,
  pausedAt: undefined,
  fieldOrder: input.fieldOrder,
  groveDoneIds: [],
  millName: input.millName?.trim() || '',
  expectedOilLitres: input.expectedOilLitres ?? null,
});

export const stopCampaign = (campaign: HarvestCampaign, now = new Date()): HarvestCampaign => ({
  ...campaign,
  status: 'closed',
  closedAt: now.toISOString(),
  pausedAt: undefined,
});

export const pauseCampaign = (campaign: HarvestCampaign, now = new Date()): HarvestCampaign => ({
  ...campaign,
  status: 'paused',
  pausedAt: now.toISOString(),
});

export const resumeCampaign = (campaign: HarvestCampaign): HarvestCampaign => ({
  ...campaign,
  status: 'active',
  pausedAt: undefined,
});

export const moveField = (order: string[], fieldId: string, direction: -1 | 1): string[] => {
  const index = order.indexOf(fieldId);
  if (index < 0) return order;
  const next = index + direction;
  if (next < 0 || next >= order.length) return order;
  const copy = [...order];
  const [row] = copy.splice(index, 1);
  copy.splice(next, 0, row);
  return copy;
};

export const toggleGroveDone = (campaign: HarvestCampaign, fieldId: string): HarvestCampaign => {
  const done = campaign.groveDoneIds.includes(fieldId)
    ? campaign.groveDoneIds.filter((id) => id !== fieldId)
    : [...campaign.groveDoneIds, fieldId];
  return { ...campaign, groveDoneIds: done };
};

export const upsertDayLog = (campaign: HarvestCampaign, log: HarvestDayLog): HarvestCampaign => {
  const next = campaign.dayLogs.filter((row) => {
    if (log.skipped) return !(row.date === log.date && row.skipped);
    return !(row.date === log.date && row.fieldId === log.fieldId && !row.skipped);
  });
  return { ...campaign, dayLogs: [...next, log] };
};

export const logForDate = (campaign: HarvestCampaign, date: string) =>
  campaign.dayLogs.find((row) => row.date === date && !row.skipped) ??
  campaign.dayLogs.find((row) => row.date === date);

export const nextGroveId = (campaign: HarvestCampaign): string | undefined =>
  campaign.fieldOrder.find((id) => !campaign.groveDoneIds.includes(id));

export const skipReasons: HarvestSkipReason[] = ['rain', 'no_crew', 'mill', 'rest', 'other'];

export const addSack = (campaign: HarvestCampaign, entry: HarvestSackEntry): HarvestCampaign => ({
  ...campaign,
  sacks: [...campaign.sacks, entry],
  usualSackKg: entry.kgPerSack ?? campaign.usualSackKg,
});

export const addMillWeight = (
  campaign: HarvestCampaign,
  entry: HarvestMillWeightEntry
): HarvestCampaign => {
  const linked = new Set(entry.sackIds);
  const shares =
    entry.fieldShares && entry.fieldShares.length > 0
      ? entry.fieldShares
      : sharesFromSacks(campaign.sacks, entry.sackIds, entry.fieldIds);
  const normalized: HarvestMillWeightEntry = {
    ...entry,
    fieldShares: shares,
    fieldIds: fieldIdsFromShares(shares).length > 0 ? fieldIdsFromShares(shares) : entry.fieldIds,
  };
  return {
    ...campaign,
    millWeights: [...campaign.millWeights, normalized],
    sacks: campaign.sacks.map((sack) =>
      linked.has(sack.id) ? { ...sack, millWeightId: normalized.id } : sack
    ),
  };
};

export const addOil = (campaign: HarvestCampaign, entry: HarvestOilEntry): HarvestCampaign => {
  const shares =
    entry.fieldShares && entry.fieldShares.length > 0
      ? entry.fieldShares
      : undefined;
  const normalized: HarvestOilEntry = shares
    ? {
        ...entry,
        fieldShares: shares,
        fieldIds: fieldIdsFromShares(shares).length > 0 ? fieldIdsFromShares(shares) : entry.fieldIds,
      }
    : entry;
  return {
    ...campaign,
    oils: [...campaign.oils, normalized],
  };
};

export const addPeople = (campaign: HarvestCampaign, entry: HarvestPeopleEntry): HarvestCampaign => ({
  ...campaign,
  peopleLogs: [...campaign.peopleLogs, entry],
});

export const addExpense = (campaign: HarvestCampaign, entry: HarvestExpenseEntry): HarvestCampaign => ({
  ...campaign,
  expenses: [...campaign.expenses, entry],
});

export const addIncome = (campaign: HarvestCampaign, entry: HarvestExpenseEntry): HarvestCampaign => ({
  ...campaign,
  incomes: [...(campaign.incomes || []), entry],
});

export const addNote = (campaign: HarvestCampaign, entry: HarvestNoteEntry): HarvestCampaign => ({
  ...campaign,
  notes: [...campaign.notes, entry],
});

export const updateSack = (
  campaign: HarvestCampaign,
  id: string,
  patch: Partial<Pick<HarvestSackEntry, 'sacks' | 'fieldId' | 'kgPerSack' | 'date'>>
): HarvestCampaign => ({
  ...campaign,
  sacks: campaign.sacks.map((row) => (row.id === id ? { ...row, ...patch } : row)),
  usualSackKg: patch.kgPerSack ?? campaign.usualSackKg,
});

export const removeSack = (campaign: HarvestCampaign, id: string): HarvestCampaign => ({
  ...campaign,
  sacks: campaign.sacks.filter((row) => row.id !== id),
  millWeights: campaign.millWeights.map((mill) => ({
    ...mill,
    sackIds: mill.sackIds.filter((sackId) => sackId !== id),
  })),
});

export const updateMillWeight = (
  campaign: HarvestCampaign,
  id: string,
  next: Omit<
    HarvestMillWeightEntry,
    'id' | 'createdAt' | 'harvestRecordId' | 'harvestRecordIds' | 'batchId'
  > &
    Partial<Pick<HarvestMillWeightEntry, 'createdAt' | 'harvestRecordId' | 'harvestRecordIds' | 'batchId'>>
): HarvestCampaign => {
  const previous = campaign.millWeights.find((row) => row.id === id);
  if (!previous) return campaign;
  const linked = new Set(next.sackIds);
  const shares =
    next.fieldShares && next.fieldShares.length > 0
      ? next.fieldShares
      : sharesFromSacks(campaign.sacks, next.sackIds, next.fieldIds);
  const normalized: HarvestMillWeightEntry = {
    ...previous,
    ...next,
    id,
    fieldShares: shares,
    fieldIds: fieldIdsFromShares(shares).length > 0 ? fieldIdsFromShares(shares) : next.fieldIds,
  };
  return {
    ...campaign,
    millWeights: campaign.millWeights.map((row) => (row.id === id ? normalized : row)),
    sacks: campaign.sacks.map((sack) => {
      if (linked.has(sack.id)) return { ...sack, millWeightId: id };
      if (sack.millWeightId === id) {
        const { millWeightId: _drop, ...rest } = sack;
        return rest;
      }
      return sack;
    }),
  };
};

export const removeMillWeight = (campaign: HarvestCampaign, id: string): HarvestCampaign => ({
  ...campaign,
  millWeights: campaign.millWeights.filter((row) => row.id !== id),
  sacks: campaign.sacks.map((sack) => {
    if (sack.millWeightId !== id) return sack;
    const { millWeightId: _drop, ...rest } = sack;
    return rest;
  }),
  oils: campaign.oils.map((oil) => ({
    ...oil,
    millWeightIds: oil.millWeightIds.filter((millId) => millId !== id),
  })),
});

export const updateOil = (
  campaign: HarvestCampaign,
  id: string,
  patch: Partial<
    Pick<
      HarvestOilEntry,
      | 'amount'
      | 'unit'
      | 'millKept'
      | 'tin16Count'
      | 'tin17Count'
      | 'tinSizeLitres'
      | 'tinCount'
      | 'tinLines'
      | 'extraLitres'
      | 'cellarAllocations'
      | 'millWeightIds'
      | 'fieldIds'
      | 'fieldShares'
      | 'acidity'
      | 'note'
      | 'date'
      | 'cellarOwnerUserId'
    >
  >
): HarvestCampaign => ({
  ...campaign,
  oils: campaign.oils.map((row) => {
    if (row.id !== id) return row;
    const next = { ...row, ...patch };
    if (patch.fieldShares && patch.fieldShares.length > 0) {
      next.fieldShares = patch.fieldShares;
      next.fieldIds =
        fieldIdsFromShares(patch.fieldShares).length > 0
          ? fieldIdsFromShares(patch.fieldShares)
          : next.fieldIds;
    }
    return next;
  }),
});

export const removeOil = (campaign: HarvestCampaign, id: string): HarvestCampaign => ({
  ...campaign,
  oils: campaign.oils.filter((row) => row.id !== id),
});

export const updatePeople = (
  campaign: HarvestCampaign,
  id: string,
  patch: Partial<Pick<HarvestPeopleEntry, 'people' | 'hours' | 'otherHours' | 'date'>>
): HarvestCampaign => ({
  ...campaign,
  peopleLogs: campaign.peopleLogs.map((row) => (row.id === id ? { ...row, ...patch } : row)),
});

export const removePeople = (campaign: HarvestCampaign, id: string): HarvestCampaign => ({
  ...campaign,
  peopleLogs: campaign.peopleLogs.filter((row) => row.id !== id),
});

export const closeHarvestDay = (campaign: HarvestCampaign, date: string): HarvestCampaign =>
  campaign.closedDays.includes(date)
    ? campaign
    : { ...campaign, closedDays: [...campaign.closedDays, date] };

export const reopenHarvestDay = (campaign: HarvestCampaign, date: string): HarvestCampaign => ({
  ...campaign,
  closedDays: campaign.closedDays.filter((day) => day !== date),
});

export const linkSacksToMill = (
  campaign: HarvestCampaign,
  millId: string,
  sackIds: string[]
): HarvestCampaign => {
  const linked = new Set(sackIds);
  return {
    ...campaign,
    millWeights: campaign.millWeights.map((row) => {
      if (row.id !== millId) return row;
      const shares = sharesFromSacks(campaign.sacks, sackIds, row.fieldIds);
      return {
        ...row,
        sackIds,
        fieldShares: shares,
        fieldIds: fieldIdsFromShares(shares).length > 0 ? fieldIdsFromShares(shares) : row.fieldIds,
      };
    }),
    sacks: campaign.sacks.map((sack) => {
      if (linked.has(sack.id)) return { ...sack, millWeightId: millId };
      if (sack.millWeightId === millId) return { ...sack, millWeightId: undefined };
      return sack;
    }),
  };
};

export const setUsualSackKg = (campaign: HarvestCampaign, kg: number | null): HarvestCampaign => ({
  ...campaign,
  usualSackKg: kg,
});

export const unconfirmedSacks = (campaign: HarvestCampaign, fieldIds?: string[]) => {
  const allowed = fieldIds && fieldIds.length > 0 ? new Set(fieldIds) : null;
  return campaign.sacks.filter((sack) => {
    if (sack.millWeightId) return false;
    if (allowed && !allowed.has(sack.fieldId)) return false;
    return true;
  });
};
