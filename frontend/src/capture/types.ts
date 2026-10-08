import type { FinancialCategory } from '../finance/display';

export type CaptureType =
  | 'observation'
  | 'photo'
  | 'scheduleWork'
  | 'recordWork'
  | 'expense'
  | 'income'
  | 'harvest'
  | 'money'
  | 'voice'
  | 'document';

/** Catalog section ids (formerly horizontal tabs — Quick Add no longer uses a tab strip). */
export type CaptureTab = 'day' | 'grove' | 'warehouse' | 'money';

export const CAPTURE_TABS: CaptureTab[] = ['day', 'grove', 'warehouse', 'money'];

/** Which screen opened + — drives Quick Add presets when pathname alone is weak. */
export type CaptureSourcePage =
  | 'home'
  | 'grove'
  | 'harvest'
  | 'warehouse'
  | 'money'
  | 'tasks'
  | 'photos'
  | 'chronologio';

export type CaptureContext = {
  fieldId?: string;
  taskId?: string;
  harvestId?: string;
  preferredType?: CaptureType;
  /** @deprecated Quick Add no longer uses tabs; kept for catalog section ids only. */
  tab?: CaptureTab;
  /** Page that opened + (overrides pathname-based preset resolution when set). */
  sourcePage?: CaptureSourcePage;
  occurredAt?: string;
  /** Chronologio: date was forced to today because the user is not on Days of the live month. */
  dateDefaultedToToday?: boolean;
  /** Past month or past agricultural year — confirm a date inside that period. */
  dateNeedsChoice?: boolean;
  periodLabel?: string;
  category?: FinancialCategory;
  description?: string;
  harvestCampaignLink?: boolean;
};

export type CapturePermissions = {
  canRecordObservation: boolean;
  canRecordPhoto: boolean;
  canRecordWork: boolean;
  canRecordExpense: boolean;
  canRecordIncome: boolean;
  canRecordHarvest: boolean;
  canRecordMoney: boolean;
  canRecordVoice: boolean;
  canRecordDocument: boolean;
};

export const CAPTURE_SAVED_EVENT = 'oleachron:capture-saved';

export type CaptureSavedDetail = {
  type: CaptureType;
  fieldId: string;
  sourceId?: string;
  amount?: number;
  occurredOn?: string;
  description?: string;
  harvestCampaignLink?: boolean;
};

export type CaptureSavedOptions = {
  transactionId?: string;
  status?: 'draft' | 'posted';
  reopen?: CaptureContext;
};
