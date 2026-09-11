import type { ChronologioEntry } from '../services/chronologioService';
import { eventAccentToken, type EventAccentToken } from './eventCardLayout';

export type ChronologioDetailKind =
  | 'task'
  | 'observation'
  | 'money'
  | 'harvest'
  | 'weatherPeriod'
  | 'warning'
  | 'fieldChange';

export const chronologioDetailKind = (entry: ChronologioEntry): ChronologioDetailKind => {
  if (entry.category === 'intelligence') return 'warning';
  if (
    entry.eventType === 'weather.monthReview' ||
    entry.eventType === 'weather.yearReview' ||
    entry.category === 'weather'
  ) {
    return 'weatherPeriod';
  }
  if (entry.category === 'task') return 'task';
  if (entry.category === 'note' || entry.category === 'photo') return 'observation';
  if (entry.category === 'expense' || entry.category === 'income') return 'money';
  if (entry.category === 'harvest') return 'harvest';
  return 'fieldChange';
};

export const detailAccentToken = (entry: ChronologioEntry): EventAccentToken =>
  eventAccentToken(entry.category, String(entry.importance || ''));
