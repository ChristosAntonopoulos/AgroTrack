import type { FinancialCategory } from '../finance/display';

export type CaptureType =
  | 'observation'
  | 'photo'
  | 'work'
  | 'expense'
  | 'income'
  | 'harvest'
  | 'money'
  | 'voice'
  | 'document';

export type CaptureContext = {
  fieldId?: string;
  taskId?: string;
  harvestId?: string;
  preferredType?: CaptureType;
  occurredAt?: string;
  /** Chronologio: date was forced to today because the user is not on Days of the live month. */
  dateDefaultedToToday?: boolean;
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
