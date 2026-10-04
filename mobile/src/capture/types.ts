import type { FinancialCategory } from '../finance/display';

export type CaptureType =
  | 'observation'
  | 'work'
  | 'expense'
  | 'income'
  | 'harvest'
  | 'money'
  | 'photo'
  | 'voice'
  | 'document';

/** Catalog section ids (formerly horizontal tabs — Quick Add no longer uses a tab strip). */
export type CaptureTab = 'day' | 'grove' | 'warehouse' | 'money';

export const CAPTURE_TABS: CaptureTab[] = ['day', 'grove', 'warehouse', 'money'];

/** Which screen opened + — drives Quick Add presets when route name alone is weak. */
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
  /** Page that opened + (overrides route-based preset resolution when set). */
  sourcePage?: CaptureSourcePage;
  occurredAt?: string;
  dateNeedsChoice?: boolean;
  dateDefaultedToToday?: boolean;
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
