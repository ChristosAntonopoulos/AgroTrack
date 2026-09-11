import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BookOpen, ArrowUp } from 'lucide-react';
import Button from '../Common/Button';
import EmptyState from '../Common/EmptyState';
import Breadcrumbs from '../Layout/Breadcrumbs';
import ChronologioSkeleton from './ChronologioSkeleton';
import ChronologioChrome from './ChronologioChrome';
import ChronologioYearsView from './ChronologioYearsView';
import ChronologioYearView from './ChronologioYearView';
import ChronologioMonthView from './ChronologioMonthView';
import ChronologioPeekDrawer from './ChronologioPeekDrawer';
import type { ChronologioPeekTarget } from './ChronologioPeekDrawer';
import ChronologioDateRail from './ChronologioDateRail';
import ChronologioCompare from './ChronologioCompare';
import TodaySummary from './TodaySummary';
import { getChronologioService, getFieldService } from '../../services/serviceFactory';
import { geospatialService } from '../../services/geospatialService';
import { useTodaySummary } from '../../chronologio/useTodaySummary';
import { dayWeatherDateKey, type DayWeatherInput } from '../../chronologio/dayWeather';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
  ChronologioWeatherDetails,
} from '../../services/chronologioService';
import type { Field } from '../../services/fieldService';
import {
  calendarMonthBounds,
  focusDateForPeriod,
  getPeriodYear,
  periodBounds,
  toIsoDate,
  VIEW_PANEL_ID,
  viewFromZoom,
} from '../../chronologio/livingTypes';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';
import {
  ensureCurrentAgriculturalYear,
  previousYearSummary,
} from '../../chronologio/yearPresentation';
import { PAGE_SIZE } from '../../utils/chronologioGrouping';
import { uniqueChronologioEntries } from '../../utils/chronologioUnique';
import { useChronologioLivingState } from '../../chronologio/useChronologioLivingState';
import type { SupportedLocale } from '../../i18n/config';
import { useCaptureOptional } from '../../context/CaptureContext';
import { CAPTURE_SAVED_EVENT } from '../../capture/types';
import './Chronologio.css';

type Props = {
  fieldId?: string;
  embedded?: boolean;
};

/**
 * The single Chronologio living timeline. Used on /chronologio (all fields)
 * and the field-page Χρονολόγιο tab (one field) — same UI, different data.
 */
