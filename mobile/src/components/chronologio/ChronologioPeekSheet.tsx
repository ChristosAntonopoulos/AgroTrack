import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useCaptureOptional } from '../../context/CaptureContext';
import { spacing, radii } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import {
  majorMonthsForYear,
  monthChapterFacts,
  periodEventCount,
  weatherFactBits,
  yearFixedMetrics,
} from '../../utils/summaryFacts';
import { resolveFieldColor } from '../../utils/fieldColors';
import { accentColorsForToken } from '../../utils/chronologioCategoryAccents';
import { detailAccentToken, chronologioDetailKind } from '../../chronologio/detailKind';
import WeatherReviewSummary from './WeatherReviewSummary';
import ChronologioRecentList from './ChronologioRecentList';
import ChronologioEventPeekBody, {
  eventPeekFooterActions,
} from './ChronologioEventPeekBody';
import { presentChronologioEvent } from '../../chronologio/eventPresentation';
import Sheet from '../ui/Sheet';

export type ChronologioPeekTarget =
  | { mode: 'event'; entry: ChronologioEntry }
  | {
      mode: 'month';
      summary: ChronologioMonthSummary;
      recent: ChronologioEntry[];
      loadingRecent?: boolean;
    }
  | {
      mode: 'year';
      summary: ChronologioPeriodSummary;
      months: ChronologioMonthSummary[];
    }
  | {
      mode: 'monthWeather';
      year: number;
      month: number;
      reviews: ChronologioEntry[];
      loading?: boolean;
    };

type Props = {
  peek: ChronologioPeekTarget | null;
  numberLocale: string;
  onClose: () => void;
  onDrillToMonths?: (periodYear: number) => void;
  onDrillToDays?: (year: number, month: number) => void;
  onSelectRecent?: (entry: ChronologioEntry) => void;
};

