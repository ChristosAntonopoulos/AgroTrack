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
import ChronologioComparePanel from '../components/chronologio/ChronologioComparePanel';
import ChronologioDaysTimeline from '../components/chronologio/ChronologioDaysTimeline';
import ChronologioJournalHeader from '../components/chronologio/ChronologioJournalHeader';
import ChronologioZoomTabs from '../components/chronologio/ChronologioZoomTabs';
import ChronologioDateRail from '../components/chronologio/ChronologioDateRail';
import ChronologioMonthChapterCard from '../components/chronologio/ChronologioMonthChapterCard';
import ChronologioYearChapterCard from '../components/chronologio/ChronologioYearChapterCard';
import ChronologioZoomPager from '../components/chronologio/ChronologioZoomPager';
import TodaySummary from '../components/chronologio/TodaySummary';
import WeatherPeekSheet from '../components/weather/WeatherPeekSheet';
import FilterChips from '../components/ui/FilterChips';
import FormDateField from '../components/forms/FormDateField';
import DismissibleChip from '../components/ui/DismissibleChip';
import Sheet from '../components/ui/Sheet';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { useHarvestCampaignOptional } from '../context/HarvestCampaignContext';
import { usePreferences } from '../context/PreferencesContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { spacing, radii } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { getChronologioService, getFieldService } from '../services/serviceFactory';
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
  const [axis, setAxis] = useState<ChronologioAxis>('calendar');
  const [filterCategory, setFilterCategory] = useState('all');
  const [lifecycleYear, setLifecycleYear] = useState<'' | 'low' | 'high'>('');
  const [filterFieldId, setFilterFieldId] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [periodYear, setPeriodYear] = useState(nowYear);
  const [monthYear, setMonthYear] = useState(nowYear);
  const [month, setMonth] = useState(nowMonth);
  const [years, setYears] = useState<ChronologioPeriodSummary[]>([]);
  const [months, setMonths] = useState<ChronologioMonthSummary[]>([]);
  const [entries, setEntries] = useState<ChronologioEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [peek, setPeek] = useState<ChronologioPeekTarget | null>(null);
  const [peekMonthsCache, setPeekMonthsCache] = useState<ChronologioMonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [booted, setBooted] = useState(false);
  const bootedRef = useRef(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareYears, setCompareYears] = useState<[number, number]>([nowYear - 1, nowYear]);
  const [compareLeftMonths, setCompareLeftMonths] = useState<ChronologioMonthSummary[]>([]);
  const [compareRightMonths, setCompareRightMonths] = useState<ChronologioMonthSummary[]>([]);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number } | null>(null);
  const [weatherByDate, setWeatherByDate] = useState<Record<string, DayWeatherInput>>({});
  const [todayWeatherPeek, setTodayWeatherPeek] = useState(false);
  const [focusDate, setFocusDate] = useState(() => athensCalendarDateKey(new Date()));

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
      .getFields(user.id, user.role || 'FieldOwner')
      .then(setFields)
      .catch(() => setFields([]));
  }, [user?.id, user?.role]);

  const scopedFieldId = fieldMode ? fieldId : filterFieldId || undefined;
  const filtersDirty =
    filterCategory !== 'all' || Boolean(lifecycleYear) || (!fieldMode && Boolean(filterFieldId));

  const journalFilterParams = useMemo(
    () => ({
      category: apiCategoryParam(filterCategory),
      lifecycleYear: lifecycleYear || undefined,
      fieldId: !fieldMode ? filterFieldId || undefined : undefined,
    }),
    [fieldMode, filterCategory, filterFieldId, lifecycleYear]
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
    void load();
  }, [load, reloadToken]);

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

  useEffect(() => {
    if (zoom !== 'years') setCompareOpen(false);
  }, [zoom]);

  useEffect(() => {
    if (!compareOpen || zoom !== 'years') return;
    let cancelled = false;
    const svc = getChronologioService();
    const loadSide = async (year: number) => {
      const filters = {
        ...summaryFilterParams,
        year: axis === 'season' ? undefined : year,
        season: axis === 'season' ? year : undefined,
      };
      return scopedFieldId
        ? svc.getFieldMonthSummaries(scopedFieldId, filters)
        : svc.getMyMonthSummaries(filters);
    };
    void Promise.all([loadSide(compareYears[0]), loadSide(compareYears[1])])
      .then(([left, right]) => {
        if (cancelled) return;
        setCompareLeftMonths(left);
        setCompareRightMonths(right);
      })
      .catch(() => {
        if (cancelled) return;
        setCompareLeftMonths([]);
        setCompareRightMonths([]);
      });
    return () => {
      cancelled = true;
    };
  }, [axis, compareOpen, compareYears, scopedFieldId, summaryFilterParams, zoom]);

  const journalLive = monthYear === nowYear && month === nowMonth;

  const landDaysOnCurrentPeriod = useCallback(() => {
    const landing = daysLandingMonth(periodYear, { year: monthYear, month }, now);
    if (!landing) return;
    setMonthYear(landing.year);
    setMonth(landing.month);
    setVisibleMonth(null);
  }, [month, monthYear, now, periodYear]);

  const setZoomAndPage = useCallback(
    (z: Zoom) => {
      if (z === 'month' && zoom !== 'month') landDaysOnCurrentPeriod();
      if (z === 'month') {
        setAxis('calendar');
      } else {
        setAxis('agricultural');
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
      ...(!focusCategory ? journalFilterParams : { lifecycleYear: journalFilterParams.lifecycleYear, fieldId: journalFilterParams.fieldId }),
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

  const returnToToday = () => {
    setMonthYear(nowYear);
    setMonth(nowMonth);
    setPeriodYear(nowYear);
    setVisibleMonth(null);
    setHeaderCompact(false);
    setPeek(null);
    setCompareOpen(false);
    setFocusDate(athensCalendarDateKey(new Date()));
    setZoomAndPage('month');
  };

  const availableCompareYears = useMemo(() => {
    const fromData = years.map((y) => y.periodYear);
    const set = new Set(fromData.length ? fromData : [nowYear, nowYear - 1]);
    return Array.from(set).sort((a, b) => b - a);
  }, [nowYear, years]);

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
    setVisibleMonth({ year: y, month: m });
    setAxis('calendar');
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
  const showTodaySummary = zoom === 'month' && journalLive && !compareOpen && !harvestTab;
  const today = useTodaySummary({
    enabled: showTodaySummary && booted,
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
    selectedTypes.length +
    (lifecycleYear ? 1 : 0) +
    (!fieldMode && filterFieldId ? 1 : 0);

  const contextLabel = fieldMode
    ? fieldName || t('chronologio:taglineField')
    : filterFieldId
      ? fields.find((f) => f.id === filterFieldId)?.name || t('chronologio:living.allFields')
      : t('chronologio:living.allFields', { defaultValue: 'All fields' });


  const periodLabel = useMemo(() => {
    if (zoom === 'years') {
      return t('chronologio:living.zoom.years');
    }
    if (zoom === 'year') {
      return String(periodYear);
    }
    const focusYear = visibleMonth?.year ?? monthYear;
    const focusMonth = visibleMonth?.month ?? month;
    const onLiveMonth =
      journalLive && focusYear === nowYear && focusMonth === nowMonth;
    if (onLiveMonth) return t('chronologio:today');
    return new Date(Date.UTC(focusYear, focusMonth - 1, 1)).toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }, [
    i18n.language,
    journalLive,
    month,
    monthYear,
    nowMonth,
    nowYear,
    periodYear,
    t,
    visibleMonth,
    zoom,
  ]);

  const scrolledAwayFromToday =
    zoom === 'month' &&
    journalLive &&
    visibleMonth != null &&
    (visibleMonth.year !== nowYear || visibleMonth.month !== nowMonth);

  const showReturnToday =
    scrolledAwayFromToday ||
    (zoom === 'month' && (monthYear !== nowYear || month !== nowMonth)) ||
    (zoom === 'year' && periodYear !== nowYear);

  const jumpToYear = (year: number) => {
    setPeriodYear(year);
    setVisibleMonth(null);
    if (zoom === 'month') {
      const landing = daysLandingMonth(year, { year: monthYear, month }, now);
      if (landing) {
        setMonthYear(landing.year);
        setMonth(landing.month);
      } else {
        setMonthYear(year);
      }
    }
  };

  const railActiveYear = zoom === 'month' ? visibleMonth?.year ?? monthYear : periodYear;

  const shiftPeriod = (dir: -1 | 1) => {
    if (zoom === 'years') {
      setPeriodYear((y) => y + dir);
      setZoomAndPage('year');
      return;
    }
    if (zoom === 'year') {
      setPeriodYear((y) => {
        const next = y + dir;
        if (dir > 0 && next > nowYear) return y;
        return next;
      });
      return;
    }
    const d = new Date(Date.UTC(monthYear, month - 1 + dir, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    if (y > nowYear || (y === nowYear && m > nowMonth)) return;
    setMonthYear(y);
    setMonth(m);
    setPeriodYear(y);
    setVisibleMonth(null);
  };

  const canPrevPeriod = true;
  const canNextPeriod =
    zoom === 'month'
      ? !(monthYear === nowYear && month === nowMonth)
      : periodYear < nowYear;

  const zoomIndex = ZOOM_DISPLAY_ORDER.indexOf(zoom);

  const setZoomFromPager = useCallback(
    (index: number) => {
      const z = ZOOM_DISPLAY_ORDER[index];
      if (!z || z === zoom) return;
      setZoomAndPage(z);
    },
    [setZoomAndPage, zoom]
  );

  const handleVisibleMonth = useCallback((year: number, monthNum: number) => {
    setVisibleMonth((prev) =>
      prev?.year === year && prev?.month === monthNum ? prev : { year, month: monthNum }
    );
  }, []);

  const handleScrollY = useCallback((y: number) => {
    setHeaderCompact(y > 48);
  }, []);

  const body = (
    <View style={styles.shell}>
      {embedded ? null : (
        <ChronologioJournalHeader
          periodLabel={periodLabel}
          contextLabel={contextLabel}
          onPressContext={() => setFiltersOpen(true)}
          onPressFilters={() => setFiltersOpen(true)}
          filtersActive={filtersDirty}
          filtersCount={filtersCount}
          compact={headerCompact}
          showPeriodNav={zoom !== 'years'}
          onPrevPeriod={() => shiftPeriod(-1)}
          onNextPeriod={() => shiftPeriod(1)}
          canPrevPeriod={canPrevPeriod}
          canNextPeriod={canNextPeriod}
          onPressPeriod={() => {
            if (zoom === 'month') setZoomAndPage('year');
            else if (zoom === 'year') setZoomAndPage('years');
          }}
          showToday={showReturnToday}
          onPressToday={returnToToday}
          todayLabel={t('chronologio:today')}
          filtersLabel={t('chronologio:filters')}
          onPressCapture={capture ? openJournalCapture : undefined}
          captureLabel={t('chronologio:captureNew', { defaultValue: t('capture:cta') })}
        />
      )}

      <ChronologioZoomTabs
        value={zoom}
        accessibilityLabel={t('chronologio:living.zoomLabel', { defaultValue: 'View' })}
        options={ZOOM_DISPLAY_ORDER.map((z) => ({
          value: z,
          label: t(`chronologio:living.zoom.${z}`),
        }))}
        onChange={(z) => setZoomAndPage(z)}
      />

      {zoom !== 'years' ? (
        <ChronologioDateRail
          summaries={years}
          activePeriodYear={railActiveYear}
          onJumpToYear={jumpToYear}
        />
      ) : null}

      <View style={styles.toolsRow}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <FormDateField
            label={t('chronologio:living.jumpToDate')}
            value={focusDate}
            onValueChange={jumpToDate}
          />
        </View>
        <TouchableOpacity
          style={styles.toolLink}
          onPress={() => setAxis(axis === 'calendar' ? 'agricultural' : 'calendar')}
          hitSlop={8}
        >
          <Text style={{ color: colors.textTertiary, fontWeight: '500', fontSize: 12 }}>
            {axis === 'calendar'
              ? t('chronologio:living.axisCalendar')
              : t('chronologio:living.axisAgricultural', {
                  defaultValue: t('chronologio:living.agriculturalYear', {
                    defaultValue: t('chronologio:living.axisSeason'),
                  }),
                })}
          </Text>
          <Ionicons name="chevron-down" size={11} color={colors.textTertiary} />
        </TouchableOpacity>
        {zoom === 'years' && years.length >= 2 ? (
          <TouchableOpacity
            style={styles.toolLink}
            onPress={() => {
              if (!compareOpen) {
                const yrs = availableCompareYears;
                setCompareYears([yrs[1] ?? yrs[0] - 1, yrs[0]]);
              }
              setCompareOpen((v) => !v);
            }}
            hitSlop={8}
          >
            <Text
              style={{
                color: compareOpen ? colors.primary : colors.textTertiary,
                fontWeight: compareOpen ? '700' : '500',
                fontSize: 12,
              }}
            >
              {t('chronologio:living.compare')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

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
          {lifecycleYear ? (
            <DismissibleChip
              label={
                lifecycleYear === 'low' ? t('chronologio:seasonLow') : t('chronologio:seasonHigh')
              }
              onDismiss={() => setLifecycleYear('')}
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
                onScrollY={handleScrollY}
                onVisibleMonth={handleVisibleMonth}
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
                contentContainerStyle={{ paddingBottom: 48 }}
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
                  contentContainerStyle={{ paddingBottom: 48 }}
                  nestedScrollEnabled
                  directionalLockEnabled
                  ListHeaderComponent={
                    compareOpen ? (
                      <ChronologioComparePanel
                        left={years.find((y) => y.periodYear === compareYears[0]) || null}
                        right={years.find((y) => y.periodYear === compareYears[1]) || null}
                        leftMonths={compareLeftMonths}
                        rightMonths={compareRightMonths}
                        leftYear={compareYears[0]}
                        rightYear={compareYears[1]}
                        availableYears={availableCompareYears}
                        numberLocale={numberLocale}
                        fieldNames={(scopedFieldId
                          ? fields.filter((f) => f.id === scopedFieldId)
                          : fields
                        ).map((f) => f.name)}
                        onChangeYears={setCompareYears}
                        onOpenMonth={(y, m) => {
                          setCompareOpen(false);
                          setMonthYear(y);
                          setMonth(m);
                          setPeriodYear(agriculturalYearFor(new Date(Date.UTC(y, m - 1, 15))));
                          setAxis('calendar');
                          setZoomAndPage('month');
                        }}
                        onClose={() => setCompareOpen(false)}
                      />
                    ) : null
                  }
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
          <>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
              {t('chronologio:allFields')}
            </Text>
            <FilterChips
              compact
              selected={filterFieldId || ''}
              onSelect={setFilterFieldId}
              style={{ marginBottom: 12 }}
              options={[
                { value: '', label: t('chronologio:allFields') },
                ...fields.map((f) => ({
                  value: f.id,
                  label: f.name,
                  dotColor: resolveFieldColor(f.color, f.id),
                })),
              ]}
            />
          </>
        ) : null}

        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
          {t('chronologio:living.yearAxis')}
        </Text>
        <FilterChips
          wrap
          compact
          selected={axis}
          onSelect={(v) => setAxis(v as ChronologioAxis)}
          contentStyle={{ marginBottom: 12 }}
          options={[
            { value: 'calendar', label: t('chronologio:living.axisCalendar') },
            {
              value: 'agricultural',
              label: t('chronologio:living.axisAgricultural', {
                defaultValue: t('chronologio:living.agriculturalYear', { defaultValue: 'Agricultural year' }),
              }),
            },
            { value: 'season', label: t('chronologio:living.axisSeason') },
          ]}
        />

        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
          {t('chronologio:living.lifecycleYear')}
        </Text>
        <FilterChips
          wrap
          compact
          selected={lifecycleYear}
          onSelect={(v) => setLifecycleYear(v as '' | 'low' | 'high')}
          contentStyle={{ marginBottom: 12 }}
          options={[
            { value: '', label: t('chronologio:allSeasons') },
            { value: 'low', label: t('chronologio:seasonLow') },
            { value: 'high', label: t('chronologio:seasonHigh') },
          ]}
        />

        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
          {t('chronologio:filtersTitle')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {(
            [
              ['fieldWork', ['work', 'observation', 'photo']],
              ['harvestStory', ['harvest', 'money', 'photo']],
              ['decisions', ['observation', 'weather', 'work']],
              ['people', ['work', 'collaborator']],
            ] as const
          ).map(([key, ids]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setFilterCategory(chronologioTypesParam([...ids]))}
              style={[
                styles.filterAction,
                {
                  borderColor: colors.borderLight,
                  borderWidth: StyleSheet.hairlineWidth,
                  backgroundColor: colors.surfaceMuted,
                  minHeight: 36,
                  paddingHorizontal: 10,
                },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 12 }}>
                {t(`chronologio:living.preset.${key}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          {FILTER_TYPE_IDS.map((id) => {
            const selected = id === 'all' ? selectedTypes.length === 0 : selectedTypes.includes(id as ChronologioTypeId);
            return (
              <TouchableOpacity
                key={id}
                onPress={() => toggleType(id)}
                style={{
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: selected ? colors.oliveBorder : colors.borderLight,
                  backgroundColor: selected ? colors.primaryLight : colors.surface,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  minHeight: 36,
                  justifyContent: 'center',
                }}
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
          setAxis('calendar');
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
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: spacing.xs,
    marginTop: 2,
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  toolLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
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
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
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
    fontSize: 11,
    fontWeight: '700',
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
    marginBottom: 8,
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
