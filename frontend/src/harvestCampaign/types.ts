export type HarvestCampaignStatus = 'idle' | 'active' | 'paused' | 'closed';

export type HarvestSkipReason = 'rain' | 'no_crew' | 'mill' | 'rest' | 'other';

export type HarvestPeopleHours = 'half' | 'full' | 'other' | 'skip';

export type HarvestOilUnit = 'kg' | 'litres';

export type HarvestFieldStatus = 'not_started' | 'in_progress' | 'done';

export type HarvestModeView = 'today' | 'fields' | 'totals' | 'log';

export type HarvestCaptureKind = 'sacks' | 'mill' | 'oil' | 'people' | 'expense' | 'note';

/** @deprecated Kept so older localStorage campaigns still parse. */
export type HarvestDayLog = {
  date: string;
  fieldId?: string;
  oliveKg?: number;
  people?: number;
  hours?: number;
  skipped?: boolean;
  skipReason?: HarvestSkipReason;
  millVisit?: boolean;
};

export type HarvestSackEntry = {
  id: string;
  date: string;
  fieldId: string;
  sacks: number;
  kgPerSack?: number;
  millWeightId?: string;
  harvestRecordId?: string;
  createdAt: string;
};

/** Relative weight for a field on a shared mill/oil lot (usually sack count). */
export type HarvestFieldShare = {
  fieldId: string;
  weight: number;
};

export type HarvestMillWeightEntry = {
  id: string;
  date: string;
  kg: number;
  fieldIds: string[];
  /** Sack-weighted (or manual) shares; when missing, derived from linked sacks / equal fieldIds. */
  fieldShares?: HarvestFieldShare[];
  sackIds: string[];
  /** Mill ticket / receipt reference (separate from free-form note). */
  receiptRef?: string;
  note?: string;
  photoCount?: number;
  /** Shared batch id for multi-field persist; also stored on each HarvestRecord. */
  batchId?: string;
  harvestRecordId?: string;
  /** All harvest record ids when the lot was split across fields. */
  harvestRecordIds?: string[];
  createdAt: string;
};

export type HarvestOilEntry = {
  id: string;
  date: string;
  amount: number;
  unit: HarvestOilUnit;
  /**
   * What the mill kept, in the same unit as `amount`.
   * 0 means the mill took no oil (paid another way).
   */
  millKept?: number;
  /** 16 L tins the farmer stored. Can be combined with 17 L tins. */
  tin16Count?: number;
  /** 17 L tins the farmer stored. Can be combined with 16 L tins. */
  tin17Count?: number;
  /** Original single-size tin entry. Kept so older campaigns still open. */
  tinSizeLitres?: 16 | 17;
  tinCount?: number;
  extraLitres?: number;
  millWeightIds: string[];
  fieldIds: string[];
  fieldShares?: HarvestFieldShare[];
  acidity?: number;
  note?: string;
  batchId?: string;
  harvestRecordId?: string;
  harvestRecordIds?: string[];
  /** Litres already sold from this lot (farmer share). */
  soldLitres?: number;
  /** Pack already sold — subtracted from stored tins / bulk on the next sale. */
  soldTin16?: number;
  soldTin17?: number;
  soldBulkLitres?: number;
  createdAt: string;
};

export type HarvestPeopleEntry = {
  id: string;
  date: string;
  people: number;
  hours: HarvestPeopleHours;
  otherHours?: number;
  costEur?: number;
  addedToMoney?: boolean;
  harvestRecordId?: string;
  createdAt: string;
};

export type HarvestExpenseEntry = {
  id: string;
  date: string;
  amountEur: number;
  note?: string;
  transactionId?: string;
  createdAt: string;
};

export type HarvestNoteEntry = {
  id: string;
  date: string;
  body?: string;
  photoCount?: number;
  noteId?: string;
  createdAt: string;
};

export type HarvestCampaign = {
  seasonStartYear: number;
  status: HarvestCampaignStatus;
  startedAt?: string;
  closedAt?: string;
  pausedAt?: string;
  fieldOrder: string[];
  groveDoneIds: string[];
  millName?: string;
  expectedOilLitres?: number | null;
  usualSackKg?: number | null;
  dayLogs: HarvestDayLog[];
  sacks: HarvestSackEntry[];
  millWeights: HarvestMillWeightEntry[];
  oils: HarvestOilEntry[];
  peopleLogs: HarvestPeopleEntry[];
  expenses: HarvestExpenseEntry[];
  notes: HarvestNoteEntry[];
  closedDays: string[];
};

export const emptyCampaign = (seasonStartYear: number): HarvestCampaign => ({
  seasonStartYear,
  status: 'idle',
  fieldOrder: [],
  groveDoneIds: [],
  millName: '',
  expectedOilLitres: null,
  usualSackKg: 45,
  dayLogs: [],
  sacks: [],
  millWeights: [],
  oils: [],
  peopleLogs: [],
  expenses: [],
  notes: [],
  closedDays: [],
});

export const isHarvestLive = (status: HarvestCampaignStatus) =>
  status === 'active' || status === 'paused';

export const HARVEST_METHOD_SACKS = 'sacks';
export const HARVEST_METHOD_MILL = 'mill';
export const HARVEST_METHOD_OIL = 'oil';
export const HARVEST_METHOD_PEOPLE = 'people';
