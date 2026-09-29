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

const RAIL_EL = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];
const RAIL_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RAIL_IT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

/** Slim navigator label: Σεπ, Οκτ — not the uppercase table used in dense rails. */
export const railMonthLabel = (month: number, language: string): string => {
  const lang = language.toLowerCase();
  const table = lang.startsWith('el') ? RAIL_EL : lang.startsWith('it') ? RAIL_IT : RAIL_EN;
  return table[month - 1] || '';
};

export type MonthFocus = 'harvest' | 'work' | 'observation' | 'money';

/**
 * What the sticky month chip should name.
 * Harvest wins whenever the month has a harvest record — that is the case
 * where a card alone does not tell you which season you are in.
 */
export const monthFocusKey = (counts: Record<MonthFocus, number>): MonthFocus | null => {
  if (counts.harvest > 0) return 'harvest';
  const ranked = (['work', 'observation', 'money'] as const)
    .map((key) => ({ key, n: counts[key] }))
    .sort((a, b) => b.n - a.n);
  return ranked[0].n > 0 ? ranked[0].key : null;
};

export type YearGlanceSlot = 'oil' | 'olives' | 'expenses' | 'records';

/** Two or three totals for a year chapter. Oil leads; olives fill in when oil is absent. */
export const yearGlanceSlots = (input: {
  oilKg: number;
  oliveKg: number;
  expenseTotal: number;
  recordCount: number;
}): YearGlanceSlot[] => {
  const slots: YearGlanceSlot[] = [];
  if (input.oilKg > 0) slots.push('oil');
  else if (input.oliveKg > 0) slots.push('olives');
  if (input.expenseTotal > 0) slots.push('expenses');
  if (input.recordCount > 0) slots.push('records');
  if (slots.length < 2 && input.oilKg > 0 && input.oliveKg > 0) slots.splice(1, 0, 'olives');
  return slots.slice(0, 3);
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
