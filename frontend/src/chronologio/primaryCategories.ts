export type ChronologioPrimaryCategory =
  | 'work'
  | 'observation'
  | 'money'
  | 'harvest'
  | 'weather'
  | 'field_change';

const SOURCE_TO_PRIMARY: Record<string, ChronologioPrimaryCategory> = {
  task: 'work',
  work: 'work',
  note: 'observation',
  photo: 'observation',
  observation: 'observation',
  observations: 'observation',
  expense: 'money',
  income: 'money',
  money: 'money',
  harvest: 'harvest',
  weather: 'weather',
  weather_warning: 'weather',
  intelligence: 'weather',
  lifecycle: 'field_change',
  collaborator: 'field_change',
  activity: 'field_change',
  field_change: 'field_change',
};

const PRIMARY_EL: Record<ChronologioPrimaryCategory, { singular: string; plural: string }> = {
  work: { singular: 'Εργασία', plural: 'Εργασίες' },
  observation: { singular: 'Παρατήρηση', plural: 'Παρατηρήσεις' },
  money: { singular: 'Χρήματα', plural: 'Χρήματα' },
  harvest: { singular: 'Συγκομιδή', plural: 'Συγκομιδή' },
  weather: { singular: 'Καιρός', plural: 'Καιρός & προειδοποιήσεις' },
  field_change: { singular: 'Αλλαγή χωραφιού', plural: 'Αλλαγές χωραφιού' },
};

const PRIMARY_EN: Record<ChronologioPrimaryCategory, { singular: string; plural: string }> = {
  work: { singular: 'Work', plural: 'Work' },
  observation: { singular: 'Note', plural: 'Notes' },
  money: { singular: 'Money', plural: 'Money' },
  harvest: { singular: 'Harvest', plural: 'Harvest' },
  weather: { singular: 'Weather', plural: 'Weather & warnings' },
  field_change: { singular: 'Field change', plural: 'Field changes' },
};

export const SIMPLE_PRIMARY_CATEGORIES: ChronologioPrimaryCategory[] = [
  'work',
  'observation',
  'money',
  'harvest',
  'weather',
];

export const FULL_PRIMARY_CATEGORIES: ChronologioPrimaryCategory[] = [
  ...SIMPLE_PRIMARY_CATEGORIES,
  'field_change',
];

export const toPrimaryCategory = (source?: string | null): ChronologioPrimaryCategory =>
  SOURCE_TO_PRIMARY[(source || '').trim().toLowerCase()] || 'work';

export const presentPrimaryCategory = (
  source: string,
  language = 'el',
  singular = false
): string => {
  const key = toPrimaryCategory(source);
  const table = language.toLowerCase().startsWith('en') ? PRIMARY_EN : PRIMARY_EL;
  return singular ? table[key].singular : table[key].plural;
};
