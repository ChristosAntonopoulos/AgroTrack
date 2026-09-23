export type TaskFormTypeId =
  | 'irrigation'
  | 'fly'
  | 'fertilisation'
  | 'pruning'
  | 'weeds'
  | 'harvest'
  | 'other';

export type TaskFormTypeOption = {
  id: TaskFormTypeId;
  templateCode?: string;
  labelKey: string;
  suggestionsKey: string;
};

/** The jobs a grower actually starts. Everything else is custom work. */
export const TASK_FORM_TYPES: TaskFormTypeOption[] = [
  { id: 'irrigation', templateCode: 'T08', labelKey: 'fieldWork.form.types.irrigation', suggestionsKey: 'fieldWork.form.suggestions.irrigation' },
  { id: 'fly', templateCode: 'T14', labelKey: 'fieldWork.form.types.fly', suggestionsKey: 'fieldWork.form.suggestions.fly' },
  { id: 'fertilisation', templateCode: 'T05', labelKey: 'fieldWork.form.types.fertilisation', suggestionsKey: 'fieldWork.form.suggestions.fertilisation' },
  { id: 'pruning', templateCode: 'T06', labelKey: 'fieldWork.form.types.pruning', suggestionsKey: 'fieldWork.form.suggestions.pruning' },
  { id: 'weeds', templateCode: 'T09', labelKey: 'fieldWork.form.types.weeds', suggestionsKey: 'fieldWork.form.suggestions.weeds' },
  { id: 'harvest', templateCode: 'T21', labelKey: 'fieldWork.form.types.harvest', suggestionsKey: 'fieldWork.form.suggestions.harvest' },
  { id: 'other', labelKey: 'fieldWork.form.types.other', suggestionsKey: 'fieldWork.form.suggestions.other' },
];

export type LeanCheck = { key: string; el: string; en: string };

/** Two or three checks. The same list the catalogue copies onto a new task. */
export const LEAN_CHECKS: Record<string, LeanCheck[]> = {
  T08: [
    { key: 'pump', el: 'Η αντλία ξεκινά', en: 'Pump starts' },
    { key: 'leaks', el: 'Δεν υπάρχουν διαρροές', en: 'No visible leaks' },
    { key: 'pressure', el: 'Η πίεση είναι κανονική', en: 'Pressure is normal' },
  ],
  T14: [
    { key: 'catches', el: 'Καταμετρήθηκαν οι συλλήψεις', en: 'Trap catches counted' },
    { key: 'fruit', el: 'Ελέγχθηκαν καρποί', en: 'Fruit checked' },
    { key: 'photos', el: 'Φωτογραφία αν υπάρχει ζημιά', en: 'Photo if there is damage' },
  ],
  T05: [
    { key: 'product', el: 'Σωστό λίπασμα', en: 'Correct fertiliser' },
    { key: 'quantity', el: 'Καταγράφηκε η ποσότητα', en: 'Quantity recorded' },
    { key: 'finished', el: 'Ολοκληρώθηκε το χωράφι', en: 'Field finished' },
  ],
  T06: [
    { key: 'damaged', el: 'Αφαιρέθηκαν τα κατεστραμμένα κλαδιά', en: 'Damaged branches removed' },
    { key: 'tools', el: 'Τα εργαλεία καθαρίστηκαν', en: 'Tools cleaned' },
    { key: 'area', el: 'Ολοκληρώθηκε η έκταση', en: 'Area finished' },
  ],
  T09: [
    { key: 'area', el: 'Ολοκληρώθηκε η έκταση', en: 'Area finished' },
    { key: 'method', el: 'Καταγράφηκε ο τρόπος', en: 'Method recorded' },
    { key: 'photos', el: 'Φωτογραφία αν χρειάζεται', en: 'Photo if needed' },
  ],
  T21: [
    { key: 'area', el: 'Ολοκληρώθηκε η έκταση', en: 'Area finished' },
    { key: 'olive_kg', el: 'Καταγράφηκαν τα κιλά', en: 'Kilograms recorded' },
    { key: 'photos', el: 'Φωτογραφία της συγκομιδής', en: 'Harvest photo' },
  ],
};

const TEMPLATE_TO_TYPE: Record<string, TaskFormTypeId> = {
  T05: 'fertilisation',
  T06: 'pruning',
  T08: 'irrigation',
  T09: 'weeds',
  T14: 'fly',
  T15: 'irrigation',
  T18: 'harvest',
  T19: 'harvest',
  T21: 'harvest',
};

export const typeFromTemplate = (code?: string): TaskFormTypeId | '' => {
  if (!code) return '';
  return TEMPLATE_TO_TYPE[code.toUpperCase()] || 'other';
};

export const templateFromType = (typeId?: string): string | undefined =>
  TASK_FORM_TYPES.find((option) => option.id === typeId)?.templateCode;

export const checksForTemplate = (code?: string): LeanCheck[] => {
  if (!code) return [];
  return LEAN_CHECKS[code.toUpperCase()] || [];
};
