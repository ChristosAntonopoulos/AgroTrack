import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
  ViewToken,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import EmptyState from '../components/EmptyState';
import ChronologioPeekSheet, {
  ChronologioPeekTarget,
} from '../components/chronologio/ChronologioPeekSheet';
import ChronologioComparePanel from '../components/chronologio/ChronologioComparePanel';
import ChronologioEntryCard from '../components/chronologio/ChronologioEntryCard';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { usePreferences } from '../context/PreferencesContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { typography, spacing } from '../theme';
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
import { groupChronologioEntries, PAGE_SIZE } from '../utils/chronologioGrouping';
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

const isPeriodWeatherEntry = (e: ChronologioEntry) =>
  e.eventType === 'weather.monthReview' || e.eventType === 'weather.yearReview';

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
  const [stickyDate, setStickyDate] = useState<string | null>(null);
  const [stickyMonth, setStickyMonth] = useState<{ year: number; month: number } | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareYears, setCompareYears] = useState<[number, number]>([nowYear - 1, nowYear]);
  const [compareLeftMonths, setCompareLeftMonths] = useState<ChronologioMonthSummary[]>([]);
  const [compareRightMonths, setCompareRightMonths] = useState<ChronologioMonthSummary[]>([]);
  const dayLabelByIndex = useRef<string[]>([]);
  const dayMonthByIndex = useRef<Array<{ year: number; month: number } | null>>([]);

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
      setYears(yearList);

      if (zoom === 'year') {
        const monthFilters = {
          ...summaryFilterParams,
          year: axis === 'calendar' ? periodYear : undefined,
          season: axis === 'season' ? periodYear : undefined,
        };
        const monthList = scopedFieldId
          ? await svc.getFieldMonthSummaries(scopedFieldId, monthFilters)
          : await svc.getMyMonthSummaries(monthFilters);
        setMonths(monthList);
      } else {
        setMonths([]);
      }

      if (zoom === 'month') {
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
        setEntries(list);
        setHasMore(list.length >= PAGE_SIZE);
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
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...next.filter((e) => !seen.has(e.id))];
      });
      setHasMore(next.length >= PAGE_SIZE);
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

  const monthRows = useMemo(() => {
    const model = groupChronologioEntries(entries);
    const rows: Array<{
      key: string;
      kind: 'day' | 'entry';
      label?: string;
      year?: number;
      month?: number;
      entry?: ChronologioEntry;
    }> = [];
    const currentYear = new Date().getFullYear();
    const labels: string[] = [];
    const months: Array<{ year: number; month: number } | null> = [];

    for (const m of model.months) {
      for (const d of m.days) {
        const label =
          d.kind === 'today'
            ? t('chronologio:today')
            : d.kind === 'yesterday'
              ? t('chronologio:yesterday')
              : d.date.toLocaleDateString(i18n.language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: d.date.getFullYear() !== currentYear ? 'numeric' : undefined,
                });
        const ym = { year: d.date.getFullYear(), month: d.date.getMonth() + 1 };
        rows.push({ key: `d-${d.key}`, kind: 'day', label, year: ym.year, month: ym.month });
        labels.push(label);
        months.push(ym);
        for (const e of d.entries) {
          if (isPeriodWeatherEntry(e)) continue;
          rows.push({ key: e.id, kind: 'entry', entry: e });
          labels.push(label);
          months.push(ym);
        }
      }
    }
    dayLabelByIndex.current = labels;
    dayMonthByIndex.current = months;
    return rows;
  }, [entries, i18n.language, t]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const first = viewableItems.find((v) => v.isViewable && v.index != null);
      if (first?.index == null) return;
      const label = dayLabelByIndex.current[first.index];
      const ym = dayMonthByIndex.current[first.index];
      if (label) setStickyDate(label);
      if (ym) setStickyMonth(ym);
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 12 }).current;
  useEffect(() => {
    if (zoom !== 'month' || monthRows.length === 0) {
      setStickyDate(null);
      setStickyMonth(null);
      return;
    }
    setStickyDate(dayLabelByIndex.current[0] ?? null);
    setStickyMonth(dayMonthByIndex.current[0] ?? null);
  }, [monthRows, zoom]);

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
        setPeekMonthsCache(rows);
        setPeek((prev) =>
          prev?.mode === 'year' && prev.summary.periodYear === summary.periodYear
            ? { mode: 'year', summary, months: rows }
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
        const recent = rows.filter((e) => !isPeriodWeatherEntry(e)).slice(0, 5);
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
    setZoom('month');
    setPeek(null);
    setCompareOpen(false);
  };

  const showReturnToday =
    (zoom === 'month' && (monthYear !== nowYear || month !== nowMonth)) ||
    (zoom === 'year' && periodYear !== nowYear);

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

  const body = (
    <>
      {embedded ? null : (
        <ScreenHeader
          title={t('chronologio:title')}
          subtitle={fieldMode ? fieldName || t('chronologio:taglineField') : t('chronologio:taglineGlobal')}
        />
      )}

      <View style={[styles.zoomBar, { borderColor: colors.border }]}>
        {ZOOM_DISPLAY_ORDER.map((z) => (
          <TouchableOpacity
            key={z}
            style={[
              styles.zoomLevel,
              {
                backgroundColor: zoom === z ? colors.primary : 'transparent',
                minHeight: Math.max(tapMin, 44),
              },
            ]}
            onPress={() => {
              if (z === 'month') {
                const now = new Date();
                setMonthYear(now.getUTCFullYear());
                setMonth(now.getUTCMonth() + 1);
              }
              setZoom(z);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: zoom === z }}
          >
            <Text style={{ color: zoom === z ? '#fff' : colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
              {t(`chronologio:living.zoom.${z}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.axisRow}>
        <TouchableOpacity
          style={[
            styles.axisChip,
            {
              borderColor: colors.border,
              backgroundColor: axis === 'calendar' ? colors.primary + '22' : 'transparent',
              minHeight: Math.max(tapMin, 44),
            },
          ]}
          onPress={() => setAxis('calendar')}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
            {t('chronologio:living.axisCalendar')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.axisChip,
            {
              borderColor: colors.border,
              backgroundColor: axis === 'season' ? colors.primary + '22' : 'transparent',
              minHeight: Math.max(tapMin, 44),
            },
          ]}
          onPress={() => setAxis('season')}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
            {t('chronologio:living.axisSeason')}
          </Text>
        </TouchableOpacity>
        {zoom === 'years' && years.length >= 2 ? (
          <TouchableOpacity
            style={[
              styles.axisChip,
              {
                borderColor: colors.border,
                backgroundColor: compareOpen ? colors.primary + '22' : 'transparent',
                minHeight: Math.max(tapMin, 44),
              },
            ]}
            onPress={() => {
              if (!compareOpen) {
                const yrs = availableCompareYears;
                setCompareYears([yrs[1] ?? yrs[0] - 1, yrs[0]]);
              }
              setCompareOpen((v) => !v);
            }}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
              {t('chronologio:living.compare')}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[
            styles.axisChip,
            {
              borderColor: colors.border,
              backgroundColor: filtersOpen || filtersDirty ? colors.primary + '22' : 'transparent',
              minHeight: Math.max(tapMin, 44),
              flexDirection: 'row',
              gap: 6,
              alignItems: 'center',
            },
          ]}
          onPress={() => setFiltersOpen(true)}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={filtersDirty ? colors.primary : colors.textPrimary}
          />
          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
            {t('chronologio:filters')}
          </Text>
        </TouchableOpacity>
      </View>

      {filtersDirty ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
            {filterCategory !== 'all' ? (
              <TouchableOpacity
                style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.primary + '18' }]}
                onPress={() => setFilterCategory('all')}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
                  {t(`chronologio:categories.${filterCategory}`)} ×
                </Text>
              </TouchableOpacity>
            ) : null}
            {lifecycleYear ? (
              <TouchableOpacity
                style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.primary + '18' }]}
                onPress={() => setLifecycleYear('')}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
                  {lifecycleYear === 'low'
                    ? t('chronologio:seasonLow')
                    : t('chronologio:seasonHigh')}{' '}
                  ×
                </Text>
              </TouchableOpacity>
            ) : null}
            {!fieldMode && filterFieldId ? (
              <TouchableOpacity
                style={[styles.filterChip, { borderColor: colors.border, backgroundColor: colors.primary + '18' }]}
                onPress={() => setFilterFieldId('')}
              >
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
                  {fields.find((f) => f.id === filterFieldId)?.name || filterFieldId} ×
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.filterChip, { borderColor: colors.border }]}
              onPress={() => {
                setFilterCategory('all');
                setLifecycleYear('');
                setFilterFieldId('');
              }}
            >
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 12 }}>
                {t('chronologio:clearFilters')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}

      {showReturnToday ? (
        <TouchableOpacity
          style={[
            styles.returnToday,
            {
              borderColor: colors.border,
              backgroundColor: colors.surfaceElevated,
              minHeight: Math.max(tapMin, 40),
            },
          ]}
          onPress={returnToToday}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {t('chronologio:living.returnToday')}
          </Text>
        </TouchableOpacity>
      ) : null}

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /> : null}

      {!loading && zoom === 'years' ? (
        years.length === 0 ? (
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
            contentContainerStyle={{ paddingBottom: 40 }}
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
                <TouchableOpacity
                  style={styles.historyCard}
                  onPress={() => {
                    setPeriodYear(item.periodYear);
                    openYearPeek(item);
                  }}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.historyMedia,
                      {
                        backgroundColor: colors.primary + '24',
                        borderColor: isActive ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {hero ? <Image source={{ uri: hero }} style={styles.historyHero} /> : null}
                    <View style={styles.historyOverlay}>
                      <Text style={styles.historyYear}>{item.periodYear}</Text>
                      {isCurrent ? (
                        <Text style={styles.historyPill}>{t('chronologio:living.currentYear')}</Text>
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
                </TouchableOpacity>
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

      {!loading && zoom === 'year' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={[styles.yearTitle, { color: colors.textPrimary }]}>
            {activePeriod?.periodYear || periodYear}
          </Text>
          {activePeriod ? (
            <>
              <View style={styles.metricsRow}>
                {yearFixedMetrics(activePeriod, numberLocale, tt).map((m) => (
                  <View key={m.label} style={styles.metricCell}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }}>
                      {m.value}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{m.label}</Text>
                  </View>
                ))}
              </View>
              {weatherFactBits(activePeriod, tt).length > 0 ? (
                <Text style={{ color: colors.textSecondary, marginTop: 8, marginBottom: 14 }}>
                  {weatherFactBits(activePeriod, tt).join(' · ')}
                </Text>
              ) : (
                <View style={{ height: 14 }} />
              )}
            </>
          ) : (
            <Text style={{ color: colors.textSecondary, marginBottom: 14 }}>
              {t('chronologio:living.emptyYear', { year: periodYear })}
            </Text>
          )}
          {[...months]
            .filter((m) => m.year < nowYear || (m.year === nowYear && m.month <= nowMonth))
            .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month))
            .map((m) => {
              const count = periodEventCount(m);
              const highlights = (m.highlightTitles || []).filter(Boolean).slice(0, 2);
              const isNow = m.month === nowMonth && m.year === nowYear;
              const title = new Date(Date.UTC(m.year, m.month - 1, 1)).toLocaleDateString(i18n.language, {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              });
              const hero = isRealMedia(m.heroMediaUrl) ? m.heroMediaUrl : undefined;
              const facts = monthChapterFacts(m, numberLocale, tt);
              return (
                <TouchableOpacity
                  key={m.key}
                  style={count === 0 ? styles.monthQuiet : styles.monthPoster}
                  onPress={() => openMonthPeek(m)}
                >
                  {count === 0 ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text
                        style={{
                          fontWeight: '600',
                          fontSize: 15,
                          color: colors.textSecondary,
                          textTransform: 'capitalize',
                        }}
                      >
                        {title}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                        {t('chronologio:living.emptyPeriod')}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.monthChapterRow}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                          <Text
                            style={{
                              fontWeight: '700',
                              fontSize: 17,
                              color: colors.textPrimary,
                              textTransform: 'capitalize',
                            }}
                          >
                            {title}
                          </Text>
                          {isNow ? (
                            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
                              {t('chronologio:living.thisMonth')}
                            </Text>
                          ) : null}
                        </View>
                        {highlights.length > 0 ? (
                          <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                            {highlights.join(' · ')}
                          </Text>
                        ) : null}
                        {m.observationHighlight ? (
                          <Text style={{ color: colors.textSecondary }} numberOfLines={2}>
                            {m.observationHighlight}
                          </Text>
                        ) : null}
                        {facts.length > 0 ? (
                          <Text style={{ color: colors.textSecondary }}>{facts.join(' · ')}</Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.monthChapterMedia,
                          { backgroundColor: colors.primary + '18' },
                        ]}
                      >
                        {hero ? <Image source={{ uri: hero }} style={styles.historyHero} /> : null}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      ) : null}

      {!loading && zoom === 'month' ? (
        entries.filter((e) => !isPeriodWeatherEntry(e)).length === 0 ? (
          <EmptyState
            title={t('chronologio:living.emptyMonthTitle')}
            description={t('chronologio:living.emptyMonthDescription')}
            action={emptyCapture}
          />
        ) : (
          <View style={{ flex: 1, position: 'relative' }}>
            {stickyDate ? (
              <View style={styles.stickyStack} pointerEvents="box-none">
                <View
                  pointerEvents="none"
                  style={[
                    styles.stickyDate,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12 }}
                    numberOfLines={1}
                  >
                    {stickyDate}
                  </Text>
                </View>
                {stickyMonth ? (
                  <TouchableOpacity
                    style={[
                      styles.stickyWeatherBtn,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: colors.border,
                        minHeight: Math.max(tapMin, 32),
                      },
                    ]}
                    onPress={() => openMonthWeatherPeek(stickyMonth.year, stickyMonth.month)}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
                      {t('chronologio:living.weatherButton')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            <FlatList
              data={monthRows}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ paddingBottom: 40, paddingTop: 4 }}
              onEndReached={loadMore}
              onEndReachedThreshold={0.4}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
                ) : !hasMore ? (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 16 }}>
                    {t('chronologio:living.endOfJournal')}
                  </Text>
                ) : null
              }
              renderItem={({ item }) => {
                if (item.kind === 'day') {
                  return (
                    <Text
                      style={[
                        styles.dayLabel,
                        {
                          color: colors.textSecondary,
                          opacity: stickyDate === item.label ? 0.4 : 1,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  );
                }

                const entry = item.entry!;
                return (
                  <ChronologioEntryCard
                    entry={entry}
                    showField={!fieldMode}
                    numberLocale={numberLocale}
                    minHeight={Math.max(tapMin, 44)}
                    onPress={() => setPeek({ mode: 'event', entry })}
                  />
                );
              }}
            />
          </View>
        )
      ) : null}

      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.filterSheet, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 18, marginBottom: 12 }}>
              {t('chronologio:filters')}
            </Text>
            {!fieldMode && fields.length > 0 ? (
              <>
                <Text style={styles.filterLabel}>{t('chronologio:allFields')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        {
                          borderColor: colors.border,
                          backgroundColor: !filterFieldId ? colors.primary + '22' : 'transparent',
                        },
                      ]}
                      onPress={() => setFilterFieldId('')}
                    >
                      <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                        {t('chronologio:allFields')}
                      </Text>
                    </TouchableOpacity>
                    {fields.map((f) => (
                      <TouchableOpacity
                        key={f.id}
                        style={[
                          styles.filterChip,
                          {
                            borderColor: colors.border,
                            backgroundColor: filterFieldId === f.id ? colors.primary + '22' : 'transparent',
                          },
                        ]}
                        onPress={() => setFilterFieldId(f.id)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 99,
                              backgroundColor: resolveFieldColor(f.color, f.id),
                            }}
                          />
                          <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                            {f.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            ) : null}

            <Text style={styles.filterLabel}>{t('chronologio:living.lifecycleYear')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {(
                [
                  { id: '' as const, label: t('chronologio:allSeasons') },
                  { id: 'low' as const, label: t('chronologio:seasonLow') },
                  { id: 'high' as const, label: t('chronologio:seasonHigh') },
                ] as const
              ).map((opt) => (
                <TouchableOpacity
                  key={opt.id || 'all'}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: colors.border,
                      backgroundColor: lifecycleYear === opt.id ? colors.primary + '22' : 'transparent',
                    },
                  ]}
                  onPress={() => setLifecycleYear(opt.id)}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>{t('chronologio:filtersTitle')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {FILTER_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: colors.border,
                      backgroundColor: filterCategory === c ? colors.primary + '22' : 'transparent',
                    },
                  ]}
                  onPress={() => setFilterCategory(c)}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                    {t(`chronologio:categories.${c}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[
                  styles.filterAction,
                  {
                    borderColor: colors.border,
                    borderWidth: 1,
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
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t('chronologio:applyFilters')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ChronologioPeekSheet
        peek={
          peek?.mode === 'year'
            ? { ...peek, months: peek.months.length ? peek.months : peekMonthsCache }
            : peek
        }
        numberLocale={numberLocale}
        onClose={() => setPeek(null)}
        onDrillToMonths={(year) => {
          setPeriodYear(year);
          setPeek(null);
          setZoom('year');
        }}
        onDrillToDays={(y, m) => {
          setMonthYear(y);
          setMonth(m);
          setPeek(null);
          setZoom('month');
        }}
        onSelectRecent={(entry) => setPeek({ mode: 'event', entry })}
      />
    </>
  );

  if (embedded) {
    return <View style={{ flex: 1 }}>{body}</View>;
  }

  return <ScreenLayout padded>{body}</ScreenLayout>;
};

const styles = StyleSheet.create({
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  zoomLevel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  axisRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  axisChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  returnToday: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
  },
  historyCard: { marginBottom: 18 },
  historyMedia: {
    height: 112,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    justifyContent: 'flex-end',
  },
  historyHero: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  historyOverlay: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(18,22,16,0.45)',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  historyYear: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.6 },
  historyPill: { color: '#fff', fontSize: 12, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  metricCell: { minWidth: '28%', flexGrow: 1 },
  monthPoster: { marginBottom: 16 },
  monthQuiet: { marginBottom: 8, minHeight: 44, justifyContent: 'center' },
  monthChapterRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  monthChapterMedia: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
  },
  yearTitle: { ...typography.styles.h2, fontWeight: '800', marginBottom: 8 },
  dayLabel: {
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
    fontSize: 15,
    letterSpacing: -0.3,
    paddingRight: 108,
  },
  stickyDate: {
    maxWidth: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  stickyStack: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 5,
    maxWidth: '72%',
    alignItems: 'flex-end',
    gap: 6,
  },
  stickyWeatherBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    opacity: 0.7,
  },
  filterSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  filterAction: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
});

export default ChronologioScreen;
