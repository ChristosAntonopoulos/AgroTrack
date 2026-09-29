import type { ChronologioEntry } from '../services/chronologioService';
import { isCompletedTaskEntry } from './timelineRail';

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
  if (isCompletedTaskEntry(entry)) return false;
  const importance = String(entry.importance || '').toLowerCase();
  if (FEATURED_IMPORTANCE.has(importance)) return true;
  const category = (entry.category || '').toLowerCase();
  if (category === 'note' || category === 'photo' || category === 'observation') return false;
  if (entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview') {
    return true;
  }
  if (category === 'weather') return false;
  if (category === 'harvest') return true;
  return Boolean(category === 'task' && (entry.summary || '').length > 160);
};

export const eventCardSpan = (entry: ChronologioEntry): EventCardSpan =>
  isFeaturedChronologioCard(entry) ? 2 : 1;

export const eventCardSize = (entry: ChronologioEntry): EventCardSize => {
  if (isCompletedTaskEntry(entry)) return 'compact';
  if (isFeaturedChronologioCard(entry)) return 'featured';
  const category = (entry.category || '').toLowerCase();
  if (
    category === 'note' ||
    category === 'photo' ||
    category === 'observation' ||
    category === 'expense' ||
    category === 'income' ||
    category === 'weather'
  ) {
    return 'compact';
  }
  return 'standard';
};
