import type { ChronologioEntry } from '../services/chronologioService';

const TYPE_IDS = [
  'work',
  'observation',
  'money',
  'harvest',
  'weather',
  'photo',
  'field_change',
  'collaborator',
] as const;

export type ChronologioTypeId = (typeof TYPE_IDS)[number];

export const CHRONOLOGIO_TYPE_IDS: ChronologioTypeId[] = [...TYPE_IDS];

export const selectedChronologioTypes = (raw?: string | null): ChronologioTypeId[] => {
  if (!raw || raw === 'all') return [];
  const ids = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is ChronologioTypeId => (TYPE_IDS as readonly string[]).includes(part));
  return ids.length >= TYPE_IDS.length ? [] : ids;
};

export const chronologioTypesParam = (ids: ChronologioTypeId[]): string => {
  if (ids.length === 0 || ids.length >= TYPE_IDS.length) return 'all';
  return ids.join(',');
};

export const apiCategoryParam = (raw?: string | null): string | undefined => {
  const selected = selectedChronologioTypes(raw);
  if (selected.length !== 1) return undefined;
  return selected[0];
};

const matchesType = (entry: ChronologioEntry, type: ChronologioTypeId): boolean => {
  const category = (entry.category || '').toLowerCase();
  switch (type) {
    case 'work':
      return category === 'task' || category === 'work';
    case 'observation':
      return category === 'note' || category === 'observation';
    case 'money':
      return category === 'expense' || category === 'income' || category === 'money';
    case 'harvest':
      return category === 'harvest';
    case 'weather':
      return category === 'weather' || category === 'intelligence';
    case 'photo':
      return category === 'photo';
    case 'field_change':
      return category === 'lifecycle' || category === 'activity' || category === 'field_change';
    case 'collaborator':
      return category === 'collaborator';
    default:
      return false;
  }
};

export const entryMatchesChronologioTypes = (
  entry: ChronologioEntry,
  raw?: string | null
): boolean => {
  const selected = selectedChronologioTypes(raw);
  if (selected.length === 0) return true;
  return selected.some((type) => matchesType(entry, type));
};
