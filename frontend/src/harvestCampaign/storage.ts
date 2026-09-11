import { emptyCampaign, type HarvestCampaign, type HarvestDayLog, type HarvestSkipReason } from './types';

export const campaignStorageKey = (userId: string, seasonStartYear: number) =>
  `oleachron.harvestCampaign.${userId}.${seasonStartYear}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const parseDayLog = (value: unknown): HarvestDayLog | null => {
  if (!isRecord(value) || typeof value.date !== 'string') return null;
  const skipReason = value.skipReason;
  return {
    date: value.date,
    fieldId: typeof value.fieldId === 'string' ? value.fieldId : undefined,
    oliveKg: typeof value.oliveKg === 'number' ? value.oliveKg : undefined,
    people: typeof value.people === 'number' ? value.people : undefined,
    hours: typeof value.hours === 'number' ? value.hours : undefined,
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

export const parseCampaign = (raw: unknown, seasonStartYear: number): HarvestCampaign => {
  const base = emptyCampaign(seasonStartYear);
  if (!isRecord(raw)) return base;
  const status = raw.status;
  return {
    seasonStartYear,
    status:
      status === 'active' || status === 'paused' || status === 'closed' || status === 'idle'
        ? status
        : 'idle',
    startedAt: typeof raw.startedAt === 'string' ? raw.startedAt : undefined,
    closedAt: typeof raw.closedAt === 'string' ? raw.closedAt : undefined,
    pausedAt: typeof raw.pausedAt === 'string' ? raw.pausedAt : undefined,
    fieldOrder: asStringArray(raw.fieldOrder),
    groveDoneIds: asStringArray(raw.groveDoneIds),
    millName: typeof raw.millName === 'string' ? raw.millName : '',
    expectedOilLitres: typeof raw.expectedOilLitres === 'number' ? raw.expectedOilLitres : null,
    dayLogs: Array.isArray(raw.dayLogs)
      ? raw.dayLogs.map(parseDayLog).filter((row): row is HarvestDayLog => Boolean(row))
      : [],
  };
};

export const loadCampaign = (userId: string, seasonStartYear: number): HarvestCampaign => {
  try {
    const raw = localStorage.getItem(campaignStorageKey(userId, seasonStartYear));
    if (!raw) return emptyCampaign(seasonStartYear);
    return parseCampaign(JSON.parse(raw), seasonStartYear);
  } catch {
    return emptyCampaign(seasonStartYear);
  }
};

export const saveCampaign = (userId: string, campaign: HarvestCampaign) => {
  localStorage.setItem(campaignStorageKey(userId, campaign.seasonStartYear), JSON.stringify(campaign));
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
