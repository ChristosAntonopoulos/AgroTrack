import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { readFieldId } from '../navigation/intents';
import { athensCalendarDateKey } from '../utils/athensDate';
import type { ChronologioAxis, ChronologioCategory } from '../services/chronologioService';
import { readChronologioFilters, writeChronologioFilters } from './filterPreferences';
import {
  ZOOM_ORDER,
  focusDateForMonth,
  focusDateForPeriod,
  getPeriodYear,
  livingZoomFromSearch,
  parseFocusDate,
  stepZoom,
  viewFromZoom,
  type ChronologioZoom,
  type LivingFilters,
} from './livingTypes';

const parseAxis = (v: string | null, zoom: ChronologioZoom): ChronologioAxis => {
  if (v === 'agricultural' || v === 'season' || v === 'calendar') return v;
  return zoom === 'year' || zoom === 'years' ? 'agricultural' : 'calendar';
};

export const useChronologioLivingState = (fieldModeFieldId?: string) => {
  const [params, setParams] = useSearchParams();
  const restoredRef = useRef(false);

  const focusToday = params.get('focus') === 'today';
  const zoom = livingZoomFromSearch(params.get('view'), params.get('zoom'));
  const axis = parseAxis(params.get('axis'), zoom);
  const yearParam = params.get('year');
  const todayIso = athensCalendarDateKey(new Date());
  const focusDate =
    focusToday
      ? todayIso
      : params.get('date') ||
        (yearParam && Number.isFinite(Number(yearParam))
          ? focusDateForPeriod(Number(yearParam), axis)
          : todayIso);
  const selectedEntryId = params.get('entry');

  const filters: LivingFilters = useMemo(
    () => ({
      fieldId: fieldModeFieldId || readFieldId(params) || undefined,
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

  /** Restore saved filters when the URL has none; strip stale compare params. */
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const next: Record<string, string | null | undefined> = {};
    if (params.has('compare') || params.has('compareMode')) {
      next.compare = null;
      next.compareMode = null;
    }

    const stored = readChronologioFilters();
    if (!params.has('category') && stored.category) {
      next.category = stored.category;
    }
    if (!params.has('lifecycleYear') && stored.lifecycleYear) {
      next.lifecycleYear = stored.lifecycleYear;
    }
    if (
      !fieldModeFieldId &&
      !params.has('fieldId') &&
      !params.has('field') &&
      stored.fieldId
    ) {
      next.fieldId = stored.fieldId;
    }

    if (Object.keys(next).length > 0) patch(next);
  }, [fieldModeFieldId, params, patch]);

  const setZoom = useCallback(
    (next: ChronologioZoom) => {
      patch({
        view: viewFromZoom(next),
        zoom: null,
        focus: null,
        axis: next === 'month' ? undefined : 'agricultural',
      });
    },
    [patch]
  );

  /** Day view from today — the product home of Chronologio. */
  const openJournal = useCallback(() => {
    patch({ view: 'days', zoom: null, date: athensCalendarDateKey(new Date()), focus: 'today' });
  }, [patch]);

  const zoomBy = useCallback(
    (delta: 1 | -1) => {
      const next = stepZoom(zoom, delta);
      patch({ view: viewFromZoom(next), zoom: null, focus: null });
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
      patch({ date: iso, focus: null });
    },
    [patch]
  );

  /** Open the Days journal on a specific calendar day (keeps the day, not mid-month). */
  const jumpToDate = useCallback(
    (iso: string) => {
      patch({
        view: 'days',
        zoom: null,
        date: iso,
        focus: null,
        axis: 'calendar',
      });
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
      focus: null,
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
        fieldId: fieldModeFieldId ? null : next.fieldId === undefined ? undefined : next.fieldId || null,
        field: fieldModeFieldId || next.fieldId !== undefined ? null : undefined,
        category:
          next.category === undefined ? undefined : next.category === 'all' ? null : next.category,
        lifecycleYear:
          next.lifecycleYear === undefined
            ? undefined
            : next.lifecycleYear || null,
      });
      writeChronologioFilters(next, { preserveFieldId: Boolean(fieldModeFieldId) });
    },
    [fieldModeFieldId, patch]
  );

  const clearFilters = useCallback(() => {
    patch({ fieldId: null, field: null, category: null, lifecycleYear: null });
    writeChronologioFilters(
      { category: 'all', fieldId: '', lifecycleYear: '' },
      { preserveFieldId: Boolean(fieldModeFieldId) }
    );
  }, [fieldModeFieldId, patch]);

  const setSelectedEntry = useCallback(
    (id: string | null) => {
      patch({ entry: id });
    },
    [patch]
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
    selectedEntryId,
    filters,
    canZoomOut,
    canZoomIn,
    setZoom,
    openJournal,
    zoomBy,
    setAxis,
    setFocusDate,
    jumpToDate,
    openPeriod,
    openSeasonYear,
    focusSeasonYear,
    openMonth,
    setFilters,
    clearFilters,
    setSelectedEntry,
  };
};
