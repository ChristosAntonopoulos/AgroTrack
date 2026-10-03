import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BookOpen, ArrowUp } from 'lucide-react';
import Button from '../Common/Button';
import EmptyState from '../Common/EmptyState';
import Breadcrumbs from '../Layout/Breadcrumbs';
import PendingInvitesBanner from '../Partners/PendingInvitesBanner';
import ChronologioSkeleton from './ChronologioSkeleton';
import ChronologioChrome from './ChronologioChrome';
import ChronologioYearsView from './ChronologioYearsView';
import ChronologioYearView from './ChronologioYearView';
import ChronologioMonthView from './ChronologioMonthView';
import ChronologioPeekDrawer from './ChronologioPeekDrawer';
import type { ChronologioPeekTarget } from './ChronologioPeekDrawer';
import ChronologioDateRail from './ChronologioDateRail';
import TodaySummary from './TodaySummary';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import { allDaySummaries } from '../../harvestCampaign/totals';
import {
  campaignFromHarvestRecords,
  fetchHarvestRecordsForFields,
  filterSeasonHarvestRecords,
  mergeCampaignWithHydrated,
} from '../../harvestCampaign/hydrateFromRecords';
import {
  chronologioEntriesFromHarvestDays,
  mergeHarvestDayCards,
  mergeHarvestDayTimeline,
} from '../../chronologio/harvestDayEntries';
import { getChronologioService, getFieldService, getFieldWorkService } from '../../services/serviceFactory';
import { geospatialService } from '../../services/geospatialService';
import { useTodaySummary } from '../../chronologio/useTodaySummary';
import { dayWeatherDateKey, entryMatchesDayWeather, fieldsSharingWeatherGrid, sharedPlaceLabel, type DayWeatherInput } from '../../chronologio/dayWeather';
import { apiCategoryParam, entryMatchesChronologioTypes, selectedChronologioTypes } from '../../chronologio/categorySelection';
import type { MonthChapterFocus } from '../../chronologio/monthPresentation';
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
  chronologioScrollKey,
  isChronologioReturnState,
  saveChronologioFocus,
  saveChronologioJournalScroll,
} from '../../chronologio/chronologioViewState';
import {
  ensureCurrentAgriculturalYear,
  previousYearSummary,
} from '../../chronologio/yearPresentation';
import { PAGE_SIZE } from '../../utils/chronologioGrouping';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { fieldHasBoundary } from '../../utils/fieldDisplay';
import { uniqueChronologioEntries } from '../../utils/chronologioUnique';
import { useChronologioLivingState } from '../../chronologio/useChronologioLivingState';
import { getSeasonStartYear } from '../../utils/harvestSeason';
import type { SupportedLocale } from '../../i18n/config';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useRegisterCapturePage } from '../../context/CapturePageContext';
import { resolveChronologioCaptureDate } from '../../chronologio/captureContext';
import { CAPTURE_SAVED_EVENT } from '../../capture/types';
import { readWorkProfileDraft } from '../../utils/fieldWorkProfileDraft';
import WorkSetupBanner from '../fields/WorkSetupBanner';
import FirstObservationGuide from '../onboarding/FirstObservationGuide';
import SpatialLoadingPanel from '../onboarding/SpatialLoadingPanel';
import { useOwnerActivationOptional } from '../../onboarding/OwnerActivationContext';
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
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const capture = useCaptureOptional();
  const activation = useOwnerActivationOptional();
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
  const [glanceYears, setGlanceYears] = useState<ChronologioPeriodSummary[]>([]);
  const [monthSummaries, setMonthSummaries] = useState<ChronologioMonthSummary[]>([]);
  const [monthEntries, setMonthEntries] = useState<ChronologioEntry[]>([]);
  const [yearEntries, setYearEntries] = useState<ChronologioEntry[]>([]);
  const [journalHasMore, setJournalHasMore] = useState(false);
  const [journalLoadingMore, setJournalLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booted, setBooted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [readyScope, setReadyScope] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [showReturnToday, setShowReturnToday] = useState(false);
  const [chapterPeek, setChapterPeek] = useState<
    | { mode: 'month'; year: number; month: number; focus?: MonthChapterFocus }
    | { mode: 'year'; periodYear: number }
    | { mode: 'monthWeather'; year: number; month: number }
    | { mode: 'dayWeather'; year: number; month: number; dateKey: string }
    | { mode: 'todayWeather' }
    | null
  >(null);
  const [peekMonths, setPeekMonths] = useState<ChronologioMonthSummary[]>([]);
  const [peekPreviousMonths, setPeekPreviousMonths] = useState<ChronologioMonthSummary[]>([]);
  const [peekRecent, setPeekRecent] = useState<ChronologioEntry[]>([]);
  const [peekRecentLoading, setPeekRecentLoading] = useState(false);
  const [peekWeatherReviews, setPeekWeatherReviews] = useState<ChronologioEntry[]>([]);
  const [peekWeatherLoading, setPeekWeatherLoading] = useState(false);
  const [weatherEventPeek, setWeatherEventPeek] = useState<ChronologioEntry | null>(null);
  const [yearWeatherReviews, setYearWeatherReviews] = useState<ChronologioEntry[]>([]);
  const [workSetup, setWorkSetup] = useState<{ resume: boolean } | null>(null);
  const [workSetupDismissed, setWorkSetupDismissed] = useState(false);
  const journalLoadLock = useRef(false);
  const restoredFocusRef = useRef(false);

  const scopedFieldId = fieldMode ? fieldId : living.filters.fieldId;
  const observationFieldId =
    activation?.awaitingFirstObservation && !activation.completion.firstObservation
      ? scopedFieldId || activation.primaryField?.id
      : undefined;
  const spatialWelcomeId = (() => {
    const params = new URLSearchParams(location.search);
    if (params.get('activation') !== 'spatial') return null;
    return (params.get('fieldId') || params.get('field') || scopedFieldId || '').trim() || null;
  })();
  const groveNameFromNav = (location.state as { groveName?: string } | null)?.groveName?.trim() || '';
  const spatialWelcomeName =
    fields.find((field) => field.id === spatialWelcomeId)?.name?.trim() ||
    (fieldMode && fieldId === spatialWelcomeId ? fieldName : '') ||
    groveNameFromNav;
  const todayIso = toIsoDate(new Date());
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  const chronologioCaptureDate = useMemo(
    () =>
      resolveChronologioCaptureDate({
        zoom: living.zoom,
        focusDate: living.focusDate,
        language: i18n.language,
      }),
    [living.zoom, living.focusDate, i18n.language]
  );

  useRegisterCapturePage({
    sourcePage: fieldMode ? 'grove' : 'chronologio',
    fieldId: scopedFieldId || undefined,
    occurredAt: chronologioCaptureDate.occurredAt,
    dateDefaultedToToday: chronologioCaptureDate.dateDefaultedToToday,
    dateNeedsChoice: chronologioCaptureDate.dateNeedsChoice,
    periodLabel: chronologioCaptureDate.periodLabel,
  });

  useEffect(() => {
    saveChronologioFocus({
      focusDate: living.focusDate,
      zoom: living.zoom,
      fieldId: scopedFieldId,
    });
  }, [living.focusDate, living.zoom, scopedFieldId]);

  useEffect(() => {
    if (!scopedFieldId) {
      setWorkSetup(null);
      setWorkSetupDismissed(false);
      return;
    }
    const dismissKey = `The Olive Lot.workSetupBanner.dismissed.${scopedFieldId}`;
    if (localStorage.getItem(dismissKey) === '1') {
      setWorkSetup(null);
      setWorkSetupDismissed(true);
      return;
    }
    setWorkSetupDismissed(false);
    let cancelled = false;
    void getFieldWorkService()
      .getWorkProfile(scopedFieldId)
      .then((profile) => {
        if (cancelled) return;
        const resume =
          profile?.status === 'draft' || Boolean(readWorkProfileDraft(scopedFieldId)?.stepId);
        if (profile == null || profile.status === 'draft') {
          setWorkSetup({ resume });
        } else {
          setWorkSetup(null);
        }
      })
      .catch(() => {
        if (!cancelled) setWorkSetup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [scopedFieldId]);

  useEffect(() => {
    if (restoredFocusRef.current) return;
    restoredFocusRef.current = true;
    const fromState = (location.state as { chronologioReturn?: unknown } | null)?.chronologioReturn;
    if (!isChronologioReturnState(fromState)) return;
    if (fromState.focusDate) living.setFocusDate(fromState.focusDate);
    if (fromState.zoom) living.setZoom(fromState.zoom);
    if (typeof fromState.scrollTop === 'number') {
      saveChronologioJournalScroll(
        chronologioScrollKey({
          zoom: fromState.zoom || living.zoom,
          focusDate: fromState.focusDate || living.focusDate,
          fieldId: scopedFieldId,
        }),
        fromState.scrollTop
      );
    }
    // Intentionally once on mount — URL + sessionStorage own ongoing focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void getFieldService()
      .getFields('chronologio')
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
      category: apiCategoryParam(living.filters.category),
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
        category: apiCategoryParam(living.filters.category),
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
  const harvestTab = living.filters.category === 'harvest';
  // Still load today weather for the strip; do not pin an attention card above the timeline.
  const todayBriefLive = living.zoom === 'month' && isLiveJournalMonth && !harvestTab;
  const showTodaySummary = false;

  const fetchJournalPage = useCallback(
    async (offset: number) => {
      const { to } = calendarMonthBounds(living.monthYear, living.month);
      const filters = {
        to: isLiveJournalMonth ? undefined : to,
        category: apiCategoryParam(living.filters.category),
        lifecycleYear: undefined,
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
      if (booted) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setJournalHasMore(false);
      try {
        const years = await fetchYears();
        if (cancelled) return;
        setYearSummaries(years);

        if (living.zoom === 'year') {
          const months = await fetchMonths(living.periodYear);
          if (cancelled) return;
          setMonthSummaries(months);
        } else {
          setMonthSummaries([]);
        }

        if (living.zoom === 'month') {
          const svc = getChronologioService();
          const glanceFilters = {
            axis: 'agricultural' as const,
            category: apiCategoryParam(living.filters.category),
            fieldId: !fieldMode ? living.filters.fieldId : undefined,
          };
          const [entries, glances] = await Promise.all([
            fetchJournalPage(0),
            (scopedFieldId
              ? svc.getFieldYearSummaries(scopedFieldId, glanceFilters)
              : svc.getMyYearSummaries(glanceFilters)
            ).catch(() => [] as ChronologioPeriodSummary[]),
          ]);
          if (cancelled) return;
          setMonthEntries(uniqueChronologioEntries(entries));
          setJournalHasMore(entries.length >= PAGE_SIZE);
          setYearEntries([]);
          setGlanceYears(glances);
        } else if (living.zoom === 'year') {
          const { from, to } = periodBounds(living.periodYear, living.axis);
          const svc = getChronologioService();
          const filters = {
            from,
            to,
            category: apiCategoryParam(living.filters.category),
            lifecycleYear: undefined,
            fieldId: !fieldMode ? living.filters.fieldId : undefined,
            limit: 200,
          };
          const yearRows = scopedFieldId
            ? await svc.getFieldChronologio(scopedFieldId, filters)
            : await svc.getMyChronologio(filters);
          if (cancelled) return;
          setYearEntries(uniqueChronologioEntries(yearRows));
          setMonthEntries([]);
          setGlanceYears([]);
          setJournalHasMore(false);
        } else {
          setMonthEntries([]);
          setYearEntries([]);
          setGlanceYears([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(loadErrorMessage(err));
          if (!booted) {
            setYearSummaries([]);
            setMonthSummaries([]);
            setMonthEntries([]);
            setYearEntries([]);
            setGlanceYears([]);
          }
          setJournalHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
          setBooted(true);
          setReadyScope(
            `${living.zoom}|${living.axis}|${living.periodYear}|${living.monthYear}-${living.month}|${living.filters.fieldId || ''}|${living.filters.category}|${living.filters.lifecycleYear}`
          );
        }
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
    living.filters.category,
    living.filters.fieldId,
    living.filters.lifecycleYear,
    living.zoom === 'year' ? living.periodYear : 0,
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
    const onSaved = () => setReloadToken((n) => n + 1);
    window.addEventListener(CAPTURE_SAVED_EVENT, onSaved);
    return () => window.removeEventListener(CAPTURE_SAVED_EVENT, onSaved);
  }, []);

  const zoomScrollRef = useRef(living.zoom);
  useEffect(() => {
    if (zoomScrollRef.current === living.zoom) return;
    zoomScrollRef.current = living.zoom;
    if (living.zoom === 'years') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [living.zoom]);

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

  useEffect(() => {
    if (living.selectedEntryId) {
      setChapterPeek(null);
      setWeatherEventPeek(null);
    }
  }, [living.selectedEntryId]);

  useEffect(() => {
    if (chapterPeek?.mode !== 'year') {
      setPeekMonths([]);
      setPeekPreviousMonths([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      fetchMonths(chapterPeek.periodYear),
      fetchMonths(chapterPeek.periodYear - 1),
    ])
      .then(([rows, previousRows]) => {
        if (!cancelled) {
          setPeekMonths(rows);
          setPeekPreviousMonths(previousRows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeekMonths([]);
          setPeekPreviousMonths([]);
        }
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
    const { year, month, focus } = chapterPeek;
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const focusCategory =
      focus === 'work' ? 'task' : focus === 'observation' ? 'note' : focus === 'harvest' ? 'harvest' : undefined;
    setPeekRecentLoading(true);
    const svc = getChronologioService();
    const filters = {
      from,
      to,
      limit: focus ? 40 : 8,
      ...(focusCategory ? { category: focusCategory } : {}),
      ...(!focusCategory && apiCategoryParam(living.filters.category)
        ? { category: apiCategoryParam(living.filters.category) }
        : {}),
      ...(scopedFieldId && !fieldMode ? { fieldId: scopedFieldId } : {}),
    };
    const request = fieldMode && fieldId
      ? svc.getFieldChronologio(fieldId, filters)
      : svc.getMyChronologio(filters);
    void request
      .then((rows) => {
        if (cancelled) return;
        const matched =
          focus === 'money'
            ? rows.filter((entry) => entry.category === 'expense' || entry.category === 'income')
            : focus === 'observation'
              ? rows.filter((entry) => entry.category === 'note' || entry.category === 'photo')
              : rows;
        setPeekRecent(matched.slice(0, focus ? 12 : 5));
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

  const harvestCampaign = useHarvestCampaignOptional();
  const seasonStartYear = useMemo(() => getSeasonStartYear(), []);
  /** DB harvest days across seasons — Chronologio must not depend on the live campaign season alone. */
  const [recordDayEntries, setRecordDayEntries] = useState<ChronologioEntry[]>([]);
  const harvestPatchRef = useRef(harvestCampaign?.patch);
  harvestPatchRef.current = harvestCampaign?.patch;

  // Same hydration as /harvest, plus all-season day cards for the timeline.
  useEffect(() => {
    if (fields.length === 0) return;
    let cancelled = false;
    const usable = fields.filter((field) => field.status !== 'Draft' && field.status !== 'Archived');
    const fieldIds = (usable.length > 0 ? usable : fields).map((field) => field.id);
    void (async () => {
      try {
        const rows = await fetchHarvestRecordsForFields(fieldIds);
        if (cancelled) return;
        const allPosted = campaignFromHarvestRecords(rows, seasonStartYear, { ignoreSeason: true });
        const days = allDaySummaries(allPosted).filter(
          (day) =>
            (day.sacks > 0 ||
              day.officialKg > 0 ||
              day.estimatedKg > 0 ||
              day.oilKg > 0 ||
              day.people > 0 ||
              day.expenseEur > 0) &&
            (!scopedFieldId || day.fieldIds.includes(scopedFieldId))
        );
        setRecordDayEntries(chronologioEntriesFromHarvestDays(days, fields, scopedFieldId));

        const patch = harvestPatchRef.current;
        if (!patch) return;
        const seasonRows = filterSeasonHarvestRecords(rows, seasonStartYear);
        if (seasonRows.length === 0) return;
        const hydrated = campaignFromHarvestRecords(seasonRows, seasonStartYear);
        patch((current) => mergeCampaignWithHydrated(current, hydrated));
      } catch {
        /* keep local campaign / empty day cards */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fields, scopedFieldId, seasonStartYear]);

  const wantsHarvestOnTimeline = useMemo(() => {
    const selected = selectedChronologioTypes(living.filters.category);
    return selected.length === 0 || selected.includes('harvest');
  }, [living.filters.category]);

  const campaignDayEntries = useMemo(() => {
    if (!harvestCampaign || !wantsHarvestOnTimeline) return [];
    const days = allDaySummaries(harvestCampaign.campaign).filter(
      (day) =>
        day.sacks > 0 ||
        day.officialKg > 0 ||
        day.estimatedKg > 0 ||
        day.oilKg > 0 ||
        day.people > 0 ||
        day.expenseEur > 0
    );
    const scoped = scopedFieldId
      ? days.filter((day) => day.fieldIds.includes(scopedFieldId))
      : days;
    return chronologioEntriesFromHarvestDays(scoped, fields, scopedFieldId);
  }, [fields, harvestCampaign, scopedFieldId, wantsHarvestOnTimeline]);

  const harvestDayCards = useMemo(() => {
    if (!wantsHarvestOnTimeline) return [];
    // Prefer campaign (local edits) over raw DB hydrate when both exist.
    return mergeHarvestDayCards(recordDayEntries, campaignDayEntries);
  }, [campaignDayEntries, recordDayEntries, wantsHarvestOnTimeline]);

  const timelineEntries = useMemo(() => {
    const rows = monthEntries.filter((entry) =>
      entryMatchesChronologioTypes(entry, living.filters.category)
    );
    if (harvestDayCards.length === 0) return rows;
    return mergeHarvestDayTimeline(rows, harvestDayCards);
  }, [harvestDayCards, living.filters.category, monthEntries]);

  const selectedEntry = useMemo(
    () =>
      timelineEntries.find((e) => e.id === living.selectedEntryId) ||
      yearEntries.find((e) => e.id === living.selectedEntryId) ||
      yearWeatherReviews.find((e) => e.id === living.selectedEntryId) ||
      null,
    [living.selectedEntryId, timelineEntries, yearEntries, yearWeatherReviews]
  );

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
        previousMonths: peekPreviousMonths,
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
        focus: chapterPeek.focus,
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
    peekPreviousMonths,
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

  const noStory =
    !loading && !error && yearSummaries.length === 0 && monthEntries.length === 0;
  const empty = noStory && !showTodaySummary;

  const starterGrove = useMemo(() => {
    const named = fields.filter((field) => field.status !== 'Archived' && Boolean(field.name?.trim()));
    if (scopedFieldId) return named.find((field) => field.id === scopedFieldId) ?? null;
    return named[0] ?? null;
  }, [fields, scopedFieldId]);
  const starterNeedsBoundary = Boolean(starterGrove && !fieldHasBoundary(starterGrove));
  const starterName = fieldName || starterGrove?.name || '';
  const showStarterEmpty =
    booted && !error && !refreshing && noStory && Boolean(starterGrove);

  const cta =
    noStory && starterGrove ? (
      <div className="chrono-first-actions">
        {starterNeedsBoundary ? (
          <>
            <Button
              variant="primary"
              onClick={() => navigate(`/fields/${starterGrove.id}/edit?focus=boundary`)}
            >
              {t('chronologio:firstGrove.continuePlace')}
            </Button>
            <Button variant="secondary" to={`/fields/${starterGrove.id}`}>
              {t('chronologio:firstGrove.viewGrove')}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            onClick={() =>
              capture?.openCapture({
                fieldId: starterGrove.id,
                sourcePage: fieldMode ? 'grove' : 'chronologio',
                occurredAt: chronologioCaptureDate.occurredAt,
                dateDefaultedToToday: chronologioCaptureDate.dateDefaultedToToday,
                dateNeedsChoice: chronologioCaptureDate.dateNeedsChoice,
                periodLabel: chronologioCaptureDate.periodLabel,
              })
            }
            disabled={!capture}
          >
            {t('chronologio:firstGrove.primary')}
          </Button>
        )}
      </div>
    ) : fieldMode && fieldId ? (
    <Button variant="primary" to={`/fields/${fieldId}`}>
      {t('chronologio:backToField')}
    </Button>
  ) : noStory ? (
    <Button to="/fields" variant="primary">
      {t('chronologio:ctaViewFields')}
    </Button>
  ) : null;

  const visibleYearEntries = useMemo(
    () => yearEntries.filter((entry) => entryMatchesChronologioTypes(entry, living.filters.category)),
    [living.filters.category, yearEntries]
  );
  const viewScope = `${living.zoom}|${living.axis}|${living.periodYear}|${living.monthYear}-${living.month}|${living.filters.fieldId || ''}|${living.filters.category}|${living.filters.lifecycleYear}`;
  const panelBusy = booted && readyScope !== null && readyScope !== viewScope;

  const today = useTodaySummary({
    enabled: todayBriefLive && booted && !error,
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
    // Wait for journal dates. An empty month used to ask for today→today, which
    // returns no snapshots and, with a bad token, 401s and sends the user to login.
    if (dates.length === 0) return;
    const from = dates[0];
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
            fieldId: weatherField,
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
  }, [fields, living.zoom, monthEntries, scopedFieldId, todayIso]);

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

  const weatherScopeNote = useMemo(() => {
    if (scopedFieldId || !today.weatherField || fields.length < 2) return undefined;
    const related = fieldsSharingWeatherGrid(
      today.weatherField.id,
      fields.map((f) => ({ id: f.id, latitude: f.latitude, longitude: f.longitude }))
    );
    const names = fields.filter((f) => related.includes(f.id)).map((f) => f.name);
    if (related.length > 1) {
      const place = sharedPlaceLabel(names);
      return place
        ? t('chronologio:weatherCard.areaApplies', { area: place, count: related.length })
        : t('chronologio:weatherCard.nearbyApplies', { count: related.length });
    }
    return t('chronologio:weatherCard.activeField', { field: today.weatherField.name });
  }, [fields, scopedFieldId, t, today.weatherField]);

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
    const weatherFieldId =
      scopedFieldId ||
      today.weatherFieldId ||
      weatherByDate[chapterPeek.dateKey]?.fieldId ||
      fields[0]?.id;
    const weatherField = fields.find((f) => f.id === weatherFieldId) || fields[0];
    const relatedFieldIds = fieldsSharingWeatherGrid(
      weatherFieldId || '',
      fields.map((f) => ({ id: f.id, latitude: f.latitude, longitude: f.longitude }))
    );
    const sharedGrid = relatedFieldIds.length > 1;
    const events = monthEntries.filter(
      (e) =>
        entryMatchesDayWeather(e, {
          dateKey: chapterPeek.dateKey,
          fieldIds: relatedFieldIds,
        }) &&
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
      sharedWeatherGrid: sharedGrid,
      relatedFieldNames: sharedGrid
        ? fields.filter((f) => relatedFieldIds.includes(f.id)).map((f) => f.name)
        : undefined,
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
    living.openJournal();
    if (living.zoom === 'years') {
      const el = document.getElementById(`chrono-year-${agriculturalYearFor(new Date())}`);
      el?.scrollIntoView({
        block: 'center',
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }
  }, [living, nowYear, reduceMotion]);

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.26, ease: 'easeOut' as const };

  return (
    <div className={`chronologio-shell chrono-living${embedded ? ' chronologio-shell--embedded' : ''}`}>
      {spatialWelcomeId && activation?.eligible ? (
        <SpatialLoadingPanel
          fieldId={spatialWelcomeId}
          fieldName={spatialWelcomeName}
        />
      ) : null}
      {embedded ? null : <Breadcrumbs />}
      {embedded ? null : <PendingInvitesBanner />}
      <ChronologioChrome
        fieldMode={fieldMode}
        fieldName={fieldName}
        fieldId={fieldId}
        fields={fields}
        filters={living.filters}
        zoom={living.zoom}
        focusDate={living.focusDate}
        periodYear={living.periodYear}
        axis={living.axis}
        embedded={embedded}
        onSetZoom={living.setZoom}
        onSetFilters={living.setFilters}
        onJumpToDate={(isoDate) => living.jumpToDate(isoDate)}
      />

      {observationFieldId ? <FirstObservationGuide fieldId={observationFieldId} /> : null}

      {scopedFieldId && workSetup && !workSetupDismissed ? (
        <WorkSetupBanner
          fieldId={scopedFieldId}
          resume={workSetup.resume}
          onDismiss={() => {
            localStorage.setItem(`The Olive Lot.workSetupBanner.dismissed.${scopedFieldId}`, '1');
            setWorkSetupDismissed(true);
            setWorkSetup(null);
          }}
        />
      ) : null}

      {!booted && loading ? <ChronologioSkeleton zoom={living.zoom} /> : null}

      {booted && error ? (
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

      {showStarterEmpty || (booted && !error && empty && !refreshing) ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title={
            starterGrove
              ? t('chronologio:firstGrove.title', { name: starterName })
              : fieldMode
                ? t('chronologio:emptyFieldTitle')
                : t('chronologio:emptyGlobalTitle')
          }
          description={
            starterGrove
              ? starterNeedsBoundary
                ? t('chronologio:firstGrove.needsBoundary')
                : t('chronologio:firstGrove.body')
              : fieldMode
                ? t('chronologio:emptyFieldDescription')
                : t('chronologio:emptyGlobalDescription')
          }
          action={cta}
        />
      ) : null}

      {booted && !error && !showStarterEmpty && (!empty || refreshing) ? (
        <div
          className={`chronologio-layout chrono-living-layout${living.zoom !== 'years' && yearSummaries.length >= 5 ? ' has-date-rail' : ''}${panelBusy ? ' is-refreshing' : ''}`}
          aria-busy={panelBusy || undefined}
        >
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
                {panelBusy ? (
                  <>
                    <p className="sr-only" role="status">
                      {t('chronologio:living.loadingOlder')}
                    </p>
                    <ChronologioSkeleton zoom={living.zoom} />
                  </>
                ) : null}
                {!panelBusy && living.zoom === 'years' ? (
                  <ChronologioYearsView
                    summaries={yearSummaries}
                    numberLocale={numberLocale}
                    allFields={!fieldMode && !scopedFieldId && !living.filters.fieldId}
                    onOpenYear={living.openSeasonYear}
                  />
                ) : null}
                {!panelBusy && living.zoom === 'year' ? (
                  <ChronologioYearView
                    periodYear={living.periodYear}
                    axis={living.axis}
                    months={monthSummaries}
                    entries={visibleYearEntries}
                    weatherReviews={yearWeatherReviews}
                    focusMonth={living.month}
                    focusMonthYear={living.monthYear}
                    numberLocale={numberLocale}
                    locale={locale}
                    weatherByMonth={weatherByMonth}
                    fieldId={scopedFieldId || fieldId}
                    showField={!fieldMode}
                    groveNames={fields
                      .filter((f) => f.status !== 'Draft' && f.status !== 'Archived')
                      .map((f) => ({ id: f.id, name: f.name }))}
                    selectedEntryId={living.selectedEntryId}
                    focusDate={living.focusDate}
                    zoom={living.zoom}
                    onPeekMonth={(year, month, focus) => {
                      living.setSelectedEntry(null);
                      setWeatherEventPeek(null);
                      setChapterPeek({ mode: 'month', year, month, focus });
                    }}
                    onOpenMonthDays={(year, month) => living.openMonth(year, month)}
                    onPeekMonthWeather={(year, month) => {
                      living.setSelectedEntry(null);
                      setWeatherEventPeek(null);
                      setChapterPeek({ mode: 'monthWeather', year, month });
                    }}
                    onSelect={(e) => living.setSelectedEntry(e.id)}
                    onClearSelection={closePeek}
                  />
                ) : null}
                {!panelBusy && living.zoom === 'month' ? (
                  <>
                    {showTodaySummary ? (
                      <TodaySummary
                        today={today}
                        fieldId={scopedFieldId || fieldId}
                        weatherScopeNote={weatherScopeNote}
                        onOpenWeather={() => {
                          living.setSelectedEntry(null);
                          setWeatherEventPeek(null);
                          setChapterPeek({ mode: 'todayWeather' });
                        }}
                      />
                    ) : null}
                    {timelineEntries.length === 0 ? (
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
                        entries={timelineEntries}
                        showField={!fieldMode}
                        locale={locale}
                        selectedEntryId={living.selectedEntryId}
                        hasMore={journalHasMore}
                        loadingMore={journalLoadingMore}
                        focusDate={living.focusDate}
                        zoom={living.zoom}
                        fieldId={scopedFieldId}
                        yearGlances={glanceYears}
                        onLoadMore={loadMoreJournal}
                        onSelect={(e) => living.setSelectedEntry(e.id)}
                        onClearSelection={closePeek}
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

      {showReturnToday && !loading && !error ? (
        <button type="button" className="chrono-return-today" onClick={returnToToday}>
          <ArrowUp size={14} aria-hidden />
          {t('chronologio:living.returnToday')}
        </button>
      ) : null}

      <ChronologioPeekDrawer
        peek={resolvedPeek}
        numberLocale={numberLocale}
        weatherByDate={weatherByDate}
        fieldOptions={fields.map((f) => ({ id: f.id, name: f.name, color: f.color }))}
        onClose={closePeek}
        onMutated={() => setReloadToken((n) => n + 1)}
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
          // Extreme weather is shown inline on the timeline — do not open a peek.
          if (
            e.eventType === 'weather.heat' ||
            e.eventType === 'weather.frost' ||
            e.eventType === 'weather.nearFrost' ||
            e.eventType === 'weather.heavyRain' ||
            e.eventType === 'weather.drought' ||
            e.eventType === 'weather.coldSpell'
          ) {
            setWeatherEventPeek(null);
            living.setSelectedEntry(null);
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