const ChronologioPeekSheet: React.FC<Props> = ({
  peek,
  numberLocale,
  onClose,
  onDrillToMonths,
  onDrillToDays,
  onSelectRecent,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common']);
  const { colors, tapMin } = useTheme();
  const capture = useCaptureOptional();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tt = (key: string, opts?: Record<string, string | number>) =>
    t(key, opts as Record<string, unknown>);

  const entry = peek?.mode === 'event' ? peek.entry : null;
  const kind = entry ? chronologioDetailKind(entry) : null;
  const isPeriodReview = kind === 'weatherPeriod';
  const eventAccent = entry
    ? accentColorsForToken(colors, detailAccentToken(entry)).accent
    : colors.primary;

  const [weatherFieldId, setWeatherFieldId] = useState<string | undefined>();

  useEffect(() => {
    if (peek?.mode === 'monthWeather' && peek.reviews[0]?.fieldId) {
      setWeatherFieldId(peek.reviews[0].fieldId);
    }
  }, [peek]);

  const selectedWeatherReview = useMemo(() => {
    if (peek?.mode !== 'monthWeather') return null;
    return (
      peek.reviews.find(r => r.fieldId === weatherFieldId) || peek.reviews[0] || null
    );
  }, [peek, weatherFieldId]);

  const monthTitle = (m: ChronologioMonthSummary) =>
    new Date(Date.UTC(m.year, m.month - 1, 1)).toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  const weatherMonthTitle =
    peek?.mode === 'monthWeather'
      ? new Date(Date.UTC(peek.year, peek.month - 1, 1)).toLocaleDateString(i18n.language, {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : '';

  const eventPresentation =
    peek?.mode === 'event' ? presentChronologioEvent(peek.entry, i18n.language) : null;

  const headerTitle =
    peek?.mode === 'event'
      ? eventPresentation?.label || peek.entry.title
      : peek?.mode === 'month'
        ? monthTitle(peek.summary)
        : peek?.mode === 'year'
          ? String(peek.summary.periodYear)
          : peek?.mode === 'monthWeather'
            ? weatherMonthTitle
            : '';

  const headerMeta =
    peek?.mode === 'event'
      ? isPeriodReview
        ? t('weatherPeek.kicker')
        : eventPresentation?.shortLabel || ''
      : peek?.mode === 'month'
        ? t('living.peekMonth')
        : peek?.mode === 'year'
          ? t('living.peekYear')
          : peek?.mode === 'monthWeather'
            ? t('weatherReview.pickGrove', { defaultValue: 'Choose a grove' })
            : '';

  const sheetAccent =
    peek?.mode === 'monthWeather' || isPeriodReview
      ? colors.weatherBlue
      : peek?.mode === 'event'
        ? eventAccent
        : colors.primary;

  const navigateFromEntry = (target: ChronologioEntry) => {
    onClose();
    if (target.sourceType === 'Task' || target.sourceType === 'TaskExecution') {
      navigation.navigate('TaskDetail', {
        taskId: target.details.task?.taskId || target.sourceId,
      });
    } else if (target.sourceType === 'Expense' || target.sourceType === 'Income') {
      navigation.navigate('Money', { fieldId: target.fieldId });
    } else if (target.sourceType === 'Harvest') {
      navigation.navigate('FieldDetail', { fieldId: target.fieldId, focus: 'harvest' });
    } else if (target.sourceType === 'WeatherReview') {
      navigation.navigate('FieldWeatherVegetation', { fieldId: target.fieldId });
    } else if (target.fieldId) {
      navigation.navigate('FieldDetail', { fieldId: target.fieldId });
    }
  };

  const eventActions =
    entry && peek?.mode === 'event'
      ? eventPeekFooterActions(entry, t as (key: string, opts?: Record<string, unknown>) => string, {
          openTask: () => navigateFromEntry(entry),
          openMoney: () => navigateFromEntry(entry),
          openHarvest: () => navigateFromEntry(entry),
          openWeather: () => navigateFromEntry(entry),
          openField: () => navigateFromEntry(entry),
          createTask: capture
            ? () => {
                onClose();
                capture.openCapture({
                  preferredType: 'work',
                  fieldId: entry.fieldId,
                });
              }
            : undefined,
        })
      : [];

  const footer =
    peek?.mode === 'event' && eventActions.length > 0 ? (
      <View style={{ gap: spacing.sm }}>
        {eventActions.map(action => (
          <TouchableOpacity
            key={action.label}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: action.primary ? sheetAccent : colors.surface,
                borderWidth: action.primary ? 0 : StyleSheet.hairlineWidth,
                borderColor: colors.borderLight,
                minHeight: Math.max(tapMin, 44),
              },
            ]}
            onPress={action.onPress}
          >
            <Text
              style={[
                styles.primaryBtnText,
                { color: action.primary ? colors.onOlive : colors.textPrimary },
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    ) : peek?.mode === 'month' ? (
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: colors.primary, minHeight: Math.max(tapMin, 44) },
        ]}
        onPress={() => onDrillToDays?.(peek.summary.year, peek.summary.month)}
      >
        <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
          {t('living.drillToDays', { month: monthTitle(peek.summary) })}
        </Text>
      </TouchableOpacity>
    ) : peek?.mode === 'year' ? (
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: colors.primary, minHeight: Math.max(tapMin, 44) },
        ]}
        onPress={() => onDrillToMonths?.(peek.summary.periodYear)}
      >
        <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
          {t('living.drillToMonths', { year: peek.summary.periodYear })}
        </Text>
      </TouchableOpacity>
    ) : peek?.mode === 'monthWeather' && selectedWeatherReview ? (
      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: colors.weatherBlue, minHeight: Math.max(tapMin, 44) },
        ]}
        onPress={() => {
          onClose();
          navigation.navigate('FieldWeatherVegetation', {
            fieldId: selectedWeatherReview.fieldId,
          });
        }}
      >
        <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
          {t('weatherReview.openCharts')}
        </Text>
      </TouchableOpacity>
    ) : null;

  return (
    <Sheet
      open={Boolean(peek)}
      onClose={onClose}
      edge="end"
      size={peek?.mode === 'monthWeather' || isPeriodReview ? 'lg' : 'md'}
      accent
      accentColor={sheetAccent}
      kicker={headerMeta}
      title={headerTitle || undefined}
      icon={
        peek?.mode === 'monthWeather' || isPeriodReview ? (
          <Ionicons name="rainy-outline" size={22} color={colors.weatherBlue} />
        ) : undefined
      }
      footer={footer}
    >
      {peek?.mode === 'event' ? (
        <ChronologioEventPeekBody entry={peek.entry} numberLocale={numberLocale} />
      ) : null}

      {peek?.mode === 'month' ? (
        <>
          <View style={styles.metricsRow}>
            {yearFixedMetrics(peek.summary, numberLocale, tt).map(m => (
              <View key={m.label} style={styles.metricCell}>
                <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{m.value}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{m.label}</Text>
              </View>
            ))}
          </View>
          {monthChapterFacts(peek.summary, numberLocale, tt).length > 0 ? (
            <Text style={{ color: colors.textSecondary, marginTop: 10 }}>
              {monthChapterFacts(peek.summary, numberLocale, tt).join(' · ')}
            </Text>
          ) : (
            <Text style={{ color: colors.textSecondary, marginTop: 10 }}>
              {t('living.emptyPeriod')}
            </Text>
          )}
          {weatherFactBits(peek.summary, tt).length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('living.peekWeather')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {weatherFactBits(peek.summary, tt).join(' · ')}
              </Text>
            </View>
          ) : null}
          {(peek.summary.highlightTitles?.length || peek.summary.observationHighlight) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('living.peekHighlights')}
              </Text>
              <Text style={{ color: colors.textPrimary }}>
                {(peek.summary.highlightTitles || []).filter(Boolean).slice(0, 2).join(' · ') ||
                  peek.summary.observationHighlight}
              </Text>
            </View>
          )}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('living.peekRecent')}
            </Text>
            {peek.loadingRecent ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
            ) : (
              <ChronologioRecentList
                entries={peek.recent}
                emptyLabel={t('living.emptyPeriod')}
                onPressEntry={e => onSelectRecent?.(e)}
              />
            )}
          </View>
        </>
      ) : null}

      {peek?.mode === 'year' ? (
        <>
          <View style={styles.metricsRow}>
            {yearFixedMetrics(peek.summary, numberLocale, tt).map(m => (
              <View key={m.label} style={styles.metricCell}>
                <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{m.value}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{m.label}</Text>
              </View>
            ))}
          </View>
          {weatherFactBits(peek.summary, tt).length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('living.peekWeather')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {weatherFactBits(peek.summary, tt).join(' · ')}
              </Text>
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t('living.peekMajorMonths')}
            </Text>
            {majorMonthsForYear(peek.months).length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>{t('living.emptyPeriod')}</Text>
            ) : (
              majorMonthsForYear(peek.months).map(m => (
                <View key={m.key} style={{ marginTop: 8 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                    {monthTitle(m)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {t('living.monthWorks', { count: periodEventCount(m) })}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      ) : null}

      {peek?.mode === 'monthWeather' ? (
        <View style={{ gap: 14 }}>
          {peek.loading ? (
            <ActivityIndicator color={colors.weatherBlue} />
          ) : peek.reviews.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>{t('living.emptyMonthWeather')}</Text>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fieldTabs}
              >
                {peek.reviews.map(review => {
                  const selected = review.fieldId === selectedWeatherReview?.fieldId;
                  const fieldColor = resolveFieldColor(review.field?.color, review.fieldId);
                  return (
                    <Pressable
                      key={review.id}
                      onPress={() => setWeatherFieldId(review.fieldId)}
                      style={[
                        styles.fieldTab,
                        {
                          minHeight: Math.max(40, tapMin * 0.85),
                          backgroundColor: selected ? colors.eventWeatherSoft : colors.surface,
                          borderColor: selected ? colors.weatherBlue : colors.borderLight,
                        },
                      ]}
                    >
                      <View style={[styles.fieldDot, { backgroundColor: fieldColor }]} />
                      <Text
                        style={{
                          color: selected ? colors.eventWeather : colors.textSecondary,
                          fontWeight: selected ? '700' : '600',
                          fontSize: 13,
                        }}
                        numberOfLines={1}
                      >
                        {review.field?.name || '—'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {selectedWeatherReview?.details.weather ? (
                <WeatherReviewSummary
                  weather={selectedWeatherReview.details.weather}
                  eventType={selectedWeatherReview.eventType}
                  numberLocale={numberLocale}
                  locale={i18n.language}
                  showSource
                />
              ) : null}

              <Pressable
                onPress={() => selectedWeatherReview && onSelectRecent?.(selectedWeatherReview)}
                hitSlop={8}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('weatherReview.tapForDetails')}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  section: { marginTop: 14, gap: 4 },
  sectionTitle: { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  metricCell: { minWidth: '28%', flexGrow: 1 },
  primaryBtn: {
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { fontWeight: '700' },
  fieldTabs: { gap: 8, paddingVertical: 2 },
  fieldTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 180,
  },
  fieldDot: { width: 8, height: 8, borderRadius: 99 },
});

export default ChronologioPeekSheet;
