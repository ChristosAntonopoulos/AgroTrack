import type {
  ChronologioAxis,
  ChronologioCategory,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
  ChronologioSummaryFilters,
} from '../services/chronologioService';

export type ChronologioZoom = 'years' | 'year' | 'month';

/** Zoom-in direction for gestures: years → year → month */
export const ZOOM_ORDER: ChronologioZoom[] = ['years', 'year', 'month'];

/** Toolbar segment order: Days → Months → Years */
export const ZOOM_DISPLAY_ORDER: ChronologioZoom[] = ['month', 'year', 'years'];

export const SEASON_START_MONTH = 9;

export const stepZoom = (zoom: ChronologioZoom, delta: 1 | -1): ChronologioZoom => {
  const i = ZOOM_ORDER.indexOf(zoom);
  const next = Math.min(ZOOM_ORDER.length - 1, Math.max(0, i + delta));
  return ZOOM_ORDER[next];
};

export const toIsoDate = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseFocusDate = (iso?: string | null): Date => {
  if (!iso) return new Date();
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00.000Z` : iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

export const getSeasonStartYear = (d: Date): number => {
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  return month >= SEASON_START_MONTH ? year : year - 1;
};

export const getPeriodYear = (d: Date, axis: ChronologioAxis): number =>
  axis === 'season' ? getSeasonStartYear(d) : d.getUTCFullYear();

export const calendarMonthBounds = (year: number, month: number): { from: string; to: string } => {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { from: from.toISOString(), to: to.toISOString() };
};

export const periodBounds = (
  periodYear: number,
  axis: ChronologioAxis
): { from: string; to: string } => {
  if (axis === 'season') {
    const from = new Date(Date.UTC(periodYear, SEASON_START_MONTH - 1, 1, 0, 0, 0));
    const to = new Date(Date.UTC(periodYear + 1, SEASON_START_MONTH - 1, 1, 0, 0, 0));
    to.setUTCMilliseconds(-1);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  return {
    from: new Date(Date.UTC(periodYear, 0, 1, 0, 0, 0)).toISOString(),
    to: new Date(Date.UTC(periodYear, 11, 31, 23, 59, 59)).toISOString(),
  };
};

export const focusDateForPeriod = (periodYear: number, axis: ChronologioAxis): string => {
  if (axis === 'season') {
    return toIsoDate(new Date(Date.UTC(periodYear, SEASON_START_MONTH - 1, 15)));
  }
  return toIsoDate(new Date(Date.UTC(periodYear, 5, 15)));
};

export const focusDateForMonth = (year: number, month: number): string =>
  toIsoDate(new Date(Date.UTC(year, month - 1, 15)));

export type LivingFilters = {
  fieldId?: string;
  category: ChronologioCategory | 'all';
  lifecycleYear: string;
};

export type LivingState = {
  zoom: ChronologioZoom;
  axis: ChronologioAxis;
  focusDate: string;
  compareYears: [number, number] | null;
  filters: LivingFilters;
  selectedEntryId: string | null;
  compareOpen: boolean;
};

export const emptyPeriodSummary = (): ChronologioPeriodSummary => ({
  key: '',
  periodYear: 0,
  axis: 'calendar',
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
  oilYieldPercent: null,
  heroMediaUrl: null,
  highlightTitles: [],
});

export type { ChronologioPeriodSummary, ChronologioMonthSummary, ChronologioSummaryFilters };
