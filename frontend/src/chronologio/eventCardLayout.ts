import type { ChronologioEntry } from '../services/chronologioService';

export type EventCardSpan = 1 | 2;
export type EventCardSize = 'compact' | 'standard' | 'featured';
export type EventAccentToken =
  | 'work'
  | 'observation'
  | 'expense'
  | 'income'
  | 'harvest'
  | 'weather'
  | 'warning'
  | 'field_change';

const FEATURED_IMPORTANCE = new Set(['critical', 'warning']);

export const eventAccentToken = (
  category?: string | null,
  importance?: string | null
): EventAccentToken => {
  const sev = (importance || '').toLowerCase();
  if (FEATURED_IMPORTANCE.has(sev)) return 'warning';
  switch ((category || '').toLowerCase()) {
    case 'task':
    case 'work':
      return 'work';
    case 'note':
    case 'photo':
    case 'observation':
      return 'observation';
    case 'income':
      return 'income';
    case 'expense':
    case 'money':
      return 'expense';
    case 'harvest':
      return 'harvest';
    case 'weather':
    case 'intelligence':
      return 'weather';
    default:
      return 'field_change';
  }
};

export const isFeaturedChronologioCard = (entry: ChronologioEntry): boolean => {
  const importance = String(entry.importance || '').toLowerCase();
  if (FEATURED_IMPORTANCE.has(importance)) return true;
  if (entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview') {
    return true;
  }
  if (entry.category === 'harvest' && (entry.details.harvest?.oliveKg ?? 0) > 0) return true;
  return Boolean(entry.category === 'task' && (entry.summary || '').length > 160);
};

export const eventCardSpan = (entry: ChronologioEntry): EventCardSpan =>
  isFeaturedChronologioCard(entry) ? 2 : 1;

export const eventCardSize = (entry: ChronologioEntry): EventCardSize => {
  if (isFeaturedChronologioCard(entry)) return 'featured';
  const category = (entry.category || '').toLowerCase();
  if (category === 'expense' || category === 'income' || category === 'note' || category === 'photo') {
    return 'compact';
  }
  return 'standard';
};
