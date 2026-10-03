import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import EmptyState from '../components/EmptyState';
import ChronologioPeekSheet, {
  ChronologioPeekTarget,
} from '../components/chronologio/ChronologioPeekSheet';
import ChronologioDaysTimeline from '../components/chronologio/ChronologioDaysTimeline';
import ChronologioZoomTabs from '../components/chronologio/ChronologioZoomTabs';
import ChronologioMonthChapterCard from '../components/chronologio/ChronologioMonthChapterCard';
import ChronologioYearChapterCard from '../components/chronologio/ChronologioYearChapterCard';
import ChronologioZoomPager from '../components/chronologio/ChronologioZoomPager';
import TodaySummary from '../components/chronologio/TodaySummary';
import WeatherPeekSheet from '../components/weather/WeatherPeekSheet';
import FilterChips from '../components/ui/FilterChips';
import Button from '../components/ui/Button';
import HeaderIconButton from '../components/layout/HeaderIconButton';
import DismissibleChip from '../components/ui/DismissibleChip';
import Sheet from '../components/ui/Sheet';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useRegisterCapturePage } from '../context/CapturePageContext';
import { useHarvestCampaignOptional } from '../context/HarvestCampaignContext';
import { usePreferences } from '../context/PreferencesContext';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { fieldHasBoundary } from '../utils/fieldDisplay';
import { appFonts, spacing, radii } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { getChronologioService, getFieldService, getFieldWorkService } from '../services/serviceFactory';
import WorkSetupBanner from '../components/fields/WorkSetupBanner';
import FirstObservationGuide from '../components/onboarding/FirstObservationGuide';
import {
  dismissWorkSetupBanner,
  isWorkSetupBannerDismissed,
  readWorkProfileDraft,
} from '../utils/fieldWorkProfileDraft';
import type {
  ChronologioAxis,
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../services/chronologioService';
import type { Field } from '../services/fieldService';
import { PAGE_SIZE } from '../utils/chronologioGrouping';
import { resolveFieldColor } from '../utils/fieldColors';
import { yearFixedMetrics } from '../utils/summaryFacts';
import { buildMonthWeatherView, monthSeasonStage, type MonthChapterFocus, monthFocusApiCategory, entryMatchesMonthFocus } from '../chronologio/monthPresentation';
import { previousYearSummary } from '../chronologio/yearPresentation';
import { daysLandingMonth } from '../chronologio/daysLanding';
import { agriculturalYearFor } from '../chronologio/agriculturalYear';
import {
  readChronologioFilters,
  writeChronologioFilters,
} from '../chronologio/filterPreferences';
import { apiCategoryParam, entryMatchesChronologioTypes, chronologioTypesParam, selectedChronologioTypes, CHRONOLOGIO_TYPE_IDS, type ChronologioTypeId } from '../chronologio/categorySelection';
import { preferredCaptureTypeFromCategory, resolveChronologioCaptureDate } from '../chronologio/captureContext';
import { useTodaySummary } from '../chronologio/useTodaySummary';
import {
  dayWeatherDateKey,
  fieldsSharingWeatherGrid,
  sharedPlaceLabel,
  type DayWeatherInput,
} from '../chronologio/dayWeather';
import { geospatialService } from '../services/geospatialService';
import { allDaySummaries } from '../harvestCampaign/totals';
import {
  campaignFromHarvestRecords,
  fetchHarvestRecordsForFields,
  filterSeasonHarvestRecords,
  mergeCampaignWithHydrated,
} from '../harvestCampaign/hydrateFromRecords';
import {
  chronologioEntriesFromHarvestDays,
  mergeHarvestDayCards,
  mergeHarvestDayTimeline,
} from '../chronologio/harvestDayEntries';
import { getSeasonStartYear } from '../utils/harvestSeason';
import { athensCalendarDateKey, athensParts } from '../utils/athensDate';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Zoom = 'years' | 'year' | 'month';

const ZOOM_DISPLAY_ORDER: Zoom[] = ['month', 'year', 'years'];
const FILTER_TYPE_IDS: Array<ChronologioTypeId | 'all'> = [
  'all',
  ...CHRONOLOGIO_TYPE_IDS,
];

const monthBounds = (year: number, month: number) => {
  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();
  return { from, to };
};

const isYearWeatherReview = (e: ChronologioEntry) => e.eventType === 'weather.yearReview';

type ChronologioViewProps = {
  fieldId?: string;
  embedded?: boolean;
};

const ChronologioScreen = ({ fieldId: fieldIdProp, embedded }: ChronologioViewProps = {}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'capture']);
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const { user } = useAuth();
  const capture = useCaptureOptional();
  const activation = useOwnerActivationOptional();
  const harvestCampaign = useHarvestCampaignOptional();
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const fieldId =
    fieldIdProp ?? (route.params as { fieldId?: string } | undefined)?.fieldId;
  const fieldMode = Boolean(fieldId);
  const numberLocale = i18n.language?.startsWith('el') ? 'el-GR' : 'en-US';
  const now = useMemo(() => athensParts(new Date()), []);
  const nowYear = now.year;
  const nowMonth = now.month;
  const tt = useCallback(
    (key: string, opts?: Record<string, string | number>) =>
      t(`chronologio:${key}`, opts as Record<string, unknown>),
    [t]
  );

  const [fieldName, setFieldName] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [zoom, setZoom] = useState<Zoom>('month');
  const [axis, setAxis] = useState<ChronologioAxis>('agricultural');
  const [filterCategory, setFilterCategory] = useState('all');
  const [lifecycleYear, setLifecycleYear] = useState<'' | 'low' | 'high'>('');
  const [filterFieldId, setFilterFieldId] = useState('');
  const [filtersReady, setFiltersReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [periodYear, setPeriodYear] = useState(() => agriculturalYearFor(new Date()));
  const [monthYear, setMonthYear] = useState(nowYear);
  const [month, setMonth] = useState(nowMonth);
  const [years, setYears] = useState<ChronologioPeriodSummary[]>([]);
  const [months, setMonths] = useState<ChronologioMonthSummary[]>([]);
  const [entries, setEntries] = useState<ChronologioEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [peek, setPeek] = useState<ChronologioPeekTarget | null>(null);
  const [peekMonthsCache, setPeekMonthsCache] = useState<ChronologioMonthSummary[]>([]);
  const [workSetup, setWorkSetup] = useState<{ resume: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [booted, setBooted] = useState(false);
  const bootedRef = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [weatherByDate, setWeatherByDate] = useState<Record<string, DayWeatherInput>>({});
  const [todayWeatherPeek, setTodayWeatherPeek] = useState(false);
  const [focusDate, setFocusDate] = useState(() => athensCalendarDateKey(new Date()));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readChronologioFilters();
      if (cancelled) return;
      if (stored.category) setFilterCategory(stored.category);
      // Light/heavy year filter retired — drop any stored value.
      setLifecycleYear('');
      if (!fieldMode && stored.fieldId) setFilterFieldId(stored.fieldId);
      setFiltersReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldMode]);

  useEffect(() => {
    if (!filtersReady) return;
    void writeChronologioFilters(
      {
        category: filterCategory,
        lifecycleYear: '',
        fieldId: filterFieldId,
      },
      { preserveFieldId: fieldMode }
    );
  }, [fieldMode, filterCategory, filterFieldId, filtersReady]);

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

  useEffect(() => {
    if (!user?.id) {
      setFields([]);
      return;
    }
    void getFieldService()
      .getFields(user.id, user.role || 'FieldOwner', 'chronologio')
      .then(setFields)
      .catch(() => undefined);
  }, [user?.id, user?.role]);

  const scopedFieldId = fieldMode ? fieldId : filterFieldId || undefined;
  const observationFieldId =
    activation?.awaitingFirstObservation && !activation.completion.firstObservation
      ? scopedFieldId || activation.primaryField?.id
      : undefined;

  const chronologioCaptureDate = useMemo(
    () =>
      resolveChronologioCaptureDate({
        zoom,
        focusDate,
        language: i18n.language,
      }),
    [zoom, focusDate, i18n.language]
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
    if (!scopedFieldId) {
      setWorkSetup(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (await isWorkSetupBannerDismissed(scopedFieldId)) {
        if (!cancelled) setWorkSetup(null);
        return;
      }
      try {
        const [profile, draft] = await Promise.all([
          getFieldWorkService().getWorkProfile(scopedFieldId).catch(() => null),
          readWorkProfileDraft(scopedFieldId),
        ]);
        if (cancelled) return;
        const resume = profile?.status === 'draft' || Boolean(draft?.stepId);
        if (profile == null || profile.status === 'draft') setWorkSetup({ resume });
        else setWorkSetup(null);
      } catch {
        if (!cancelled) setWorkSetup(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scopedFieldId]);

  const filtersDirty =
    filterCategory !== 'all' || (!fieldMode && Boolean(filterFieldId));

  const starterGrove = useMemo(() => {
    const named = fields.filter((f) => f.status !== 'Archived' && Boolean(f.name?.trim()));
    if (fieldId) return named.find((f) => f.id === fieldId) ?? null;
    return named[0] ?? null;
  }, [fields, fieldId]);
  const starterNeedsBoundary = Boolean(starterGrove && !fieldHasBoundary(starterGrove));
  const showStarter =
    booted && !loading && years.length === 0 && !filtersDirty && Boolean(starterGrove);

  const journalFilterParams = useMemo(
    () => ({
      category: apiCategoryParam(filterCategory),
      fieldId: !fieldMode ? filterFieldId || undefined : undefined,
    }),
    [fieldMode, filterCategory, filterFieldId]
  );

  const summaryFilterParams = useMemo(
    () => ({
      axis,
      category: apiCategoryParam(filterCategory),
      fieldId: !fieldMode ? filterFieldId || undefined : undefined,
    }),
    [axis, fieldMode, filterCategory, filterFieldId]
  );

  const load = useCallback(async () => {
    // After first paint, keep the zoom pager mounted so Days↔Months↔Years swipe stays seamless.
    if (!bootedRef.current) setLoading(true);
    try {
      const svc = getChronologioService();
      const yearList = scopedFieldId
        ? await svc.getFieldYearSummaries(scopedFieldId, summaryFilterParams)
        : await svc.getMyYearSummaries(summaryFilterParams);
      setYears(Array.isArray(yearList) ? yearList : []);

      if (zoom === 'year' || zoom === 'month') {
        const monthFilters = {
          ...summaryFilterParams,
          year: axis === 'season' ? undefined : periodYear,
          season: axis === 'season' ? periodYear : undefined,
        };
        const monthList = scopedFieldId
          ? await svc.getFieldMonthSummaries(scopedFieldId, monthFilters)
          : await svc.getMyMonthSummaries(monthFilters);
        setMonths(Array.isArray(monthList) ? monthList : []);
      }
      // Keep months cache when on Years so the pager page stays warm

      if (zoom === 'month') {
        // Live Days journal is unbounded into the past (infinite timeline).
        // Historical month (opened from a chapter) stays capped at month end.
        const live = monthYear === nowYear && month === nowMonth;
        const { to } = monthBounds(monthYear, month);
        const list = scopedFieldId
          ? await svc.getFieldChronologio(scopedFieldId, {
              to: live ? undefined : to,
              limit: PAGE_SIZE,
              offset: 0,
              ...journalFilterParams,
            })
          : await svc.getMyChronologio({
              to: live ? undefined : to,
              limit: PAGE_SIZE,
              offset: 0,
              ...journalFilterParams,
            });
        const safeList = Array.isArray(list) ? list : [];
        setEntries(safeList);
        setHasMore(safeList.length >= PAGE_SIZE);
      }
      // Keep entries cache when leaving Days so swipe-back stays seamless
    } catch {
      setYears([]);
      setMonths([]);
      setEntries([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      bootedRef.current = true;
      setBooted(true);
    }
  }, [
    axis,
    journalFilterParams,
    month,
    monthYear,
    nowMonth,
    nowYear,
    periodYear,
    scopedFieldId,
    summaryFilterParams,
    zoom,
  ]);

  useEffect(() => {
    if (!filtersReady) return;
    void load();
  }, [filtersReady, load, reloadToken]);

  const loadMore = useCallback(async () => {
    if (zoom !== 'month' || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const svc = getChronologioService();
      const live = monthYear === nowYear && month === nowMonth;
      const { to } = monthBounds(monthYear, month);
      const next = scopedFieldId
        ? await svc.getFieldChronologio(scopedFieldId, {
            to: live ? undefined : to,
            limit: PAGE_SIZE,
            offset: entries.length,
            ...journalFilterParams,
          })
        : await svc.getMyChronologio({
            to: live ? undefined : to,
            limit: PAGE_SIZE,
            offset: entries.length,
            ...journalFilterParams,
          });
      setEntries((prev) => {
        const seen = new Set((prev || []).map((e) => e.id));
        const safeNext = Array.isArray(next) ? next : [];
        return [...(prev || []), ...safeNext.filter((e) => !seen.has(e.id))];
      });
      setHasMore(Array.isArray(next) && next.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [
    entries.length,
    hasMore,
    journalFilterParams,
    loading,
    loadingMore,
    month,
    monthYear,
    nowMonth,
    nowYear,
    scopedFieldId,
    zoom,
  ]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CAPTURE_SAVED_EVENT, () => {
      setReloadToken((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  const journalLive = monthYear === nowYear && month === nowMonth;

  const landDaysOnCurrentPeriod = useCallback(() => {
    const landing = daysLandingMonth(periodYear, { year: monthYear, month }, now);
    if (!landing) return;
    setMonthYear(landing.year);
    setMonth(landing.month);
  }, [month, monthYear, now, periodYear]);

  const setZoomAndPage = useCallback(
    (z: Zoom) => {
      if (z === 'month' && zoom !== 'month') landDaysOnCurrentPeriod();
      if (z !== 'month') {
        setPeriodYear(agriculturalYearFor(new Date(Date.UTC(monthYear, month - 1, 15))));
      }
      setZoom(z);
    },
    [landDaysOnCurrentPeriod, month, monthYear, zoom]
  );

  const openMonthWeatherPeek = useCallback(
    (year: number, month: number) => {
      setPeek({ mode: 'monthWeather', year, month, reviews: [], loading: true });
      const svc = getChronologioService();
      const { from, to } = monthBounds(year, month);
      const filters = {
        from,
        to,
        category: 'weather' as const,
        limit: 50,
        fieldId: !fieldMode ? filterFieldId || undefined : undefined,
      };
      const req = scopedFieldId
        ? svc.getFieldChronologio(scopedFieldId, filters)
        : svc.getMyChronologio(filters);
      void req
        .then((rows) => {
          const monthReviews = (Array.isArray(rows) ? rows : [])
            .filter((e) => e.eventType === 'weather.monthReview')
            .filter((e) => {
              const y = e.details.weather?.year;
              const m = e.details.weather?.month;
              if (y != null && m != null) return y === year && m === month;
              const d = new Date(e.occurredAt);
              return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
            })
            .sort((a, b) => (a.field?.name || '').localeCompare(b.field?.name || ''));
          setPeek((prev) =>
            prev?.mode === 'monthWeather' && prev.year === year && prev.month === month
              ? { mode: 'monthWeather', year, month, reviews: monthReviews, loading: false }
              : prev
          );
        })
        .catch(() => {
          setPeek((prev) =>
            prev?.mode === 'monthWeather' && prev.year === year && prev.month === month
              ? { mode: 'monthWeather', year, month, reviews: [], loading: false }
              : prev
          );
        });
    },
    [fieldMode, filterFieldId, scopedFieldId]
  );

  const activePeriod = years.find((y) => y.periodYear === periodYear);

  const openYearPeek = (summary: ChronologioPeriodSummary) => {
    const previous = previousYearSummary(years, summary.periodYear) || null;
    setPeek({ mode: 'year', summary, months: [], previous, previousMonths: [] });
    setPeekMonthsCache([]);
    const svc = getChronologioService();
    const loadYear = (periodYear: number) => {
      const filters = {
        ...summaryFilterParams,
        year: axis === 'season' ? undefined : periodYear,
        season: axis === 'season' ? periodYear : undefined,
      };
      return scopedFieldId
        ? svc.getFieldMonthSummaries(scopedFieldId, filters)
        : svc.getMyMonthSummaries(filters);
    };
    void Promise.all([loadYear(summary.periodYear), loadYear(summary.periodYear - 1)])
      .then(([rows, previousRows]) => {
        const safe = Array.isArray(rows) ? rows : [];
        const prev = Array.isArray(previousRows) ? previousRows : [];
        setPeekMonthsCache(safe);
        setPeek((prevPeek) =>
          prevPeek?.mode === 'year' && prevPeek.summary.periodYear === summary.periodYear
            ? { mode: 'year', summary, months: safe, previous, previousMonths: prev }
            : prevPeek
        );
      })
      .catch(() => {
        setPeekMonthsCache([]);
      });
  };

  const openMonthPeek = (summary: ChronologioMonthSummary, focus?: MonthChapterFocus) => {
    setPeek({ mode: 'month', summary, recent: [], loadingRecent: true, focus });
    const { from, to } = monthBounds(summary.year, summary.month);
    const svc = getChronologioService();
    const focusCategory = monthFocusApiCategory(focus);
    const filters = {
      from,
      to,
      limit: focus ? 40 : 8,
      ...(focusCategory ? { category: focusCategory } : {}),
      ...(!focusCategory ? journalFilterParams : { fieldId: journalFilterParams.fieldId }),
    };
    const req = scopedFieldId
      ? svc.getFieldChronologio(scopedFieldId, filters)
      : svc.getMyChronologio(filters);
    void req
      .then((rows) => {
        const recent = (Array.isArray(rows) ? rows : [])
          .filter((e) => !isYearWeatherReview(e))
          .filter((e) => entryMatchesMonthFocus(e, focus))
          .slice(0, focus ? 12 : 5);
        setPeek((prev) =>
          prev?.mode === 'month' &&
          prev.summary.year === summary.year &&
          prev.summary.month === summary.month &&
          prev.focus === focus
            ? { mode: 'month', summary, recent, loadingRecent: false, focus }
            : prev
        );
      })
      .catch(() => {
        setPeek((prev) =>
          prev?.mode === 'month' &&
          prev.summary.year === summary.year &&
          prev.summary.month === summary.month &&
          prev.focus === focus
            ? { mode: 'month', summary, recent: [], loadingRecent: false, focus }
            : prev
        );
      });
  };

  const selectedTypes = selectedChronologioTypes(filterCategory);

  const typeFilterLabel = (id: string) => {
    if (id === 'all' || id === 'work' || id === 'observation' || id === 'money' || id === 'harvest') {
      return t(`chronologio:primaryCategories.${id}`, {
        defaultValue: t(`chronologio:categories.${id}`),
      });
    }
    if (id === 'field_change') {
      return t('chronologio:primaryCategories.field_change', {
        defaultValue: t('chronologio:categories.lifecycle'),
      });
    }
    return t(`chronologio:categories.${id}`);
  };

  const toggleType = (id: ChronologioTypeId | 'all') => {
    if (id === 'all') {
      setFilterCategory('all');
      return;
    }
    const current = selectedTypes.includes(id)
      ? selectedTypes.filter((item) => item !== id)
      : [...selectedTypes, id];
    setFilterCategory(chronologioTypesParam(current));
  };

  const jumpToDate = (iso: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!match) return;
    const y = Number(match[1]);
    const m = Number(match[2]);
    setFocusDate(iso);
    setMonthYear(y);
    setMonth(m);
    setPeriodYear(agriculturalYearFor(new Date(Date.UTC(y, m - 1, Number(match[3])))));
    setZoomAndPage('month');
  };

  const openJournalCapture = () => {
    if (!capture) return;
    const captureDate = resolveChronologioCaptureDate({
      zoom,
      focusDate,
      language: i18n.language,
    });
    capture.openCapture({
      fieldId: scopedFieldId || fieldId,
      preferredType: preferredCaptureTypeFromCategory(filterCategory),
      sourcePage: fieldMode ? 'grove' : 'chronologio',
      occurredAt: captureDate.occurredAt,
      dateNeedsChoice: captureDate.dateNeedsChoice,
      dateDefaultedToToday: captureDate.dateDefaultedToToday,
      periodLabel: captureDate.periodLabel,
    });
  };

  const emptyCapture = capture
    ? {
        label: t('chronologio:captureNew', { defaultValue: t('capture:cta') }),
        onPress: openJournalCapture,
      }
    : {
        label: t('chronologio:ctaViewFields'),
        onPress: () => navigation.navigate('Main', { screen: 'Fields' }),
      };

  const harvestTab = filterCategory === 'harvest';
  // Still load today weather for the strip; do not pin an attention card above the timeline.
  const todayBriefLive = zoom === 'month' && journalLive && !harvestTab;
  const showTodaySummary = false;
  const today = useTodaySummary({
    enabled: todayBriefLive && booted,
    fieldId: scopedFieldId,
    fields,
  });

  const seasonStartYear = useMemo(() => getSeasonStartYear(), []);
  const [recordDayEntries, setRecordDayEntries] = useState<ChronologioEntry[]>([]);
  const harvestPatchRef = useRef(harvestCampaign?.patch);
  harvestPatchRef.current = harvestCampaign?.patch;

  // Same as web: hydrate DB harvest-records into day cards (all seasons) + live campaign merge.
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
        /* keep local / empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fields, scopedFieldId, seasonStartYear]);

  const wantsHarvestOnTimeline = useMemo(() => {
    const selected = selectedChronologioTypes(filterCategory);
    return selected.length === 0 || selected.includes('harvest');
  }, [filterCategory]);

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
    return mergeHarvestDayCards(recordDayEntries, campaignDayEntries);
  }, [campaignDayEntries, recordDayEntries, wantsHarvestOnTimeline]);

  const timelineEntries = useMemo(() => {
    const rows = entries.filter((entry) => entryMatchesChronologioTypes(entry, filterCategory));
    if (harvestDayCards.length === 0) return rows;
    return mergeHarvestDayTimeline(rows, harvestDayCards);
  }, [entries, filterCategory, harvestDayCards]);

  const todayIso = athensCalendarDateKey(new Date());

  useEffect(() => {
    const weatherField = scopedFieldId || fields[0]?.id;
    if (!weatherField || zoom !== 'month') return;
    const dates = timelineEntries
      .map((e) => dayWeatherDateKey(e.occurredAt))
      .filter(Boolean)
      .sort();
    if (dates.length === 0) return;
    const from = dates[0];
    let cancelled = false;
    void geospatialService
      .getWeatherHistory(weatherField, from, todayIso)
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
  }, [fields, scopedFieldId, timelineEntries, todayIso, zoom]);

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

  const weatherPeekFields = useMemo(() => {
    const groves = fields.filter((f) => {
      if (f.status === 'Draft' || f.status === 'Archived') return false;
      return true;
    });
    return scopedFieldId ? groves.filter((f) => f.id === scopedFieldId) : groves;
  }, [fields, scopedFieldId]);

  const filtersCount =
    selectedTypes.length + (!fieldMode && filterFieldId ? 1 : 0);

  const zoomIndex = ZOOM_DISPLAY_ORDER.indexOf(zoom);

  const setZoomFromPager = useCallback(
    (index: number) => {
      const z = ZOOM_DISPLAY_ORDER[index];
      if (!z || z === zoom) return;
      setZoomAndPage(z);
    },
    [setZoomAndPage, zoom]
  );

  const body = (
    <View style={styles.shell}>
      <View style={styles.tabsRow}>
        <View style={styles.tabsGrow}>
          <ChronologioZoomTabs
            value={zoom}
            accessibilityLabel={t('chronologio:living.zoomLabel', { defaultValue: 'View' })}
            options={ZOOM_DISPLAY_ORDER.map((z) => ({
              value: z,
              label: t(`chronologio:living.zoom.${z}`),
            }))}
            onChange={(z) => setZoomAndPage(z)}
          />
        </View>
        <HeaderIconButton
          icon="options-outline"
          accessibilityLabel={t('chronologio:filters')}
          onPress={() => setFiltersOpen(true)}
          active={filtersDirty}
          badge={filtersCount > 0 ? filtersCount : undefined}
        />
      </View>

      {observationFieldId ? (
        <View style={{ paddingHorizontal: spacing.base }}>
          <FirstObservationGuide fieldId={observationFieldId} />
        </View>
      ) : null}

      {scopedFieldId && workSetup ? (
        <View style={{ paddingHorizontal: spacing.base }}>
          <WorkSetupBanner
            fieldId={scopedFieldId}
            resume={workSetup.resume}
            onDismiss={() => {
              void dismissWorkSetupBanner(scopedFieldId);
              setWorkSetup(null);
            }}
          />
        </View>
      ) : null}

      {filtersDirty ? (
        <View style={styles.activeFilters} accessibilityLabel={t('chronologio:activeFilters')}>
          {filterCategory !== 'all' ? (
            selectedTypes.map((id) => (
              <DismissibleChip
                key={id}
                label={typeFilterLabel(id)}
                onDismiss={() => toggleType(id)}
              />
            ))
          ) : null}
          {!fieldMode && filterFieldId ? (
            <DismissibleChip
              label={
                fields.find((f) => f.id === filterFieldId)?.name || t('chronologio:living.field')
              }
              dotColor={resolveFieldColor(
                fields.find((f) => f.id === filterFieldId)?.color,
                filterFieldId
              )}
              onDismiss={() => setFilterFieldId('')}
            />
          ) : null}
          <Pressable
            onPress={() => {
              setFilterCategory('all');
              setLifecycleYear('');
              setFilterFieldId('');
            }}
            hitSlop={8}
            style={styles.clearLink}
            accessibilityRole="button"
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
              {t('chronologio:clearAllFilters', { defaultValue: t('chronologio:clearFilters') })}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {showStarter && starterGrove ? (
        <View
          style={[
            styles.firstGrove,
            { backgroundColor: colors.surface, borderColor: colors.borderLight },
          ]}
        >
          <Text style={[styles.firstGroveTitle, { color: colors.textPrimary }]}>
            {t('chronologio:firstGrove.title', { name: starterGrove.name })}
          </Text>
          <Text style={[styles.firstGroveBody, { color: colors.textSecondary }]}>
            {starterNeedsBoundary
              ? t('chronologio:firstGrove.needsBoundary')
              : t('chronologio:firstGrove.body')}
          </Text>
          {starterNeedsBoundary ? (
            <>
              <Button
                title={t('chronologio:firstGrove.continuePlace')}
                onPress={() => navigation.navigate('FieldMapBoundary', { fieldId: starterGrove.id })}
                fullWidth
              />
              <Button
                title={t('chronologio:firstGrove.viewGrove')}
                variant="outline"
                onPress={() => navigation.navigate('FieldDetail', { fieldId: starterGrove.id })}
                fullWidth
              />
            </>
          ) : (
            <Button
              title={t('chronologio:firstGrove.primary')}
              onPress={() => capture?.openCapture({ fieldId: starterGrove.id })}
              fullWidth
            />
          )}
        </View>
      ) : null}

      {!booted && loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <ChronologioZoomPager
          index={Math.max(0, zoomIndex)}
          onIndexChange={setZoomFromPager}
          pages={[
            <View key="days" style={styles.pager}>
              <ChronologioDaysTimeline
                entries={timelineEntries}
                showField={!fieldMode}
                numberLocale={numberLocale}
                tapMin={tapMin}
                loadingMore={loadingMore}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onPressEntry={(entry) => setPeek({ mode: 'event', entry })}
                focusDate={focusDate}
                weatherByDate={weatherByDate}
                todayWeather={todayWeather}
                onOpenDayWeather={(year, monthNum, dateKey) => {
                  const related = fieldsSharingWeatherGrid(
                    scopedFieldId || fields[0]?.id || '',
                    fields.map((f) => ({ id: f.id, latitude: f.latitude, longitude: f.longitude }))
                  );
                  setPeek({
                    mode: 'dayWeather',
                    year,
                    month: monthNum,
                    dateKey,
                    weather: dateKey === todayIso && todayWeather ? todayWeather : weatherByDate[dateKey] || null,
                    events: timelineEntries.filter((e) => dayWeatherDateKey(e.occurredAt) === dateKey),
                    relatedFieldNames: fields.filter((f) => related.includes(f.id)).map((f) => f.name),
                    sharedWeatherGrid: related.length > 1,
                  });
                }}
                listHeader={
                  showTodaySummary ? (
                    <TodaySummary
                      today={today}
                      fieldId={scopedFieldId || fieldId}
                      weatherScopeNote={weatherScopeNote}
                      onOpenWeather={() => setTodayWeatherPeek(true)}
                    />
                  ) : null
                }
                empty={
                  showTodaySummary ? (
                    <View />
                  ) : (
                  <EmptyState
                    title={t('chronologio:living.emptyMonthTitle')}
                    description={t('chronologio:living.emptyMonthDescription')}
                    action={emptyCapture}
                  />
                  )
                }
              />
            </View>,
            <View key="months" style={styles.pager}>
              <ScrollView
                contentContainerStyle={{ paddingBottom: spacing.lg }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                directionalLockEnabled
              >
                {activePeriod ? (
                  <View style={styles.yearHero}>
                    <Text style={[styles.yearHeroKicker, { color: colors.primary }]}>
                      {periodYear === nowYear
                        ? t('chronologio:yearView.liveYear')
                        : t('chronologio:yearView.closedYear')}
                    </Text>
                    <Text style={[styles.yearHeroTitle, { color: colors.textPrimary }]}>
                      {periodYear}
                    </Text>
                    <Text
                      style={[styles.yearSummaryLine, { color: colors.textSecondary, marginBottom: 0 }]}
                      numberOfLines={2}
                    >
                      {yearFixedMetrics(activePeriod, numberLocale, tt)
                        .filter((m) => m.value !== '—')
                        .slice(0, 3)
                        .map((m) => `${m.value} ${m.label}`)
                        .join(' · ') || t('chronologio:living.emptyYear', { year: periodYear })}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.yearSummaryLine, { color: colors.textSecondary }]}>
                    {t('chronologio:living.emptyYear', { year: periodYear })}
                  </Text>
                )}
                {(() => {
                  const monthRows = (Array.isArray(months) ? months : [])
                    .filter((m) => m.year < nowYear || (m.year === nowYear && m.month <= nowMonth))
                    .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month));
                  if (monthRows.length === 0) {
                    return (
                      <EmptyState
                        title={t('chronologio:living.emptyYear', { year: periodYear })}
                        description={t('chronologio:living.emptyPeriod')}
                        action={emptyCapture}
                      />
                    );
                  }
                  const nodes: React.ReactNode[] = [];
                  let lastStage = '';
                  monthRows.forEach((m) => {
                    const stage = monthSeasonStage(m.month);
                    if (stage !== lastStage) {
                      const first = lastStage === '';
                      lastStage = stage;
                      nodes.push(
                        <View
                          key={`season-${stage}-${m.year}-${m.month}`}
                          style={[styles.seasonMark, first && styles.seasonMarkFirst]}
                        >
                          <Text style={[styles.seasonMarkLabel, { color: colors.primary }]}>
                            {t(`chronologio:yearView.stages.${stage}`)}
                          </Text>
                          <View
                            style={[
                              styles.seasonMarkRule,
                              { backgroundColor: colors.primary },
                            ]}
                          />
                        </View>
                      );
                    }
                    const hasWx = buildMonthWeatherView(m).hasAny;
                    nodes.push(
                      <ChronologioMonthChapterCard
                        key={m.key || `${m.year}-${m.month}`}
                        summary={m}
                        numberLocale={numberLocale}
                        isCurrent={m.month === nowMonth && m.year === nowYear}
                        onPress={() => openMonthPeek(m)}
                        onPressFocus={(focus) => openMonthPeek(m, focus)}
                        onOpenDays={() => {
                          setMonthYear(m.year);
                          setMonth(m.month);
                          setPeriodYear(m.year);
                          setZoom('month');
                        }}
                        onPressWeather={
                          hasWx ? () => openMonthWeatherPeek(m.year, m.month) : undefined
                        }
                      />
                    );
                  });
                  return nodes;
                })()}
              </ScrollView>
            </View>,
            <View key="years" style={styles.pager}>
              {!Array.isArray(years) || years.length === 0 ? (
                <EmptyState
                  title={
                    fieldMode ? t('chronologio:emptyFieldTitle') : t('chronologio:emptyGlobalTitle')
                  }
                  description={
                    fieldMode
                      ? t('chronologio:emptyFieldDescription')
                      : t('chronologio:emptyGlobalDescription')
                  }
                  action={emptyCapture}
                />
              ) : (
                <FlatList
                  data={years}
                  keyExtractor={(item) => item.key}
                  contentContainerStyle={{ paddingBottom: spacing.lg }}
                  nestedScrollEnabled
                  directionalLockEnabled
                  renderItem={({ item, index }) => (
                    <ChronologioYearChapterCard
                      summary={item}
                      previous={years[index + 1] || previousYearSummary(years, item.periodYear)}
                      numberLocale={numberLocale}
                      isActive={item.periodYear === periodYear}
                      onPress={() => {
                        setPeriodYear(item.periodYear);
                        openYearPeek(item);
                      }}
                    />
                  )}
                  ListFooterComponent={
                    <Text style={{ color: colors.textSecondary, marginTop: 16, lineHeight: 20 }}>
                      {t('chronologio:living.historyStartsHere')}
                    </Text>
                  }
                />
              )}
            </View>,
          ]}
        />
      )}

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        edge="end"
        title={t('chronologio:filters')}
        accent
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[
                styles.filterAction,
                {
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                  backgroundColor: colors.surface,
                  minHeight: Math.max(tapMin, 44),
                },
              ]}
              onPress={() => {
                setFilterCategory('all');
                setLifecycleYear('');
                setFilterFieldId('');
              }}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {t('chronologio:clearAllFilters', { defaultValue: t('chronologio:clearFilters') })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterAction,
                {
                  backgroundColor: colors.primary,
                  minHeight: Math.max(tapMin, 44),
                  flex: 1,
                },
              ]}
              onPress={() => setFiltersOpen(false)}
            >
              <Text style={{ color: colors.onOlive, fontWeight: '700' }}>
                {t('chronologio:applyFilters')}
              </Text>
            </TouchableOpacity>
          </View>
        }
      >
        {!fieldMode && fields.length > 0 ? (
          <FilterChips
            wrap
            compact
            selected={filterFieldId || ''}
            onSelect={setFilterFieldId}
            style={{ marginBottom: 16 }}
            options={[
              { value: '', label: t('chronologio:allFields') },
              ...fields.map((f) => ({
                value: f.id,
                label: f.name,
                dotColor: resolveFieldColor(f.color, f.id),
              })),
            ]}
          />
        ) : null}

        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
          {t('chronologio:filtersTitle')}
        </Text>
        <Text style={[styles.filterHint, { color: colors.textTertiary }]}>
          {t('chronologio:living.typesHint', {
            defaultValue: 'Pick what appears in History.',
          })}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          {FILTER_TYPE_IDS.map((id) => {
            const selected = id === 'all' ? selectedTypes.length === 0 : selectedTypes.includes(id as ChronologioTypeId);
            return (
              <TouchableOpacity
                key={id}
                onPress={() => toggleType(id)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: selected ? colors.oliveBorder : colors.borderLight,
                    backgroundColor: selected ? colors.primaryLight : colors.surfaceElevated,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? colors.primary : colors.textPrimary,
                    fontWeight: selected ? '700' : '600',
                    fontSize: 13,
                  }}
                >
                  {typeFilterLabel(id)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 8 }}>
          {selectedTypes.length === 0
            ? t('chronologio:living.allTypesOn')
            : t('chronologio:living.typesOn', {
                count: selectedTypes.length,
                total: CHRONOLOGIO_TYPE_IDS.length,
              })}
        </Text>
      </Sheet>

      <ChronologioPeekSheet
        peek={
          peek?.mode === 'year'
            ? { ...peek, months: peek.months?.length ? peek.months : peekMonthsCache }
            : peek
        }
        numberLocale={numberLocale}
        fieldOptions={fields.map((f) => ({ id: f.id, name: f.name, color: f.color }))}
        onClose={() => setPeek(null)}
        onMutated={() => setReloadToken((n) => n + 1)}
        onDrillToMonths={(year) => {
          setPeek(null);
          setPeriodYear(year);
          setAxis('agricultural');
          setZoom('year');
        }}
        onDrillToDays={(y, m) => {
          setMonthYear(y);
          setMonth(m);
          setPeriodYear(agriculturalYearFor(new Date(Date.UTC(y, m - 1, 15))));
          setPeek(null);
          setZoom('month');
        }}
        onSelectRecent={(entry) => setPeek({ mode: 'event', entry })}
        onOpenMonthWeather={(year, month) => {
          openMonthWeatherPeek(year, month);
        }}
      />
      <WeatherPeekSheet
        open={todayWeatherPeek}
        onClose={() => setTodayWeatherPeek(false)}
        fields={weatherPeekFields}
        primaryFieldId={today.weatherFieldId}
        seedSnapshot={today.weather}
      />
    </View>
  );

  if (embedded) {
    return <View style={{ flex: 1 }}>{body}</View>;
  }

  return <ScreenLayout padded tabBarInset={!embedded}>{body}</ScreenLayout>;
};

const styles = StyleSheet.create({
  shell: { flex: 1 },
  firstGrove: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  firstGroveTitle: {
    fontFamily: appFonts.bold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  firstGroveBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  tabsGrow: {
    flex: 1,
    minWidth: 0,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  clearLink: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  yearSummaryLine: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  yearHero: {
    marginBottom: 16,
    gap: 4,
    paddingLeft: 2,
  },
  yearHeroKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  yearHeroTitle: {
    fontFamily: appFonts.bold,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  seasonMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 10,
    paddingLeft: 2,
  },
  seasonMarkFirst: {
    marginTop: 18,
  },
  seasonMarkLabel: {
    fontFamily: appFonts.semibold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  seasonMarkRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.35,
  },
  pager: { flex: 1 },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  filterHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  filterSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterAction: {
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChronologioScreen;
