export type CaptureType = 'observation' | 'work' | 'expense' | 'income' | 'harvest' | 'money';

export type CaptureContext = {
  fieldId?: string;
  taskId?: string;
  harvestId?: string;
  preferredType?: CaptureType;
  occurredAt?: string;
};

export const CAPTURE_SAVED_EVENT = 'oleachron:capture-saved';

export type CaptureSavedDetail = {
  type: CaptureType;
  fieldId: string;
  sourceId?: string;
};

export type CaptureSavedOptions = {
  transactionId?: string;
  status?: 'draft' | 'posted';
  reopen?: CaptureContext;
};
