import type { ChronologioEntry } from '../services/chronologioService';

/** Colour is type only: task, observation/photo, money, harvest. */
export type TimelineDot = 'task' | 'observation' | 'money' | 'harvest' | 'other';

export type MonthRailItem = {
  key: string;
  year: number;
  month: number;
};

const SHORT_EL = ['ΙΑΝ', 'ΦΕΒ', 'ΜΑΡ', 'ΑΠΡ', 'ΜΑΪ', 'ΙΟΥΝ', 'ΙΟΥΛ', 'ΑΥΓ', 'ΣΕΠ', 'ΟΚΤ', 'ΝΟΕ', 'ΔΕΚ'];
const SHORT_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const SHORT_IT = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

export const timelineDotFor = (category: string): TimelineDot => {
  if (category === 'task' || category === 'work') return 'task';
  if (category === 'note' || category === 'photo' || category === 'observation') return 'observation';
  if (category === 'expense' || category === 'income' || category === 'money') return 'money';
  if (category === 'harvest') return 'harvest';
  return 'other';
};

export const isCompletedTaskEntry = (entry: Pick<ChronologioEntry, 'category' | 'details'>): boolean => {
  if (entry.category !== 'task') return false;
  const status = (entry.details.task?.status || '').toLowerCase();
  return status === 'completed' || status === 'done';
};

/** Three-letter rail label. June/July stay four letters in Greek so they do not collide. */
export const shortMonthLabel = (month: number, language: string): string => {
  const lang = language.toLowerCase();
  const table = lang.startsWith('el') ? SHORT_EL : lang.startsWith('it') ? SHORT_IT : SHORT_EN;
  return table[month - 1] || '';
};

/** A short spine around the active month: two newer, current, two older. Never the full year. */
export const nearbyMonthWindow = (months: MonthRailItem[], activeKey: string): MonthRailItem[] => {
  if (months.length === 0) return [];
  const found = months.findIndex((month) => month.key === activeKey);
  const index = found < 0 ? 0 : found;
  const from = Math.max(0, index - 2);
  const to = Math.min(months.length, index + 3);
  return months.slice(from, to);
};
