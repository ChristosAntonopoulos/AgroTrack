import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Image,
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
import SegmentedControl from '../components/ui/SegmentedControl';
import FilterChips from '../components/ui/FilterChips';
import DismissibleChip from '../components/ui/DismissibleChip';
import Sheet from '../components/ui/Sheet';
import AccentCard from '../components/ui/AccentCard';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { usePreferences } from '../context/PreferencesContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { spacing, radii } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { getChronologioService, getFieldService } from '../services/serviceFactory';
import type {
  ChronologioAxis,
  ChronologioCategory,
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../services/chronologioService';
import type { Field } from '../services/fieldService';
import { PAGE_SIZE } from '../utils/chronologioGrouping';
import { resolveFieldColor } from '../utils/fieldColors';
import {
  monthChapterFacts,
  periodEventCount,
  weatherFactBits,
  yearFixedMetrics,
} from '../utils/summaryFacts';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Zoom = 'years' | 'year' | 'month';
type FilterCategory = ChronologioCategory | 'all';

const ZOOM_DISPLAY_ORDER: Zoom[] = ['month', 'year', 'years'];
const FILTER_CATEGORIES: FilterCategory[] = [
  'all',
  'task',
  'expense',
  'harvest',
  'note',
  'weather',
  'intelligence',
  'lifecycle',
];

const monthBounds = (year: number, month: number) => {
  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();
  return { from, to };
};

const isRealMedia = (url?: string | null) => {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('unsplash') || u.includes('picsum') || u.includes('placeholder')) return false;
  return u.includes('/uploads/') || u.startsWith('file:') || u.startsWith('content:');
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
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const fieldId =
    fieldIdProp ?? (route.params as { fieldId?: string } | undefined)?.fieldId;
  const fieldMode = Boolean(fieldId);
  const numberLocale = i18n.language?.startsWith('el') ? 'el-GR' : 'en-US';
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;
  const tt = useCallback(
    (key: string, opts?: Record<string, string | number>) =>
      t(`chronologio:${key}`, opts as Record<string, unknown>),
    [t]
  );

  const [fieldName, setFieldName] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  const [zoom, setZoom] = useState<Zoom>('month');
  const [axis, setAxis] = useState<ChronologioAxis>('calendar');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [lifecycleYear, setLifecycleYear] = useState<'' | 'low' | 'high'>('');
  const [filterFieldId, setFilterFieldId] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [periodYear, setPeriodYear] = useState(new Date().getUTCFullYear());
  const [monthYear, setMonthYear] = useState(new Date().getUTCFullYear());
  const [month, setMonth] = useState(new Date().getUTCMonth() + 1);
  const [years, setYears] = useState<ChronologioPeriodSummary[]>([]);
  const [months, setMonths] = useState<ChronologioMonthSummary[]>([]);
  const [entries, setEntries] = useState<ChronologioEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [peek, setPeek] = useState<ChronologioPeekTarget | null>(null);
  const [peekMonthsCache, setPeekMonthsCache] = useState<ChronologioMonthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareYears, setCompareYears] = useState<[number, number]>([nowYear - 1, nowYear]);
  const [compareLeftMonths, setCompareLeftMonths] = useState<ChronologioMonthSummary[]>([]);
  const [compareRightMonths, setCompareRightMonths] = useState<ChronologioMonthSummary[]>([]);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number } | null>(null);

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
    if (fieldMode || !user?.id) {
      setFields([]);
      return;
    }
    void getFieldService()
      .getFields(user.id, user.role || 'FieldOwner')
      .then(setFields)
      .catch(() => setFields([]));
  }, [fieldMode, user?.id, user?.role]);

  const scopedFieldId = fieldMode ? fieldId : filterFieldId || undefined;
  const filtersDirty =
    filterCategory !== 'all' || Boolean(lifecycleYear) || (!fieldMode && Boolean(filterFieldId));

  const journalFilterParams = useMemo(
    () => ({
      category: filterCategory === 'all' ? undefined : filterCategory,
      lifecycleYear: lifecycleYear || undefined,
      fieldId: !fieldMode ? filterFieldId || undefined : undefined,
    }),
    [fieldMode, filterCategory, filterFieldId, lifecycleYear]
  );

  const summaryFilterParams = useMemo(
    () => ({
      axis,
      category: filterCategory === 'all' ? undefined : filterCategory,
      fieldId: !fieldMode ? filterFieldId || undefined : undefined,
    }),
    [axis, fieldMode, filterCategory, filterFieldId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const svc = getChronologioService();
      const yearList = scopedFieldId
        ? await svc.getFieldYearSummaries(scopedFieldId, summaryFilterParams)
        : await svc.getMyYearSummaries(summaryFilterParams);
      setYears(Array.isArray(yearList) ? yearList : []);

      if (zoom === 'year' || zoom === 'month') {
        const monthFilters = {
          ...summaryFilterParams,
          year: axis === 'calendar' ? periodYear : undefined,
          season: axis === 'season' ? periodYear : undefined,
        };
        const monthList = scopedFieldId
          ? await svc.getFieldMonthSummaries(scopedFieldId, monthFilters)
          : await svc.getMyMonthSummaries(monthFilters);
        setMonths(Array.isArray(monthList) ? monthList : []);
      } else {
        setMonths([]);
      }

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
      } else {
        setEntries([]);
        setHasMore(false);
      }
    } catch {
      setYears([]);
      setMonths([]);
      setEntries([]);
      setHasMore(false);
    } finally {
      setLoading(false);
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
        year: axis === 'calendar' ? year : undefined,
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

  const setZoomAndPage = useCallback((z: Zoom) => {
    if (z === 'month') {
      const now = new Date();
      setMonthYear(now.getUTCFullYear());
      setMonth(now.getUTCMonth() + 1);
      setVisibleMonth(null);
    }
    setZoom(z);
  }, []);

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
    setPeek({ mode: 'year', summary, months: [] });
    setPeekMonthsCache([]);
    const svc = getChronologioService();
    const filters = {
      ...summaryFilterParams,
      year: axis === 'calendar' ? summary.periodYear : undefined,
      season: axis === 'season' ? summary.periodYear : undefined,
    };
    const req = scopedFieldId
      ? svc.getFieldMonthSummaries(scopedFieldId, filters)
      : svc.getMyMonthSummaries(filters);
    void req
      .then((rows) => {
        const safe = Array.isArray(rows) ? rows : [];
        setPeekMonthsCache(safe);
        setPeek((prev) =>
          prev?.mode === 'year' && prev.summary.periodYear === summary.periodYear
            ? { mode: 'year', summary, months: safe }
            : prev
        );
      })
      .catch(() => {
        setPeekMonthsCache([]);
      });
  };

  const openMonthPeek = (summary: ChronologioMonthSummary) => {
    setPeek({ mode: 'month', summary, recent: [], loadingRecent: true });
    const { from, to } = monthBounds(summary.year, summary.month);
    const svc = getChronologioService();
    const req = scopedFieldId
      ? svc.getFieldChronologio(scopedFieldId, { from, to, limit: 8, ...journalFilterParams })
      : svc.getMyChronologio({ from, to, limit: 8, ...journalFilterParams });
    void req
      .then((rows) => {
        const recent = (Array.isArray(rows) ? rows : [])
          .filter((e) => !isYearWeatherReview(e))
          .slice(0, 5);
        setPeek((prev) =>
          prev?.mode === 'month' &&
          prev.summary.year === summary.year &&
          prev.summary.month === summary.month
            ? { mode: 'month', summary, recent, loadingRecent: false }
            : prev
        );
      })
      .catch(() => {
        setPeek((prev) =>
          prev?.mode === 'month' &&
          prev.summary.year === summary.year &&
          prev.summary.month === summary.month
            ? { mode: 'month', summary, recent: [], loadingRecent: false }
            : prev
        );
      });
  };

  const returnToToday = () => {
    const now = new Date();
    setMonthYear(now.getUTCFullYear());
    setMonth(now.getUTCMonth() + 1);
    setPeriodYear(now.getUTCFullYear());
    setVisibleMonth(null);
    setHeaderCompact(false);
    setPeek(null);
    setCompareOpen(false);
    setZoomAndPage('month');
  };

  const availableCompareYears = useMemo(() => {
    const fromData = years.map((y) => y.periodYear);
    const set = new Set(fromData.length ? fromData : [nowYear, nowYear - 1]);
    return Array.from(set).sort((a, b) => b - a);
  }, [nowYear, years]);

  const emptyCapture = capture
    ? {
        label: t('capture:cta'),
        onPress: () => capture.openCapture({ fieldId }),
      }
    : {
        label: t('chronologio:ctaViewFields'),
        onPress: () => navigation.navigate('Main', { screen: 'Fields' }),
      };

  const filtersCount =
    (filterCategory !== 'all' ? 1 : 0) +
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

  const shiftPeriod = (dir: -1 | 1) => {
    if (zoom === 'year' || zoom === 'years') {
      setPeriodYear((y) => y + dir);
      if (zoom === 'years') setZoomAndPage('year');
      return;
    }
    const d = new Date(Date.UTC(monthYear, month - 1 + dir, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    if (y > nowYear || (y === nowYear && m > nowMonth)) return;
    setMonthYear(y);
    setMonth(m);
    setPeriodYear(y);
  };

  const canNextPeriod =
    zoom === 'month'
      ? !(monthYear === nowYear && month === nowMonth)
      : periodYear < nowYear;

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
          canNextPeriod={canNextPeriod}
          onPressPeriod={() => {
            if (zoom === 'month') setZoomAndPage('year');
            else if (zoom === 'year') setZoomAndPage('years');
          }}
          showToday={showReturnToday}
          onPressToday={returnToToday}
          todayLabel={t('chronologio:today')}
          filtersLabel={t('chronologio:filters')}
        />
      )}

      <SegmentedControl
        fullWidth
        compact
        tone="olive"
        value={zoom}
        ariaLabel={t('chronologio:living.zoomLabel', { defaultValue: 'View' })}
        style={{ marginBottom: spacing.sm }}
        options={ZOOM_DISPLAY_ORDER.map((z) => ({
          value: z,
          label: t(`chronologio:living.zoom.${z}`),
        }))}
        onChange={(z) => setZoomAndPage(z)}
      />

      <View style={styles.axisRow}>
        <TouchableOpacity
          style={styles.axisLink}
          onPress={() => setAxis(axis === 'calendar' ? 'season' : 'calendar')}
          hitSlop={8}
        >
          <Text style={{ color: colors.textTertiary, fontWeight: '500', fontSize: 12 }}>
            {axis === 'calendar'
              ? t('chronologio:living.axisCalendar')
              : t('chronologio:living.axisSeason')}
          </Text>
          <Ionicons name="chevron-down" size={11} color={colors.textTertiary} />
        </TouchableOpacity>
        {zoom === 'years' && years.length >= 2 ? (
          <TouchableOpacity
            style={styles.axisLink}
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

      {filtersDirty && (filterCategory !== 'all' || Boolean(lifecycleYear)) ? (
        <View style={styles.activeFilters}>
          {filterCategory !== 'all' ? (
            <DismissibleChip
              label={t(`chronologio:categories.${filterCategory}`)}
              onDismiss={() => setFilterCategory('all')}
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
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
              {t('chronologio:clearFilters')}
            </Text>
          </Pressable>
        </View>
      ) : filtersDirty && filterFieldId ? (
        <View style={styles.activeFilters}>
          <Pressable
            onPress={() => setFilterFieldId('')}
            hitSlop={8}
            style={styles.clearLink}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
              {t('chronologio:clearFilters')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <View style={styles.pager}>
          {zoom === 'month' ? (
            <ChronologioDaysTimeline
              entries={entries}
              showField={!fieldMode}
              numberLocale={numberLocale}
              tapMin={tapMin}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onPressEntry={(entry) => setPeek({ mode: 'event', entry })}
              onScrollY={(y) => setHeaderCompact(y > 48)}
              onVisibleMonth={(year, monthNum) => {
                setVisibleMonth((prev) =>
                  prev?.year === year && prev?.month === monthNum
                    ? prev
                    : { year, month: monthNum }
                );
              }}
              empty={
                <EmptyState
                  title={t('chronologio:living.emptyMonthTitle')}
                  description={t('chronologio:living.emptyMonthDescription')}
                  action={emptyCapture}
                />
              }
            />
          ) : null}

          {zoom === 'year' ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
              {activePeriod ? (
                <Text style={[styles.yearSummaryLine, { color: colors.textSecondary }]} numberOfLines={2}>
                  {yearFixedMetrics(activePeriod, numberLocale, tt)
                    .filter((m) => m.value !== '—')
                    .slice(0, 3)
                    .map((m) => `${m.value} ${m.label}`)
                    .join(' · ') || t('chronologio:living.emptyYear', { year: periodYear })}
                </Text>
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
                return monthRows.map((m) => {
                  const count = periodEventCount(m);
                  const highlights = (m.highlightTitles || []).filter(Boolean).slice(0, 2);
                  const isNow = m.month === nowMonth && m.year === nowYear;
                  const title = new Date(Date.UTC(m.year, m.month - 1, 1)).toLocaleDateString(i18n.language, {
                    month: 'long',
                    timeZone: 'UTC',
                  });
                  const hero = isRealMedia(m.heroMediaUrl) ? m.heroMediaUrl : undefined;
                  const facts = monthChapterFacts(m, numberLocale, tt);
                  return (
                    <Pressable
                      key={m.key || `${m.year}-${m.month}`}
                      onPress={() => openMonthPeek(m)}
                      style={({ pressed }) => [
                        styles.monthRow,
                        {
                          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                          borderColor: isNow ? colors.oliveBorder : colors.borderLight,
                          opacity: count === 0 ? 0.72 : 1,
                        },
                      ]}
                    >
                      <View style={styles.monthRowBody}>
                        <View style={styles.monthTitleRow}>
                          <Text
                            style={[
                              styles.monthName,
                              { color: count === 0 ? colors.textSecondary : colors.textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                          {isNow ? (
                            <Text style={[styles.monthNow, { color: colors.primary }]}>
                              {t('chronologio:living.thisMonth')}
                            </Text>
                          ) : null}
                        </View>
                        {count === 0 ? (
                          <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                            {t('chronologio:living.emptyPeriod')}
                          </Text>
                        ) : (
                          <>
                            {highlights.length > 0 ? (
                              <Text
                                style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}
                                numberOfLines={1}
                              >
                                {highlights.join(' · ')}
                              </Text>
                            ) : null}
                            {facts.length > 0 ? (
                              <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                                {facts.join(' · ')}
                              </Text>
                            ) : null}
                          </>
                        )}
                      </View>
                      {hero ? (
                        <Image source={{ uri: hero }} style={styles.monthThumb} />
                      ) : (
                        <View style={[styles.monthThumb, { backgroundColor: colors.primaryLight }]} />
                      )}
                    </Pressable>
                  );
                });
              })()}
            </ScrollView>
          ) : null}

          {zoom === 'years' ? (
            !Array.isArray(years) || years.length === 0 ? (
              <EmptyState
                title={fieldMode ? t('chronologio:emptyFieldTitle') : t('chronologio:emptyGlobalTitle')}
                description={
                  fieldMode ? t('chronologio:emptyFieldDescription') : t('chronologio:emptyGlobalDescription')
                }
                action={emptyCapture}
              />
            ) : (
              <FlatList
                data={years}
                keyExtractor={(item) => item.key}
                contentContainerStyle={{ paddingBottom: 48 }}
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
                      onChangeYears={setCompareYears}
                      onClose={() => setCompareOpen(false)}
                    />
                  ) : null
                }
                renderItem={({ item }) => {
                  const isCurrent = item.periodYear === nowYear;
                  const isActive = item.periodYear === periodYear;
                  const hero = isRealMedia(item.heroMediaUrl) ? item.heroMediaUrl : undefined;
                  const metrics = yearFixedMetrics(item, numberLocale, tt);
                  const weather = weatherFactBits(item, tt);
                  return (
                    <AccentCard
                      accentColor={isActive || isCurrent ? colors.primary : colors.oliveBorder}
                      onPress={() => {
                        setPeriodYear(item.periodYear);
                        openYearPeek(item);
                      }}
                      style={styles.historyCard}
                      padding="medium"
                    >
                      <View
                        style={[
                          styles.historyMedia,
                          {
                            backgroundColor: colors.primaryLight,
                            borderColor: isActive ? colors.oliveBorder : colors.borderLight,
                          },
                        ]}
                      >
                        {hero ? <Image source={{ uri: hero }} style={styles.historyHero} /> : null}
                        <View
                          style={[
                            styles.historyOverlay,
                            { backgroundColor: colors.surface + 'E6' },
                          ]}
                        >
                          <Text style={[styles.historyYear, { color: colors.textPrimary }]}>
                            {item.periodYear}
                          </Text>
                          {isCurrent ? (
                            <Text style={[styles.historyPill, { color: colors.primary }]}>
                              {t('chronologio:living.currentYear')}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.metricsRow}>
                        {metrics.map((m) => (
                          <View key={m.label} style={styles.metricCell}>
                            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }}>
                              {m.value}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{m.label}</Text>
                          </View>
                        ))}
                      </View>
                      {weather.length > 0 ? (
                        <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
                          {weather.join(' · ')}
                        </Text>
                      ) : null}
                    </AccentCard>
                  );
                }}
                ListFooterComponent={
                  <Text style={{ color: colors.textSecondary, marginTop: 16, lineHeight: 20 }}>
                    {t('chronologio:living.historyStartsHere')}
                  </Text>
                }
              />
            )
          ) : null}
        </View>
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
                {t('chronologio:clearFilters')}
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
        <FilterChips
          wrap
          compact
          selected={filterCategory}
          onSelect={(v) => setFilterCategory(v as FilterCategory)}
          contentStyle={{ marginBottom: 8 }}
          options={FILTER_CATEGORIES.map((c) => ({
            value: c,
            label: t(`chronologio:categories.${c}`),
          }))}
        />
      </Sheet>

      <ChronologioPeekSheet
        peek={
          peek?.mode === 'year'
            ? { ...peek, months: peek.months?.length ? peek.months : peekMonthsCache }
            : peek
        }
        numberLocale={numberLocale}
        onClose={() => setPeek(null)}
        onDrillToMonths={(year) => {
          setPeriodYear(year);
          setPeek(null);
          setZoomAndPage('year');
        }}
        onDrillToDays={(y, m) => {
          setMonthYear(y);
          setMonth(m);
          setPeriodYear(y);
          setPeek(null);
          setZoom('month');
        }}
        onSelectRecent={(entry) => setPeek({ mode: 'event', entry })}
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
  axisRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  axisLink: {
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
  historyCard: { marginBottom: 18 },
  historyMedia: {
    height: 112,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  historyHero: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  historyOverlay: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  historyYear: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6 },
  historyPill: { fontSize: 12, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  metricCell: { minWidth: '28%', flexGrow: 1 },
  yearSummaryLine: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  monthRowBody: { flex: 1, minWidth: 0, gap: 4 },
  monthTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  monthName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  monthNow: { fontSize: 12, fontWeight: '700' },
  monthThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
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
