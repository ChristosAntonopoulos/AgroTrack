export type TaskFormTypeId =
  | 'pruning'
  | 'fertilisation'
  | 'weeds'
  | 'irrigation'
  | 'inspection'
  | 'protection'
  | 'harvest'
  | 'transport'
  | 'maintenance'
  | 'other';

export type TaskFormTypeOption = {
  id: TaskFormTypeId;
  templateCode?: string;
  labelKey: string;
  suggestionsKey: string;
};

export const TASK_FORM_TYPES: TaskFormTypeOption[] = [
  { id: 'pruning', templateCode: 'T06', labelKey: 'fieldWork.form.types.pruning', suggestionsKey: 'fieldWork.form.suggestions.pruning' },
  { id: 'fertilisation', templateCode: 'T05', labelKey: 'fieldWork.form.types.fertilisation', suggestionsKey: 'fieldWork.form.suggestions.fertilisation' },
  { id: 'weeds', templateCode: 'T09', labelKey: 'fieldWork.form.types.weeds', suggestionsKey: 'fieldWork.form.suggestions.weeds' },
  { id: 'irrigation', templateCode: 'T15', labelKey: 'fieldWork.form.types.irrigation', suggestionsKey: 'fieldWork.form.suggestions.irrigation' },
  { id: 'inspection', templateCode: 'T02', labelKey: 'fieldWork.form.types.inspection', suggestionsKey: 'fieldWork.form.suggestions.inspection' },
  { id: 'protection', templateCode: 'T14', labelKey: 'fieldWork.form.types.protection', suggestionsKey: 'fieldWork.form.suggestions.protection' },
  { id: 'harvest', templateCode: 'T21', labelKey: 'fieldWork.form.types.harvest', suggestionsKey: 'fieldWork.form.suggestions.harvest' },
  { id: 'transport', labelKey: 'fieldWork.form.types.transport', suggestionsKey: 'fieldWork.form.suggestions.transport' },
  { id: 'maintenance', templateCode: 'T08', labelKey: 'fieldWork.form.types.maintenance', suggestionsKey: 'fieldWork.form.suggestions.maintenance' },
  { id: 'other', labelKey: 'fieldWork.form.types.other', suggestionsKey: 'fieldWork.form.suggestions.other' },
];

const TEMPLATE_TO_TYPE: Record<string, TaskFormTypeId> = {
  T02: 'inspection',
  T05: 'fertilisation',
  T06: 'pruning',
  T08: 'maintenance',
  T09: 'weeds',
  T14: 'protection',
  T15: 'irrigation',
  T17: 'inspection',
  T18: 'harvest',
  T19: 'harvest',
  T20: 'harvest',
  T21: 'harvest',
};

export const typeFromTemplate = (code?: string): TaskFormTypeId | '' => {
  if (!code) return '';
  return TEMPLATE_TO_TYPE[code.toUpperCase()] || 'other';
};

export const templateFromType = (typeId?: string): string | undefined =>
  TASK_FORM_TYPES.find((option) => option.id === typeId)?.templateCode;
