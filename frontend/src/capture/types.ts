export type CaptureType = 'observation' | 'work' | 'expense' | 'harvest';

export type CaptureContext = {
  fieldId?: string;
  taskId?: string;
  preferredType?: CaptureType;
  occurredAt?: string;
};

export type CapturePermissions = {
  canRecordObservation: boolean;
  canRecordWork: boolean;
  canRecordExpense: boolean;
  canRecordHarvest: boolean;
};

export const CAPTURE_SAVED_EVENT = 'oleachron:capture-saved';

export type CaptureSavedDetail = {
  type: CaptureType;
  fieldId: string;
  sourceId?: string;
};
