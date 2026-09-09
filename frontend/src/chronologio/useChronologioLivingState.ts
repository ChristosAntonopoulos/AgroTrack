import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ChronologioAxis, ChronologioCategory } from '../services/chronologioService';
import {
  ZOOM_ORDER,
  focusDateForMonth,
  focusDateForPeriod,
  getPeriodYear,
  parseFocusDate,
  stepZoom,
  toIsoDate,
  type ChronologioZoom,
  type LivingFilters,
} from './livingTypes';

const parseZoom = (v: string | null): ChronologioZoom =>
  v === 'year' || v === 'month' || v === 'years' ? v : 'month';

const parseAxis = (v: string | null): ChronologioAxis => (v === 'season' ? 'season' : 'calendar');

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

  const zoom = parseZoom(params.get('zoom') || params.get('view'));
  const axis = parseAxis(params.get('axis'));
  const yearParam = params.get('year');
  const focusDate =
    params.get('date') ||
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
      patch({ view: next });
    },
    [patch]
  );

  /** Journal from the toolbar — live feed from today, not a drilled-in month. */
  const openJournal = useCallback(() => {
    patch({ view: 'month', date: toIsoDate(new Date()) });
  }, [patch]);

  const zoomBy = useCallback(
    (delta: 1 | -1) => {
      patch({ view: stepZoom(zoom, delta) });
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
        view: 'year',
        zoom: 'year',
        year: String(periodYear),
        date: focusDateForPeriod(periodYear, axis),
      });
    },
    [axis, patch]
  );

  const openMonth = useCallback(
    (year: number, month: number) => {
      patch({
        view: 'month',
        date: focusDateForMonth(year, month),
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
    openMonth,
    setFilters,
    clearFilters,
    setSelectedEntry,
    setCompare,
    setCompareOpen,
  };
};
