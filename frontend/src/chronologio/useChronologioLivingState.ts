import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ChronologioAxis, ChronologioCategory } from '../services/chronologioService';
import {
  ZOOM_ORDER,
  VIEW_TO_ZOOM,
  focusDateForMonth,
  focusDateForPeriod,
  getPeriodYear,
  parseChronologioView,
  parseFocusDate,
  stepZoom,
  toIsoDate,
  viewFromZoom,
  type ChronologioZoom,
  type LivingFilters,
} from './livingTypes';

const parseZoom = (view: string | null, zoom: string | null, focusToday: boolean): ChronologioZoom => {
  if (focusToday) return 'month';
  return VIEW_TO_ZOOM[parseChronologioView(view || zoom)];
};

const parseAxis = (v: string | null, zoom: ChronologioZoom): ChronologioAxis => {
  if (v === 'agricultural' || v === 'season' || v === 'calendar') return v;
  return zoom === 'year' || zoom === 'years' ? 'agricultural' : 'calendar';
};

const parseCompare = (v: string | null): [number, number] | null => {
  if (!v) return null;
  const parts = v.split(',').map((p) => Number(p.trim()));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    return [parts[0], parts[1]];
  }
  return null;
};

export const useChronologioLivingState = (fieldModeFieldId?: string) => {
  const [params, setParams] = useSearchParams();

  const focusToday = params.get('focus') === 'today';
  const zoom = parseZoom(params.get('view'), params.get('zoom'), focusToday);
  const axis = parseAxis(params.get('axis'), zoom);
  const yearParam = params.get('year');
  const focusDate =
    focusToday
      ? toIsoDate(new Date())
      : params.get('date') ||
        (yearParam && Number.isFinite(Number(yearParam))
          ? focusDateForPeriod(Number(yearParam), axis)
          : toIsoDate(new Date()));
  const compareYears = parseCompare(params.get('compare'));
  const compareOpen = params.get('compareMode') === '1' || Boolean(compareYears);
  const selectedEntryId = params.get('entry');

  const filters: LivingFilters = useMemo(
    () => ({
      fieldId: fieldModeFieldId || params.get('field') || undefined,
      category: (params.get('category') as ChronologioCategory | 'all') || 'all',
      lifecycleYear: params.get('lifecycleYear') || '',
    }),
    [fieldModeFieldId, params]
  );

  const patch = useCallback(
    (next: Record<string, string | null | undefined>) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          Object.entries(next).forEach(([k, v]) => {
            if (v == null || v === '') p.delete(k);
            else p.set(k, v);
          });
          return p;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const setZoom = useCallback(
    (next: ChronologioZoom) => {
      patch({
        view: viewFromZoom(next),
        zoom: null,
        focus: next === 'month' ? undefined : null,
        axis: next === 'month' ? undefined : 'agricultural',
      });
    },
    [patch]
  );

  /** Day view from today — the product home of Chronologio. */
  const openJournal = useCallback(() => {
    patch({ view: 'days', zoom: null, date: toIsoDate(new Date()), focus: 'today' });
  }, [patch]);

  const zoomBy = useCallback(
    (delta: 1 | -1) => {
      const next = stepZoom(zoom, delta);
      patch({ view: viewFromZoom(next), zoom: null, focus: next === 'month' ? undefined : null });
    },
    [patch, zoom]
  );

  const setAxis = useCallback(
    (next: ChronologioAxis) => {
      patch({ axis: next === 'calendar' ? null : next });
    },
    [patch]
  );

  const setFocusDate = useCallback(
    (iso: string) => {
      patch({ date: iso });
    },
    [patch]
  );

  const openPeriod = useCallback(
    (periodYear: number) => {
      patch({
        view: 'months',
        zoom: null,
        year: String(periodYear),
        date: focusDateForPeriod(periodYear, axis),
        focus: null,
      });
    },
    [axis, patch]
  );

  const openSeasonYear = useCallback((periodYear: number) => {
    patch({
      axis: 'agricultural',
      view: 'months',
      zoom: null,
      year: String(periodYear),
      date: focusDateForPeriod(periodYear, 'agricultural'),
      focus: null,
    });
  }, [patch]);

  const focusSeasonYear = useCallback((periodYear: number) => {
    patch({
      axis: 'agricultural',
      year: String(periodYear),
      date: focusDateForPeriod(periodYear, 'agricultural'),
    });
  }, [patch]);

  const openMonth = useCallback(
    (year: number, month: number) => {
      patch({
        view: 'days',
        zoom: null,
        date: focusDateForMonth(year, month),
        focus: null,
      });
    },
    [patch]
  );

  const setFilters = useCallback(
    (next: Partial<LivingFilters>) => {
      patch({
        field: fieldModeFieldId ? null : next.fieldId === undefined ? undefined : next.fieldId || null,
        category:
          next.category === undefined ? undefined : next.category === 'all' ? null : next.category,
        lifecycleYear:
          next.lifecycleYear === undefined
            ? undefined
            : next.lifecycleYear || null,
      });
    },
    [fieldModeFieldId, patch]
  );

  const clearFilters = useCallback(() => {
    patch({ field: null, category: null, lifecycleYear: null });
  }, [patch]);

  const setSelectedEntry = useCallback(
    (id: string | null) => {
      patch({ entry: id });
    },
    [patch]
  );

  const setCompare = useCallback(
    (years: [number, number] | null) => {
      if (!years) {
        patch({ compare: null, compareMode: null });
        return;
      }
      patch({ compare: `${years[0]},${years[1]}`, compareMode: '1' });
    },
    [patch]
  );

  const setCompareOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        patch({ compareMode: null, compare: null });
        return;
      }
      const d = parseFocusDate(focusDate);
      const y = getPeriodYear(d, axis);
      patch({
        compareMode: '1',
        compare: compareYears ? `${compareYears[0]},${compareYears[1]}` : `${y - 1},${y}`,
      });
    },
    [axis, compareYears, focusDate, patch]
  );

  const periodYear = getPeriodYear(parseFocusDate(focusDate), axis);
  const focus = parseFocusDate(focusDate);
  const monthYear = focus.getUTCFullYear();
  const month = focus.getUTCMonth() + 1;

  const canZoomOut = ZOOM_ORDER.indexOf(zoom) > 0;
  const canZoomIn = ZOOM_ORDER.indexOf(zoom) < ZOOM_ORDER.length - 1;

  return {
    zoom,
    axis,
    focusDate,
    periodYear,
    monthYear,
    month,
    compareYears,
    compareOpen,
    selectedEntryId,
    filters,
    canZoomOut,
    canZoomIn,
    setZoom,
    openJournal,
    zoomBy,
    setAxis,
    setFocusDate,
    openPeriod,
    openSeasonYear,
    focusSeasonYear,
    openMonth,
    setFilters,
    clearFilters,
    setSelectedEntry,
    setCompare,
    setCompareOpen,
  };
};
