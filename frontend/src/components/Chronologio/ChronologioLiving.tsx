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
import { getChronologioService, getFieldService } from '../../services/serviceFactory';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import type { Field } from '../../services/fieldService';
import { calendarMonthBounds, focusDateForPeriod, toIsoDate } from '../../chronologio/livingTypes';
import { PAGE_SIZE } from '../../utils/chronologioGrouping';
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
    | null
  >(null);
  const [peekMonths, setPeekMonths] = useState<ChronologioMonthSummary[]>([]);
  const [peekRecent, setPeekRecent] = useState<ChronologioEntry[]>([]);
  const [peekRecentLoading, setPeekRecentLoading] = useState(false);
  const [peekWeatherReviews, setPeekWeatherReviews] = useState<ChronologioEntry[]>([]);
  const [peekWeatherLoading, setPeekWeatherLoading] = useState(false);
  const [weatherEventPeek, setWeatherEventPeek] = useState<ChronologioEntry | null>(null);
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
        year: living.axis === 'calendar' ? periodYear : undefined,
        season: living.axis === 'season' ? periodYear : undefined,
      };
      if (scopedFieldId) return svc.getFieldMonthSummaries(scopedFieldId, filters);
      return svc.getMyMonthSummaries(filters);
    },
    [fieldMode, living.axis, living.filters.category, living.filters.fieldId, scopedFieldId]
  );

  const isLiveJournalMonth = living.monthYear === nowYear && living.month === nowMonth;

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
          setMonthEntries(entries);
          setJournalHasMore(entries.length >= PAGE_SIZE);
        } else {
          setMonthEntries([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(loadErrorMessage(err));
          setYearSummaries([]);
          setMonthSummaries([]);
          setMonthEntries([]);
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
    living.compareOpen,
    living.periodYear,
    living.zoom,
    loadErrorMessage,
    reloadToken,
  ]);

  const loadMoreJournal = useCallback(async () => {
    if (living.zoom !== 'month' || journalLoadingMore || !journalHasMore || journalLoadLock.current) {
      return;
    }
    journalLoadLock.current = true;
    setJournalLoadingMore(true);
    try {
      const next = await fetchJournalPage(monthEntries.length);
      setMonthEntries((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...next.filter((e) => !seen.has(e.id))];
      });
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
      living.periodYear !== nowYear ||
      (living.zoom === 'month' &&
        (living.monthYear !== nowYear || living.month !== nowMonth));
    setShowReturnToday(away);
  }, [living.month, living.monthYear, living.periodYear, living.zoom, nowMonth, nowYear]);

  const activePeriod = useMemo(
    () => yearSummaries.find((y) => y.periodYear === living.periodYear) || null,
    [living.periodYear, yearSummaries]
  );

  const selectedEntry = useMemo(
    () => monthEntries.find((e) => e.id === living.selectedEntryId) || null,
    [living.selectedEntryId, monthEntries]
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

  const peekTarget: ChronologioPeekTarget | null = useMemo(() => {
    if (weatherEventPeek) return { mode: 'event', entry: weatherEventPeek };
    if (selectedEntry) return { mode: 'event', entry: selectedEntry };
    if (chapterPeek?.mode === 'year') {
      const summary =
        yearSummaries.find((y) => y.periodYear === chapterPeek.periodYear) || null;
      if (!summary) return null;
      return { mode: 'year', summary, months: peekMonths.length ? peekMonths : monthSummaries };
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
    monthEntries.length === 0;

  const cta =
    fieldMode && fieldId ? (
      <Button variant="primary" onClick={() => capture?.openCapture({ fieldId })}>
        {t('capture:cta')}
      </Button>
    ) : (
      <Button to="/fields" variant="primary">
        {t('chronologio:ctaViewFields')}
      </Button>
    );

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
      const el = document.getElementById(`chrono-year-${nowYear}`);
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
        fields={fields}
        filters={living.filters}
        axis={living.axis}
        zoom={living.zoom}
        compareOpen={living.compareOpen}
        embedded={embedded}
        onBack={embedded || !fieldId ? undefined : () => navigate(`/fields/${fieldId}`)}
        onSetZoom={living.setZoom}
        onOpenJournal={living.openJournal}
        onSetAxis={living.setAxis}
        onSetFilters={living.setFilters}
        onClearFilters={living.clearFilters}
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
        <div className="chronologio-layout chrono-living-layout">
          <div className="chronologio-main chrono-living-main">
            <AnimatePresence mode="wait">
              <motion.div
                key={living.zoom}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={transition}
              >
                {living.zoom === 'years' ? (
                  <ChronologioYearsView
                    summaries={yearSummaries}
                    activePeriodYear={living.periodYear}
                    numberLocale={numberLocale}
                    onPeekYear={(periodYear) => {
                      living.setSelectedEntry(null);
                      setWeatherEventPeek(null);
                      setChapterPeek({ mode: 'year', periodYear });
                    }}
                  />
                ) : null}
                {living.zoom === 'year' ? (
                  <ChronologioYearView
                    period={activePeriod}
                    months={monthSummaries}
                    focusMonth={living.month}
                    focusMonthYear={living.monthYear}
                    numberLocale={numberLocale}
                    onPeekMonth={(year, month) => {
                      living.setSelectedEntry(null);
                      setWeatherEventPeek(null);
                      setChapterPeek({ mode: 'month', year, month });
                    }}
                  />
                ) : null}
                {living.zoom === 'month' ? (
                  monthEntries.length === 0 ? (
                    <EmptyState
                      icon={<BookOpen size={28} />}
                      title={t('chronologio:living.emptyMonthTitle')}
                      description={t('chronologio:living.emptyMonthDescription')}
                      action={cta}
                    />
                  ) : (
                    <ChronologioMonthView
                      entries={monthEntries}
                      showField={!fieldMode}
                      locale={locale}
                      selectedEntryId={living.selectedEntryId}
                      hasMore={journalHasMore}
                      loadingMore={journalLoadingMore}
                      onLoadMore={loadMoreJournal}
                      onSelect={(e) => living.setSelectedEntry(e.id)}
                      onOpenWeather={(year, month) => {
                        living.setSelectedEntry(null);
                        setWeatherEventPeek(null);
                        setChapterPeek({ mode: 'monthWeather', year, month });
                      }}
                    />
                  )
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
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
        </div>
      ) : null}

      {showReturnToday && !loading && !error && !living.compareOpen ? (
        <button type="button" className="chrono-return-today" onClick={returnToToday}>
          <ArrowUp size={14} aria-hidden />
          {t('chronologio:living.returnToday')}
        </button>
      ) : null}

      <ChronologioPeekDrawer
        peek={peekTarget}
        numberLocale={numberLocale}
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
