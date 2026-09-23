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

export type CaptureContext = {
  fieldId?: string;
  taskId?: string;
  harvestId?: string;
  preferredType?: CaptureType;
  occurredAt?: string;
  dateNeedsChoice?: boolean;
  dateDefaultedToToday?: boolean;
  periodLabel?: string;
  category?: FinancialCategory;
  description?: string;
  harvestCampaignLink?: boolean;
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
