export type HarvestCampaignStatus = 'idle' | 'active' | 'paused' | 'closed';

export type HarvestSkipReason = 'rain' | 'no_crew' | 'mill' | 'rest' | 'other';

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
  dayLogs: HarvestDayLog[];
};

export const emptyCampaign = (seasonStartYear: number): HarvestCampaign => ({
  seasonStartYear,
  status: 'idle',
  fieldOrder: [],
  groveDoneIds: [],
  millName: '',
  expectedOilLitres: null,
  dayLogs: [],
});

export const isHarvestLive = (status: HarvestCampaignStatus) =>
  status === 'active' || status === 'paused';
