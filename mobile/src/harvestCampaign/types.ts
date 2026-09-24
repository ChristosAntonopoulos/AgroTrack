export type HarvestCampaignStatus = 'idle' | 'active' | 'paused' | 'closed';

export type HarvestSkipReason = 'rain' | 'no_crew' | 'mill' | 'rest' | 'other';

export type HarvestPeopleHours = 'half' | 'full' | 'other' | 'skip';

export type HarvestOilUnit = 'kg' | 'litres';

export type HarvestFieldStatus = 'not_started' | 'in_progress' | 'done';

export type HarvestModeView = 'today' | 'fields' | 'totals' | 'log';

export type HarvestCaptureKind = 'sacks' | 'mill' | 'oil' | 'people' | 'expense' | 'income' | 'note';

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
  /** Mill share in the same unit as `amount`. 0 = mill kept no oil. */
  millKept?: number;
  tin16Count?: number;
  tin17Count?: number;
  /** Legacy single-size tin entry. */
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
  soldLitres?: number;
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
  incomes: HarvestExpenseEntry[];
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
  incomes: [],
  notes: [],
  closedDays: [],
});

export const isHarvestLive = (status: HarvestCampaignStatus) =>
  status === 'active' || status === 'paused';

export const HARVEST_METHOD_SACKS = 'sacks';
export const HARVEST_METHOD_MILL = 'mill';
export const HARVEST_METHOD_OIL = 'oil';
export const HARVEST_METHOD_PEOPLE = 'people';
