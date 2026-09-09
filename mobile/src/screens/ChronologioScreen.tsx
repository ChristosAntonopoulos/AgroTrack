import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';
import { useCaptureOptional } from '../context/CaptureContext';
import { usePreferences } from '../context/PreferencesContext';
import { CAPTURE_SAVED_EVENT } from '../capture/types';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { getChronologioService, getFieldService } from '../services/serviceFactory';
import type {
  ChronologioAxis,
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../services/chronologioService';
import { formatChronologioMoney, groupChronologioEntries } from '../utils/chronologioGrouping';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Zoom = 'years' | 'year' | 'month';

const ZOOM_DISPLAY_ORDER: Zoom[] = ['month', 'year', 'years'];

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

type ChronologioViewProps = {
  fieldId?: string;
  embedded?: boolean;
};

const ChronologioScreen = ({ fieldId: fieldIdProp, embedded }: ChronologioViewProps = {}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common', 'capture']);
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const capture = useCaptureOptional();
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const fieldId =
    fieldIdProp ?? (route.params as { fieldId?: string } | undefined)?.fieldId;
  const fieldMode = Boolean(fieldId);
  const numberLocale = i18n.language?.startsWith('el') ? 'el-GR' : 'en-US';
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  const [fieldName, setFieldName] = useState('');
  const [zoom, setZoom] = useState<Zoom>('month');
  const [axis, setAxis] = useState<ChronologioAxis>('calendar');
  const [periodYear, setPeriodYear] = useState(new Date().getUTCFullYear());
  const [monthYear, setMonthYear] = useState(new Date().getUTCFullYear());
  const [month, setMonth] = useState(new Date().getUTCMonth() + 1);
  const [years, setYears] = useState<ChronologioPeriodSummary[]>([]);
  const [months, setMonths] = useState<ChronologioMonthSummary[]>([]);
  const [entries, setEntries] = useState<ChronologioEntry[]>([]);
  const [selected, setSelected] = useState<ChronologioEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const svc = getChronologioService();
      const summaryFilters = { axis };
      const yearList = fieldId
        ? await svc.getFieldYearSummaries(fieldId, summaryFilters)
        : await svc.getMyYearSummaries(summaryFilters);
      setYears(yearList);

      if (zoom === 'year' || zoom === 'month') {
        const monthFilters = {
          axis,
          year: axis === 'calendar' ? periodYear : undefined,
          season: axis === 'season' ? periodYear : undefined,
        };
        const monthList = fieldId
          ? await svc.getFieldMonthSummaries(fieldId, monthFilters)
          : await svc.getMyMonthSummaries(monthFilters);
        setMonths(monthList);
      } else {
        setMonths([]);
      }

      if (zoom === 'month') {
        const { from, to } = monthBounds(monthYear, month);
        const list = fieldId
          ? await svc.getFieldChronologio(fieldId, { from, to, limit: 200 })
          : await svc.getMyChronologio({ from, to, limit: 200 });
        setEntries(list);
      } else {
        setEntries([]);
      }
    } catch {
      setYears([]);
      setMonths([]);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [axis, fieldId, month, monthYear, periodYear, zoom]);

  useEffect(() => {
    void load();
  }, [load, reloadToken]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(CAPTURE_SAVED_EVENT, () => {
      setReloadToken((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'short', timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, i) =>
      fmt.format(new Date(Date.UTC(2020, i, 1))).replace(/\./g, '').toUpperCase()
    );
  }, [i18n.language]);

  const monthTitle = useMemo(() => {
    const d = new Date(Date.UTC(monthYear, month - 1, 1));
    return d.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }, [i18n.language, month, monthYear]);

  const monthRows = useMemo(() => {
    const model = groupChronologioEntries(entries);
    const rows: Array<{ key: string; kind: 'day' | 'entry'; label?: string; entry?: ChronologioEntry }> = [];
    for (const m of model.months) {
      for (const d of m.days) {
        const label =
          d.kind === 'today'
            ? t('chronologio:today')
            : d.kind === 'yesterday'
              ? t('chronologio:yesterday')
              : d.date.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
        rows.push({ key: `d-${d.key}`, kind: 'day', label });
        for (const e of d.entries) rows.push({ key: e.id, kind: 'entry', entry: e });
      }
    }
    return rows;
  }, [entries, i18n.language, t]);

  const activePeriod = years.find((y) => y.periodYear === periodYear);

  const yearSummaryLine = (y?: ChronologioPeriodSummary | null) => {
    if (!y) return '';
    const bits: string[] = [];
    if (y.taskCount > 0) bits.push(t('chronologio:living.statTasks', { count: y.taskCount }));
    if (y.expenseTotal > 0) {
      bits.push(formatChronologioMoney(y.expenseTotal, y.currency, numberLocale));
    }
    if (y.oliveKg > 0) bits.push(`${Math.round(y.oliveKg).toLocaleString(numberLocale)} kg`);
    if (y.oilYieldPercent != null && y.oilYieldPercent > 0) bits.push(`${y.oilYieldPercent}%`);
    return bits.join(' · ');
  };

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
            onPress={() => setZoom(z)}
            accessibilityRole="button"
            accessibilityState={{ selected: zoom === z }}
          >
            <Text style={{ color: zoom === z ? '#fff' : colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
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
      </View>

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
            renderItem={({ item }) => {
              const isCurrent = item.periodYear === nowYear;
              const isActive = item.periodYear === periodYear;
              return (
                <TouchableOpacity
                  style={[
                    styles.yearCard,
                    {
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: colors.surfaceElevated,
                      minHeight: Math.max(tapMin, 44),
                    },
                  ]}
                  onPress={() => {
                    setPeriodYear(item.periodYear);
                    setZoom('year');
                  }}
                >
                  <View style={styles.yearTitleRow}>
                    <Text style={[styles.yearTitle, { color: colors.textPrimary }]}>{item.periodYear}</Text>
                    {isCurrent ? (
                      <Text style={[styles.pill, { color: colors.primary }]}>
                        {t('chronologio:living.currentYear', { defaultValue: 'Τρέχουσα χρονιά' })}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ color: colors.textSecondary }}>
                    {yearSummaryLine(item) || t('chronologio:living.emptyPeriod', { defaultValue: '' })}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <Text style={{ color: colors.textSecondary, marginTop: 16, lineHeight: 20 }}>
                {t('chronologio:living.historyStartsHere', {
                  defaultValue: 'Εδώ ξεκινά η καταγεγραμμένη ιστορία αυτού του ελαιώνα.',
                })}
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
          <Text style={{ color: colors.textSecondary, marginBottom: 14 }}>
            {yearSummaryLine(activePeriod) ||
              t('chronologio:living.emptyYear', {
                year: periodYear,
                defaultValue: `Δεν υπάρχουν ακόμη καταγραφές για το ${periodYear}.`,
              })}
          </Text>
          {months.map((m) => {
            const count = m.taskCount + m.expenseCount + m.harvestCount + m.noteCount;
            const highlights = (m.highlightTitles || []).filter(Boolean).slice(0, 3);
            const isFocus = m.month === month && m.year === monthYear;
            const isNow = m.month === nowMonth && m.year === nowYear;
            return (
              <TouchableOpacity
                key={m.key}
                style={[
                  styles.monthRow,
                  {
                    borderColor: colors.border,
                    minHeight: Math.max(tapMin, 44),
                    opacity: count === 0 ? 0.45 : 1,
                    backgroundColor: isFocus ? colors.primary + '14' : 'transparent',
                  },
                ]}
                onPress={() => {
                  setMonthYear(m.year);
                  setMonth(m.month);
                  setZoom('month');
                }}
              >
                <View style={{ width: 52 }}>
                  <Text style={{ fontWeight: '800', color: colors.textPrimary }}>
                    {monthNames[m.month - 1]}
                  </Text>
                  {isNow ? (
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                      {t('chronologio:living.now', { defaultValue: 'Τώρα' })}
                    </Text>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: highlights.length ? '600' : '400' }}>
                    {highlights.length
                      ? highlights.join(' · ')
                      : count > 0
                        ? t('chronologio:living.monthWorks', { count })
                        : '—'}
                  </Text>
                  {count > highlights.length && highlights.length > 0 ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {t('chronologio:living.moreEvents', {
                        count: count - highlights.length,
                        defaultValue: `+ ${count - highlights.length} ακόμη`,
                      })}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {!loading && zoom === 'month' ? (
        entries.length === 0 ? (
          <EmptyState
            title={t('chronologio:living.emptyMonthTitle', { month: monthTitle })}
            description={t('chronologio:living.emptyMonthDescription')}
            action={emptyCapture}
          />
        ) : (
          <FlatList
            data={monthRows}
            keyExtractor={(item) => item.key}
            ListHeaderComponent={
              <Text style={[styles.yearTitle, { color: colors.textPrimary }]}>{monthTitle}</Text>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) =>
              item.kind === 'day' ? (
                <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.entryCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceElevated,
                      minHeight: Math.max(tapMin, 44),
                    },
                  ]}
                  onPress={() => setSelected(item.entry || null)}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                    {item.entry
                      ? new Date(item.entry.occurredAt).toLocaleTimeString(i18n.language, {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : ''}{' '}
                    ·{' '}
                    {t(`chronologio:categoryLabel.${item.entry?.category}`, {
                      defaultValue: item.entry?.category,
                    })}
                  </Text>
                  <Text style={{ fontWeight: '700', color: colors.textPrimary, marginTop: 2 }}>
                    {item.entry?.title}
                  </Text>
                </TouchableOpacity>
              )
            }
          />
        )
      ) : null}

      <Modal visible={Boolean(selected)} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>
              {selected
                ? t(`chronologio:categoryLabel.${selected.category}`, { defaultValue: selected.category })
                : ''}
            </Text>
            <Text style={[styles.yearTitle, { color: colors.textPrimary }]}>{selected?.title}</Text>
            <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
              {selected
                ? `${new Date(selected.occurredAt).toLocaleDateString(i18n.language, {
                    dateStyle: 'long',
                  })} · ${new Date(selected.occurredAt).toLocaleTimeString(i18n.language, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}`
                : ''}
            </Text>
            {selected?.summary || selected?.details.note?.bodyPreview ? (
              <Text style={{ color: colors.textPrimary, marginBottom: 12 }}>
                {selected.summary || selected.details.note?.bodyPreview}
              </Text>
            ) : null}
            {selected?.media?.[0] &&
            isRealMedia(selected.media[0].url || selected.media[0].thumbnailUrl) ? (
              <Image
                source={{ uri: selected.media[0].url || selected.media[0].thumbnailUrl }}
                style={styles.photo}
              />
            ) : null}
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.primary, minHeight: Math.max(tapMin, 44) }]}
              onPress={() => setSelected(null)}
            >
              <Text style={styles.closeText}>{t('common:close', { defaultValue: 'Close' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  axisRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  axisChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  yearCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  yearTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  yearTitle: { ...typography.styles.h2, fontWeight: '800', marginBottom: 0 },
  pill: { fontSize: 11, fontWeight: '700' },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  dayLabel: { fontWeight: '700', marginTop: 12, marginBottom: 6 },
  entryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  photo: { width: '100%', height: 180, borderRadius: 12 },
  closeBtn: {
    alignSelf: 'stretch',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  closeText: { color: '#fff', fontWeight: '700' },
});

export default ChronologioScreen;
