import type {
  ChronologioAxis,
  ChronologioMonthSummary,
  ChronologioWeatherDetails,
} from '../services/chronologioService';
import { agriculturalYearMonths } from './agriculturalYear';
import { coverageSufficient } from './weatherValue';
import { periodEventCount } from './summaryFacts';

export type MonthCardLayout = 'standard' | 'harvest';

export const harvestHasResult = (month: Pick<ChronologioMonthSummary, 'oliveKg' | 'oilKg'>): boolean =>
  month.oliveKg > 0 || month.oilKg > 0;

export const isHarvestMonth = (month: ChronologioMonthSummary): boolean =>
  month.harvestCount > 0 || harvestHasResult(month);

export const monthCardLayout = (month: ChronologioMonthSummary): MonthCardLayout =>
  harvestHasResult(month) ? 'harvest' : 'standard';

export const monthHasActivity = (month: ChronologioMonthSummary): boolean =>
  periodEventCount(month) > 0 ||
  month.rainfallMm != null ||
  month.temperatureMax != null ||
  month.temperatureMin != null;

export const percentChange = (current: number, previous?: number | null): number | null => {
  if (previous == null || previous === 0 || Number.isNaN(previous)) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
};

export type MonthWeatherView = {
  kind: 'missing' | 'insufficient' | 'ready';
  daysWithData?: number;
  expectedDays?: number;
  rainMm?: number | null;
  tempMin?: number | null;
  tempMax?: number | null;
  frostNights?: number | null;
  heatDays?: number | null;
  interpretation?: string;
  rainVsPreviousPercent?: number | null;
  includesForecast: boolean;
  source?: string;
};

export const buildMonthWeatherView = (
  month: ChronologioMonthSummary,
  review?: ChronologioWeatherDetails | null
): MonthWeatherView => {
  const daysWithData = review?.daysWithRainData ?? review?.daysWithData;
  const expectedDays = review?.expectedDays;
  const rainMm = review?.rainfallMm ?? month.rainfallMm;
  const tempMin = review?.temperatureMin ?? month.temperatureMin;
  const tempMax = review?.temperatureMax ?? month.temperatureMax;
  const frostNights = review?.frostNights ?? month.frostNights;
  const heatDays = review?.heatDays ?? month.heatDays;
  const includesForecast = Boolean(review?.includesForecast);
  const hasAny =
    rainMm != null ||
    tempMin != null ||
    tempMax != null ||
    frostNights != null ||
    heatDays != null ||
    (daysWithData != null && daysWithData > 0);

  if (!hasAny) return { kind: 'missing', includesForecast: false };

  const coverage =
    daysWithData != null && expectedDays != null
      ? coverageSufficient({
          daysWithData,
          expectedDays,
          includesForecast: false,
        })
      : rainMm != null || (tempMin != null && tempMax != null);

  if (!coverage) {
    return {
      kind: 'insufficient',
      daysWithData,
      expectedDays,
      rainMm,
      tempMin,
      tempMax,
      frostNights,
      heatDays,
      includesForecast,
      source: review?.source,
    };
  }

  return {
    kind: 'ready',
    daysWithData,
    expectedDays,
    rainMm,
    tempMin,
    tempMax,
    frostNights,
    heatDays,
    interpretation:
      review?.vegetationNote ||
      (isMeaningfulHighlight(month.observationHighlight) ? month.observationHighlight : undefined),
    rainVsPreviousPercent: review?.rainVsPreviousPercent ?? null,
    includesForecast,
    source: review?.source,
  };
};

export const previousMonthSummary = (
  months: ChronologioMonthSummary[],
  year: number,
  month: number
): ChronologioMonthSummary | undefined => {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return months.find((m) => m.year === prevYear && m.month === prevMonth);
};

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

export const emptyMonthSummary = (year: number, month: number): ChronologioMonthSummary => ({
  key: `${year}-${String(month).padStart(2, '0')}`,
  year,
  month,
  from: '',
  to: '',
  taskCount: 0,
  expenseCount: 0,
  harvestCount: 0,
  noteCount: 0,
  expenseTotal: 0,
  currency: 'EUR',
  oliveKg: 0,
  oilKg: 0,
  highlightTitles: [],
});

export const monthsForOverview = (
  months: ChronologioMonthSummary[],
  periodYear: number,
  axis: ChronologioAxis,
  now: { year: number; month: number }
): ChronologioMonthSummary[] => {
  const slots =
    axis === 'agricultural'
      ? agriculturalYearMonths(periodYear)
      : Array.from({ length: 12 }, (_, i) => ({ year: periodYear, month: i + 1 }));
  const byKey = new Map(months.map((m) => [`${m.year}-${m.month}`, m]));
  return slots
    .map((slot) => byKey.get(`${slot.year}-${slot.month}`) ?? emptyMonthSummary(slot.year, slot.month))
    .filter((m) => m.year < now.year || (m.year === now.year && m.month <= now.month))
    .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
};
