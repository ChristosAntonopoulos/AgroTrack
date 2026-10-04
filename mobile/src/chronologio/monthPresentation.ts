import type { ChronologioEntry, ChronologioMonthSummary } from '../services/chronologioService';
import { periodEventCount } from '../utils/summaryFacts';

export type MonthChapterFocus = 'work' | 'money' | 'harvest' | 'observation';

export const monthFocusApiCategory = (
  focus?: MonthChapterFocus
): 'task' | 'note' | 'harvest' | undefined => {
  if (focus === 'work') return 'task';
  if (focus === 'observation') return 'note';
  if (focus === 'harvest') return 'harvest';
  return undefined;
};

export const entryMatchesMonthFocus = (
  entry: ChronologioEntry,
  focus?: MonthChapterFocus
): boolean => {
  if (!focus) return true;
  const category = (entry.category || '').toLowerCase();
  if (focus === 'work') return category === 'task' || category === 'work';
  if (focus === 'money') return category === 'expense' || category === 'income' || category === 'money';
  if (focus === 'harvest') return category === 'harvest';
  return category === 'note' || category === 'photo' || category === 'observation';
};

export type SeasonStage = 'afterHarvest' | 'spring' | 'summer' | 'harvest';

export const monthSeasonStage = (month: number): SeasonStage => {
  if (month >= 2 && month <= 3) return 'afterHarvest';
  if (month >= 4 && month <= 6) return 'spring';
  if (month >= 7 && month <= 9) return 'summer';
  return 'harvest';
};

export const harvestHasResult = (
  month: Pick<ChronologioMonthSummary, 'oliveKg' | 'oilKg'>
): boolean => month.oliveKg > 0 || month.oilKg > 0;

const GENERIC_HIGHLIGHTS = new Set([
  'observation',
  'παρατήρηση',
  'note',
  'task',
  'εργασία',
  'activity',
  'δραστηριότητα',
  'expense',
  'έξοδο',
  'harvest',
  'συγκομιδή',
]);

export const isMeaningfulHighlight = (value?: string | null): value is string => {
  const text = value?.trim();
  if (!text) return false;
  return !GENERIC_HIGHLIGHTS.has(text.toLowerCase());
};

export type MonthWeatherView = {
  rainMm?: number | null;
  tempMin?: number | null;
  tempMax?: number | null;
  heatDays?: number | null;
  frostNights?: number | null;
  hasAny: boolean;
};

export const buildMonthWeatherView = (month: ChronologioMonthSummary): MonthWeatherView => {
  const rainMm = month.rainfallMm;
  const tempMin = month.temperatureMin;
  const tempMax = month.temperatureMax;
  const heatDays = month.heatDays;
  const frostNights = month.frostNights;
  const hasAny =
    rainMm != null ||
    tempMin != null ||
    tempMax != null ||
    (heatDays != null && heatDays > 0) ||
    (frostNights != null && frostNights > 0);
  return { rainMm, tempMin, tempMax, heatDays, frostNights, hasAny };
};

export const monthHasActivity = (month: ChronologioMonthSummary): boolean =>
  periodEventCount(month) > 0 || buildMonthWeatherView(month).hasAny;

export const primaryMonthHighlight = (month: ChronologioMonthSummary): string | undefined =>
  (month.highlightTitles || []).find(isMeaningfulHighlight) ||
  (isMeaningfulHighlight(month.observationHighlight) ? month.observationHighlight : undefined);