const ChronologioLiving: React.FC<Props> = ({ fieldId, embedded = false }) => {
  const fieldMode = Boolean(fieldId);
  const { t, i18n } = useTranslation(['chronologio', 'common', 'capture']);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const capture = useCaptureOptional();
  const locale = (i18n.language?.slice(0, 2) || 'el') as SupportedLocale;
  const numberLocale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-US';

  const living = useChronologioLivingState(fieldId);

  const [fields, setFields] = useState<Field[]>([]);
  const [fieldName, setFieldName] = useState('');
  const [yearSummaries, setYearSummaries] = useState<ChronologioPeriodSummary[]>([]);
  const [monthSummaries, setMonthSummaries] = useState<ChronologioMonthSummary[]>([]);
  const [compareLeftMonths, setCompareLeftMonths] = useState<ChronologioMonthSummary[]>([]);
  const [compareRightMonths, setCompareRightMonths] = useState<ChronologioMonthSummary[]>([]);
  const [monthEntries, setMonthEntries] = useState<ChronologioEntry[]>([]);
  const [yearEntries, setYearEntries] = useState<ChronologioEntry[]>([]);
  const [journalHasMore, setJournalHasMore] = useState(false);
  const [journalLoadingMore, setJournalLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [showReturnToday, setShowReturnToday] = useState(false);
  const [chapterPeek, setChapterPeek] = useState<
    | { mode: 'month'; year: number; month: number }
    | { mode: 'year'; periodYear: number }
    | { mode: 'monthWeather'; year: number; month: number }
    | { mode: 'dayWeather'; year: number; month: number; dateKey: string }
    | { mode: 'todayWeather' }
    | null
  >(null);
  const [peekMonths, setPeekMonths] = useState<ChronologioMonthSummary[]>([]);
  const [peekRecent, setPeekRecent] = useState<ChronologioEntry[]>([]);
  const [peekRecentLoading, setPeekRecentLoading] = useState(false);
  const [peekWeatherReviews, setPeekWeatherReviews] = useState<ChronologioEntry[]>([]);
  const [peekWeatherLoading, setPeekWeatherLoading] = useState(false);
  const [weatherEventPeek, setWeatherEventPeek] = useState<ChronologioEntry | null>(null);
  const [yearWeatherReviews, setYearWeatherReviews] = useState<ChronologioEntry[]>([]);
  const journalLoadLock = useRef(false);

  const scopedFieldId = fieldMode ? fieldId : living.filters.fieldId;
  const todayIso = toIsoDate(new Date());
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  useEffect(() => {
    void getFieldService()
      .getFields()
      .then(setFields)
      .catch(() => setFields([]));
  }, []);

  useEffect(() => {
    if (!fieldId) {
      setFieldName('');
      return;
    }
    void getFieldService()
      .getField(fieldId)
      .then((f) => setFieldName(f.name))
      .catch(() => setFieldName(''));
  }, [fieldId]);

  const loadErrorMessage = useCallback(
    (err: unknown) => {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      const status =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      return (
        message ||
        (status === 404
          ? t('chronologio:loadFailedUnavailable')
          : t('chronologio:loadFailed'))
      );
    },
    [t]
  );

  const fetchYears = useCallback(async () => {
    const svc = getChronologioService();
    const filters = {
      axis: living.axis,
      category: living.filters.category === 'all' ? undefined : living.filters.category,
      fieldId: !fieldMode ? living.filters.fieldId : undefined,
    };
    if (scopedFieldId) return svc.getFieldYearSummaries(scopedFieldId, filters);
    return svc.getMyYearSummaries(filters);
  }, [fieldMode, living.axis, living.filters.category, living.filters.fieldId, scopedFieldId]);

  const fetchMonths = useCallback(
    async (periodYear: number) => {
      const svc = getChronologioService();
      const filters = {
        axis: living.axis,
        category: living.filters.category === 'all' ? undefined : living.filters.category,
        fieldId: !fieldMode ? living.filters.fieldId : undefined,
        year: living.axis === 'season' ? undefined : periodYear,
        season: living.axis === 'season' ? periodYear : undefined,
      };
      if (scopedFieldId) return svc.getFieldMonthSummaries(scopedFieldId, filters);
      return svc.getMyMonthSummaries(filters);
    },
    [fieldMode, living.axis, living.filters.category, living.filters.fieldId, scopedFieldId]
  );

  const isLiveJournalMonth = living.monthYear === nowYear && living.month === nowMonth;
  const showTodaySummary = living.zoom === 'month' && isLiveJournalMonth && !living.compareOpen;

  const fetchJournalPage = useCallback(
    async (offset: number) => {
      const { to } = calendarMonthBounds(living.monthYear, living.month);
      const filters = {
        to: isLiveJournalMonth ? undefined : to,
        category: living.filters.category === 'all' ? undefined : living.filters.category,
        lifecycleYear: living.filters.lifecycleYear || undefined,
        fieldId: !fieldMode ? living.filters.fieldId : undefined,
        limit: PAGE_SIZE,
        offset,
      };
      const svc = getChronologioService();
      return scopedFieldId
        ? svc.getFieldChronologio(scopedFieldId, filters)
        : svc.getMyChronologio(filters);
    },
    [
      fieldMode,
      isLiveJournalMonth,
      living.filters.category,
      living.filters.fieldId,
      living.filters.lifecycleYear,
      living.month,
      living.monthYear,
      scopedFieldId,
    ]
  );

  useEffect(() => {
    let cancelled = false;
    journalLoadLock.current = false;
    (async () => {
      setLoading(true);
      setError(null);
      setJournalHasMore(false);
      try {
        const years = await fetchYears();
        if (cancelled) return;
        setYearSummaries(years);

        if (living.zoom === 'year' || living.compareOpen) {
          const months = await fetchMonths(living.periodYear);
          if (cancelled) return;
          setMonthSummaries(months);
        } else {
          setMonthSummaries([]);
        }

        if (living.zoom === 'month') {
          const entries = await fetchJournalPage(0);
          if (cancelled) return;
          setMonthEntries(uniqueChronologioEntries(entries));
          setJournalHasMore(entries.length >= PAGE_SIZE);
          setYearEntries([]);
        } else if (living.zoom === 'year') {
          const { from, to } = periodBounds(living.periodYear, living.axis);
          const svc = getChronologioService();
          const filters = {
            from,
            to,
            category: living.filters.category === 'all' ? undefined : living.filters.category,
            lifecycleYear: living.filters.lifecycleYear || undefined,
            fieldId: !fieldMode ? living.filters.fieldId : undefined,
            limit: 200,
          };
          const yearRows = scopedFieldId
            ? await svc.getFieldChronologio(scopedFieldId, filters)
            : await svc.getMyChronologio(filters);
          if (cancelled) return;
          setYearEntries(uniqueChronologioEntries(yearRows));
          setMonthEntries([]);
          setJournalHasMore(false);
        } else {
          setMonthEntries([]);
          setYearEntries([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(loadErrorMessage(err));
          setYearSummaries([]);
          setMonthSummaries([]);
          setMonthEntries([]);
          setYearEntries([]);
          setJournalHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    fetchJournalPage,
    fetchMonths,
    fetchYears,
    fieldMode,
    living.axis,
    living.compareOpen,
    living.filters.category,
    living.filters.fieldId,
    living.filters.lifecycleYear,
    living.zoom === 'year' || living.compareOpen ? living.periodYear : 0,
    living.zoom,
    loadErrorMessage,
    reloadToken,
    scopedFieldId,
  ]);

  const loadMoreJournal = useCallback(async () => {
    if (living.zoom !== 'month' || journalLoadingMore || !journalHasMore || journalLoadLock.current) {
      return;
    }
    journalLoadLock.current = true;
    setJournalLoadingMore(true);
    try {
      const next = await fetchJournalPage(monthEntries.length);
      setMonthEntries((prev) => uniqueChronologioEntries([...prev, ...next]));
      setJournalHasMore(next.length >= PAGE_SIZE);
      if (next.length === 0) setJournalHasMore(false);
    } catch {
      setJournalHasMore(false);
    } finally {
      journalLoadLock.current = false;
      setJournalLoadingMore(false);
    }
  }, [fetchJournalPage, journalHasMore, journalLoadingMore, living.zoom, monthEntries.length]);

  useEffect(() => {
    if (!living.compareOpen || !living.compareYears) {
      setCompareLeftMonths([]);
      setCompareRightMonths([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [l, r] = await Promise.all([
          fetchMonths(living.compareYears![0]),
          fetchMonths(living.compareYears![1]),
        ]);
        if (!cancelled) {
          setCompareLeftMonths(l);
          setCompareRightMonths(r);
        }
      } catch {
        if (!cancelled) {
          setCompareLeftMonths([]);
          setCompareRightMonths([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMonths, living.compareOpen, living.compareYears]);

  useEffect(() => {
    const onSaved = () => setReloadToken((n) => n + 1);
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      living.zoomBy(e.deltaY > 0 ? -1 : 1);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [living]);

  useEffect(() => {
    const away =
      living.periodYear !== getPeriodYear(new Date(), living.axis) ||
      (living.zoom === 'month' &&
        (living.monthYear !== nowYear || living.month !== nowMonth));
    setShowReturnToday(away);
  }, [living.axis, living.month, living.monthYear, living.periodYear, living.zoom, nowMonth, nowYear]);

  const weatherByMonth = useMemo(() => {
    const map: Record<string, ChronologioWeatherDetails> = {};
    for (const row of yearWeatherReviews) {
      const y = row.details.weather?.year;
      const m = row.details.weather?.month;
      if (y == null || m == null || !row.details.weather) continue;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (!map[key]) map[key] = row.details.weather;
    }
    return map;
  }, [yearWeatherReviews]);

  const selectedEntry = useMemo(
    () =>
      monthEntries.find((e) => e.id === living.selectedEntryId) ||
      yearEntries.find((e) => e.id === living.selectedEntryId) ||
      yearWeatherReviews.find((e) => e.id === living.selectedEntryId) ||
      null,
    [living.selectedEntryId, monthEntries, yearEntries, yearWeatherReviews]
  );

  useEffect(() => {
    if (living.selectedEntryId) {
      setChapterPeek(null);
      setWeatherEventPeek(null);
    }
  }, [living.selectedEntryId]);

  useEffect(() => {
    if (chapterPeek?.mode !== 'year') {
      setPeekMonths([]);
      return;
    }
    let cancelled = false;
    void fetchMonths(chapterPeek.periodYear)
      .then((rows) => {
        if (!cancelled) setPeekMonths(rows);
      })
      .catch(() => {
        if (!cancelled) setPeekMonths([]);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterPeek, fetchMonths]);

  useEffect(() => {
    if (chapterPeek?.mode !== 'month') {
      setPeekRecent([]);
      setPeekRecentLoading(false);
      return;
    }
    let cancelled = false;
    const { year, month } = chapterPeek;
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setPeekRecentLoading(true);
    const svc = getChronologioService();
    const filters = {
      from,
      to,
      limit: 5,
      ...(living.filters.category ? { category: living.filters.category } : {}),
      ...(scopedFieldId && !fieldMode ? { fieldId: scopedFieldId } : {}),
    };
    const request = fieldMode && fieldId
      ? svc.getFieldChronologio(fieldId, filters)
      : svc.getMyChronologio(filters);
    void request
      .then((rows) => {
        if (!cancelled) setPeekRecent(rows.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setPeekRecent([]);
      })
      .finally(() => {
        if (!cancelled) setPeekRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    chapterPeek,
    fieldId,
    fieldMode,
    living.filters.category,
    scopedFieldId,
  ]);

  useEffect(() => {
    if (chapterPeek?.mode !== 'monthWeather') {
      setPeekWeatherReviews([]);
      setPeekWeatherLoading(false);
      return;
    }
    let cancelled = false;
    const { year, month } = chapterPeek;
    const { from, to } = calendarMonthBounds(year, month);
    setPeekWeatherLoading(true);
    const svc = getChronologioService();
    const filters = {
      from,
      to,
      category: 'weather' as const,
      limit: 50,
      ...(scopedFieldId && !fieldMode ? { fieldId: scopedFieldId } : {}),
    };
    const request =
      fieldMode && fieldId
        ? svc.getFieldChronologio(fieldId, filters)
        : svc.getMyChronologio(filters);
    void request
      .then((rows) => {
        if (cancelled) return;
        const monthReviews = rows
          .filter((e) => e.eventType === 'weather.monthReview')
          .filter((e) => {
            const y = e.details.weather?.year;
            const m = e.details.weather?.month;
            if (y != null && m != null) return y === year && m === month;
            const d = new Date(e.occurredAt);
            return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
          })
          .sort((a, b) => (a.field?.name || '').localeCompare(b.field?.name || ''));
        setPeekWeatherReviews(monthReviews);
      })
      .catch(() => {
        if (!cancelled) setPeekWeatherReviews([]);
      })
      .finally(() => {
        if (!cancelled) setPeekWeatherLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterPeek, fieldId, fieldMode, scopedFieldId]);

  useEffect(() => {
    if (living.zoom !== 'year') {
      setYearWeatherReviews([]);
      return;
    }
    let cancelled = false;
    const { from, to } = periodBounds(living.periodYear, living.axis);
    const svc = getChronologioService();
    const filters = {
      from,
      to,
      category: 'weather' as const,
      limit: 80,
      ...(scopedFieldId && !fieldMode ? { fieldId: scopedFieldId } : {}),
    };
    const request =
      fieldMode && fieldId
        ? svc.getFieldChronologio(fieldId, filters)
        : svc.getMyChronologio(filters);
    void request
      .then((rows) => {
        if (!cancelled) {
          setYearWeatherReviews(rows.filter((e) => e.eventType === 'weather.monthReview'));
        }
      })
      .catch(() => {
        if (!cancelled) setYearWeatherReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId, fieldMode, living.axis, living.periodYear, living.zoom, scopedFieldId]);

  const peekTarget: ChronologioPeekTarget | null = useMemo(() => {
    if (weatherEventPeek) return { mode: 'event', entry: weatherEventPeek };
    if (selectedEntry) return { mode: 'event', entry: selectedEntry };
    if (chapterPeek?.mode === 'year') {
      const rows = ensureCurrentAgriculturalYear(yearSummaries);
      const summary = rows.find((y) => y.periodYear === chapterPeek.periodYear) || null;
      if (!summary) return null;
      return {
        mode: 'year',
        summary,
        previous: previousYearSummary(rows, summary.periodYear),
        months: peekMonths.length ? peekMonths : monthSummaries,
      };
    }
    if (chapterPeek?.mode === 'month') {
      const summary =
        monthSummaries.find(
          (m) => m.year === chapterPeek.year && m.month === chapterPeek.month
        ) || null;
      if (!summary) return null;
      return {
        mode: 'month',
        summary,
        recent: peekRecent,
        loadingRecent: peekRecentLoading,
      };
    }
    if (chapterPeek?.mode === 'monthWeather') {
      return {
        mode: 'monthWeather',
        year: chapterPeek.year,
        month: chapterPeek.month,
        reviews: peekWeatherReviews,
        loading: peekWeatherLoading,
      };
    }
    return null;
  }, [
    chapterPeek,
    monthSummaries,
    peekMonths,
    peekRecent,
    peekRecentLoading,
    peekWeatherLoading,
    peekWeatherReviews,
    selectedEntry,
    weatherEventPeek,
    yearSummaries,
  ]);

  const closePeek = useCallback(() => {
    setChapterPeek(null);
    setWeatherEventPeek(null);
    living.setSelectedEntry(null);
  }, [living]);

  const availableCompareYears = useMemo(() => {
    const fromSummaries = yearSummaries.map((y) => y.periodYear);
    if (fromSummaries.length) return fromSummaries;
    const y = living.periodYear;
    return [y - 1, y, y + 1];
  }, [living.periodYear, yearSummaries]);

  const compareLeft = useMemo(
    () =>
      living.compareYears
        ? yearSummaries.find((y) => y.periodYear === living.compareYears![0]) || null
        : null,
    [living.compareYears, yearSummaries]
  );
  const compareRight = useMemo(
    () =>
      living.compareYears
        ? yearSummaries.find((y) => y.periodYear === living.compareYears![1]) || null
        : null,
    [living.compareYears, yearSummaries]
  );

  const empty =
    !loading &&
    !error &&
    yearSummaries.length === 0 &&
    monthEntries.length === 0 &&
    !showTodaySummary;

  const cta = capture ? (
    <Button
      variant="primary"
      onClick={() => capture.openCapture({ fieldId: scopedFieldId || fieldId })}
    >
      {t('capture:ctaPlus')}
    </Button>
  ) : fieldMode && fieldId ? (
    <Button variant="primary" to={`/fields/${fieldId}`}>
      {t('chronologio:backToField')}
    </Button>
  ) : (
    <Button to="/fields" variant="primary">
      {t('chronologio:ctaViewFields')}
    </Button>
  );

  const today = useTodaySummary({
    enabled: showTodaySummary && !loading && !error,
    fieldId: scopedFieldId,
    fields,
  });

  const [weatherByDate, setWeatherByDate] = useState<Record<string, DayWeatherInput>>({});

  useEffect(() => {
    const weatherField = scopedFieldId || fields[0]?.id;
    if (!weatherField || living.zoom !== 'month') return;
    const dates = monthEntries
      .map((e) => dayWeatherDateKey(e.occurredAt))
      .filter(Boolean)
      .sort();
    if (dates.length === 0 && !isLiveJournalMonth) return;
    const from = dates[0] || todayIso;
    const to = todayIso;
    let cancelled = false;
    void geospatialService
      .getWeatherHistory(weatherField, from, to)
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, DayWeatherInput> = {};
        for (const row of rows) {
          next[dayWeatherDateKey(row.date)] = {
            minC: row.minTemperatureC,
            maxC: row.maxTemperatureC,
            rainMm: row.rainTotalMm,
            et0Mm: row.et0Mm,
          };
        }
        setWeatherByDate(next);
      })
      .catch(() => {
        if (!cancelled) setWeatherByDate({});
      });
    return () => {
      cancelled = true;
    };
  }, [fields, isLiveJournalMonth, living.zoom, monthEntries, scopedFieldId, todayIso]);

  const todayWeather: DayWeatherInput | null = today.weather
    ? {
        currentC: today.weather.temperature,
        minC: today.weather.low,
        maxC: today.weather.high,
        rainMm: today.fieldWeather?.current?.precipitationMm ?? today.weather.precipitation,
        windKmh: today.weather.windSpeed,
        gustKmh: today.fieldWeather?.current?.windGustKmh,
        humidityPercent: today.fieldWeather?.current?.humidityPercent,
        et0Mm: today.fieldWeather?.evapotranspiration?.todayMm,
        source: today.fieldWeather?.metadata?.source,
        updatedAt: today.fieldWeather?.lastUpdatedAt,
        frost: Boolean(
          today.fieldWeather?.frost?.level &&
            today.fieldWeather.frost.level !== 'None' &&
            today.fieldWeather.frost.level !== 'Low'
        ),
      }
    : null;

  const resolvedPeek: ChronologioPeekTarget | null = useMemo(() => {
    if (chapterPeek?.mode === 'todayWeather') {
      const groves = fields.filter((f) => {
        if (f.status === 'Draft' || f.status === 'Archived') return false;
        const placed = f.latitude != null || Boolean(f.boundary);
        if (!placed) return false;
        return Boolean(
          f.variety ||
            f.oliveVariety ||
            f.id === today.weatherFieldId ||
            monthEntries.some((e) => e.fieldId === f.id)
        );
      });
      const visible = scopedFieldId ? fields.filter((f) => f.id === scopedFieldId) : groves;
      return {
        mode: 'todayWeather',
        fields: visible.map((f) => ({
          id: f.id,
          name: f.name,
          color: f.color,
          status: f.status,
          hasPlace: f.latitude != null || Boolean(f.boundary),
        })),
        primaryFieldId: scopedFieldId || today.weatherFieldId || visible[0]?.id,
        seed:
          today.fieldWeather && today.weatherFieldId
            ? { fieldId: today.weatherFieldId, weather: today.fieldWeather }
            : undefined,
      };
    }
    if (chapterPeek?.mode !== 'dayWeather') return peekTarget;
    const weatherField =
      fields.find((f) => f.id === scopedFieldId) ||
      fields.find((f) => f.id === today.weatherFieldId) ||
      fields[0];
    const events = monthEntries.filter(
      (e) =>
        dayWeatherDateKey(e.occurredAt) === chapterPeek.dateKey &&
        e.eventType !== 'weather.monthReview' &&
        e.eventType !== 'weather.yearReview'
    );
    const weather =
      (chapterPeek.dateKey === todayIso && todayWeather) ||
      weatherByDate[chapterPeek.dateKey] ||
      null;
    return {
      mode: 'dayWeather',
      dateKey: chapterPeek.dateKey,
      year: chapterPeek.year,
      month: chapterPeek.month,
      weather,
      fieldId: weatherField?.id,
      fieldName: weatherField?.name,
      fieldColor: weatherField?.color,
      events,
    };
  }, [
    chapterPeek,
    fields,
    monthEntries,
    peekTarget,
    scopedFieldId,
    today.fieldWeather,
    today.weatherFieldId,
    todayIso,
    todayWeather,
    weatherByDate,
  ]);

  const scrollToYearChapter = useCallback(
    (periodYear: number) => {
      living.setFocusDate(focusDateForPeriod(periodYear, living.axis));
      const el = document.getElementById(`chrono-year-${periodYear}`);
      el?.scrollIntoView({
        block: 'center',
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    },
    [living, reduceMotion]
  );

  const returnToToday = useCallback(() => {
    living.setFocusDate(todayIso);
    if (living.zoom === 'years') {
      const el = document.getElementById(`chrono-year-${agriculturalYearFor(new Date())}`);
      el?.scrollIntoView({
        block: 'center',
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }
  }, [living, nowYear, reduceMotion, todayIso]);

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.26, ease: 'easeOut' as const };

  return (
    <div className={`chronologio-shell chrono-living${embedded ? ' chronologio-shell--embedded' : ''}`}>
      {embedded ? null : <Breadcrumbs />}
      <ChronologioChrome
        fieldMode={fieldMode}
        fieldName={fieldName}
        fieldId={fieldId}
        fields={fields}
        filters={living.filters}
        zoom={living.zoom}
        compareOpen={living.compareOpen}
        embedded={embedded}
        onBack={embedded || !fieldId ? undefined : () => navigate(`/fields/${fieldId}`)}
        onSetZoom={living.setZoom}
        onOpenJournal={living.openJournal}
        onSetFilters={living.setFilters}
        onCompareToggle={() => living.setCompareOpen(!living.compareOpen)}
      />

      {loading ? <ChronologioSkeleton /> : null}

      {!loading && error ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title={t('chronologio:loadFailedTitle')}
          description={error}
          action={
            <Button variant="primary" onClick={() => setReloadToken((n) => n + 1)}>
              {t('common:retry', { defaultValue: 'Retry' })}
            </Button>
          }
        />
      ) : null}

      {!loading && !error && living.compareOpen && living.compareYears ? (
        <ChronologioCompare
          left={compareLeft}
          right={compareRight}
          leftMonths={compareLeftMonths}
          rightMonths={compareRightMonths}
          leftYear={living.compareYears[0]}
          rightYear={living.compareYears[1]}
          availableYears={availableCompareYears}
          numberLocale={numberLocale}
          onChangeYears={living.setCompare}
          onClose={() => living.setCompareOpen(false)}
        />
      ) : null}

      {!loading && !error && !living.compareOpen && empty ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title={
            fieldMode ? t('chronologio:emptyFieldTitle') : t('chronologio:emptyGlobalTitle')
          }
          description={
            fieldMode
              ? t('chronologio:emptyFieldDescription')
              : t('chronologio:emptyGlobalDescription')
          }
          action={cta}
        />
      ) : null}

      {!loading && !error && !living.compareOpen && !empty ? (
        <div className={`chronologio-layout chrono-living-layout${living.zoom !== 'years' && yearSummaries.length >= 5 ? ' has-date-rail' : ''}`}>
          <div className="chronologio-main chrono-living-main">
            <AnimatePresence mode="wait">
              <motion.div
                key={living.zoom}
                id={VIEW_PANEL_ID[viewFromZoom(living.zoom)]}
                role="tabpanel"
                aria-labelledby={`chrono-tab-${viewFromZoom(living.zoom)}`}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={transition}
              >
                {living.zoom === 'years' ? (
                  <ChronologioYearsView
                    summaries={yearSummaries}
                    numberLocale={numberLocale}
                    onOpenYear={living.openSeasonYear}
                  />
                ) : null}
                {living.zoom === 'year' ? (
                  <ChronologioYearView
                    periodYear={living.periodYear}
                    axis={living.axis}
                    months={monthSummaries}
                    entries={yearEntries}
                    weatherReviews={yearWeatherReviews}
                    focusMonth={living.month}
                    focusMonthYear={living.monthYear}
                    numberLocale={numberLocale}
                    locale={locale}
                    weatherByMonth={weatherByMonth}
                    fieldId={scopedFieldId || fieldId}
                    showField={!fieldMode}
                    selectedEntryId={living.selectedEntryId}
                    onPeekMonth={(year, month) => {
                      living.setSelectedEntry(null);
                      setWeatherEventPeek(null);
                      setChapterPeek({ mode: 'month', year, month });
                    }}
                    onOpenMonthDays={(year, month) => living.openMonth(year, month)}
                    onPeekMonthWeather={(year, month) => {
                      living.setSelectedEntry(null);
                      setWeatherEventPeek(null);
                      setChapterPeek({ mode: 'monthWeather', year, month });
                    }}
                    onSelect={(e) => living.setSelectedEntry(e.id)}
                  />
                ) : null}
                {living.zoom === 'month' ? (
                  <>
                    {showTodaySummary ? (
                      <TodaySummary
                        today={today}
                        fieldId={scopedFieldId || fieldId}
                        onOpenWeather={() => {
                          living.setSelectedEntry(null);
                          setWeatherEventPeek(null);
                          setChapterPeek({ mode: 'todayWeather' });
                        }}
                      />
                    ) : null}
                    {monthEntries.length === 0 ? (
                      showTodaySummary ? null : (
                        <EmptyState
                          icon={<BookOpen size={28} />}
                          title={t('chronologio:living.emptyMonthTitle')}
                          description={t('chronologio:living.emptyMonthDescription')}
                          action={cta}
                        />
                      )
                    ) : (
                      <ChronologioMonthView
                        entries={monthEntries}
                        showField={!fieldMode}
                        locale={locale}
                        selectedEntryId={living.selectedEntryId}
                        hasMore={journalHasMore}
                        loadingMore={journalLoadingMore}
                        weatherByDate={weatherByDate}
                        todayWeather={todayWeather}
                        onLoadMore={loadMoreJournal}
                        onSelect={(e) => living.setSelectedEntry(e.id)}
                        onOpenWeather={(year, month, dateKey) => {
                          living.setSelectedEntry(null);
                          setWeatherEventPeek(null);
                          if (dateKey) {
                            setChapterPeek({ mode: 'dayWeather', year, month, dateKey });
                            return;
                          }
                          setChapterPeek({ mode: 'monthWeather', year, month });
                        }}
                      />
                    )}
                  </>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
          {living.zoom === 'years' ? null : (
            <ChronologioDateRail
              summaries={yearSummaries}
              activePeriodYear={living.periodYear}
              axis={living.axis}
              zoom={living.zoom}
              onScrollToYear={scrollToYearChapter}
              onJumpToYear={(iso) => {
                living.setFocusDate(iso);
                if (living.zoom === 'years') living.setZoom('year');
              }}
            />
          )}
        </div>
      ) : null}

      {showReturnToday && !loading && !error && !living.compareOpen ? (
        <button type="button" className="chrono-return-today" onClick={returnToToday}>
          <ArrowUp size={14} aria-hidden />
          {t('chronologio:living.returnToday')}
        </button>
      ) : null}

      <ChronologioPeekDrawer
        peek={resolvedPeek}
        numberLocale={numberLocale}
        weatherByDate={weatherByDate}
        onClose={closePeek}
        onDrillToMonths={(periodYear) => {
          setChapterPeek(null);
          living.openPeriod(periodYear);
        }}
        onDrillToDays={(year, month) => {
          setChapterPeek(null);
          living.openMonth(year, month);
        }}
        onSelectRecent={(e) => {
          setChapterPeek(null);
          if (e.eventType === 'weather.monthReview' || e.eventType === 'weather.yearReview') {
            living.setSelectedEntry(null);
            setWeatherEventPeek(e);
            return;
          }
          setWeatherEventPeek(null);
          living.setSelectedEntry(e.id);
        }}
      />
    </div>
  );
};

export default ChronologioLiving;
