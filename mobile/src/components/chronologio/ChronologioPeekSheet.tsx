import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { spacing, typography } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import type {
  ChronologioEntry,
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import {
  majorMonthsForYear,
  monthChapterFacts,
  periodEventCount,
  weatherFactBits,
  yearFixedMetrics,
} from '../../utils/summaryFacts';
import { resolveFieldColor } from '../../utils/fieldColors';
import { resolveChronologioCategoryAccent } from '../../utils/chronologioCategoryAccents';
import CardAccentFades from '../common/CardAccentFades';
import WeatherReviewSummary from './WeatherReviewSummary';

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

const isRealMedia = (url?: string | null) => {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('unsplash') || u.includes('picsum') || u.includes('placeholder')) return false;
  return u.includes('/uploads/') || u.startsWith('file:') || u.startsWith('content:');
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
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const tt = (key: string, opts?: Record<string, string | number>) =>
    t(key, opts as Record<string, unknown>);

  const entry = peek?.mode === 'event' ? peek.entry : null;
  const weather = entry?.details.weather;
  const isPeriodReview =
    entry?.eventType === 'weather.monthReview' || entry?.eventType === 'weather.yearReview';
  const fieldAccent = entry
    ? resolveFieldColor(entry.field?.color, entry.fieldId)
    : colors.primary;

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

  const headerTitle =
    peek?.mode === 'event'
      ? peek.entry.title
      : peek?.mode === 'month'
        ? monthTitle(peek.summary)
        : peek?.mode === 'year'
          ? String(peek.summary.periodYear)
          : peek?.mode === 'monthWeather'
            ? weatherMonthTitle
            : '';

  const headerMeta =
    peek?.mode === 'event'
      ? t(`categoryLabel.${peek.entry.category}`, { defaultValue: peek.entry.category })
      : peek?.mode === 'month'
        ? t('living.peekMonth')
        : peek?.mode === 'year'
          ? t('living.peekYear')
          : peek?.mode === 'monthWeather'
            ? t('living.peekMonthWeather')
            : '';

  const openFull = () => {
    if (!entry) return;
    onClose();
    if (entry.sourceType === 'Task') {
      navigation.navigate('TaskDetail', { taskId: entry.sourceId });
    } else if (entry.sourceType === 'Expense') {
      navigation.navigate('Money', { fieldId: entry.fieldId });
    } else if (entry.sourceType === 'Harvest') {
      navigation.navigate('FieldDetail', { fieldId: entry.fieldId, focus: 'harvest' });
    } else if (entry.sourceType === 'WeatherReview') {
      navigation.navigate('FieldWeatherVegetation', { fieldId: entry.fieldId });
    }
  };

  return (
    <Modal visible={Boolean(peek)} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceElevated,
              borderTopColor: fieldAccent,
            },
          ]}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{headerMeta}</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{headerTitle}</Text>

            {peek?.mode === 'event' ? (
              <>
                <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
                  {`${new Date(peek.entry.occurredAt).toLocaleDateString(i18n.language, {
                    dateStyle: 'long',
                  })} · ${new Date(peek.entry.occurredAt).toLocaleTimeString(i18n.language, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}`}
                </Text>
                {peek.entry.field?.name ? (
                  <View style={styles.fieldChip}>
                    <View
                      style={[
                        styles.fieldDot,
                        {
                          backgroundColor: resolveFieldColor(
                            peek.entry.field.color,
                            peek.entry.fieldId
                          ),
                        },
                      ]}
                    />
                    <Text style={{ color: colors.textSecondary, flexShrink: 1 }} numberOfLines={1}>
                      {peek.entry.field.name}
                    </Text>
                  </View>
                ) : null}

                {peek.entry.details.harvest ? (
                  <View style={styles.harvestRow}>
                    <View style={styles.harvestStat}>
                      <Text style={[styles.harvestValue, { color: colors.textPrimary }]}>
                        {peek.entry.details.harvest.oliveKg.toLocaleString(numberLocale, {
                          maximumFractionDigits: 0,
                        })}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {t('olivesUnit')}
                      </Text>
                    </View>
                    {peek.entry.details.harvest.oilKg != null ? (
                      <View style={styles.harvestStat}>
                        <Text style={[styles.harvestValue, { color: colors.textPrimary }]}>
                          {peek.entry.details.harvest.oilKg.toLocaleString(numberLocale, {
                            maximumFractionDigits: 1,
                          })}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {t('oilUnit')}
                        </Text>
                      </View>
                    ) : null}
                    {peek.entry.details.harvest.oilYieldPercent != null ? (
                      <View style={styles.harvestStat}>
                        <Text style={[styles.harvestValue, { color: colors.textPrimary }]}>
                          {peek.entry.details.harvest.oilYieldPercent}%
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {t('yieldUnit')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {isPeriodReview && weather ? (
                  <View style={{ marginBottom: 12 }}>
                    <WeatherReviewSummary
                      weather={weather}
                      eventType={peek.entry.eventType}
                      numberLocale={numberLocale}
                      locale={i18n.language}
                      showSource
                      primaryColor={colors.primary}
                      textPrimary={colors.textPrimary}
                      textSecondary={colors.textSecondary}
                      textTertiary={colors.textTertiary}
                    />
                  </View>
                ) : null}

                {peek.entry.amount ? (
                  <Text style={[styles.amount, { color: colors.textPrimary }]}>
                    {formatChronologioMoney(
                      peek.entry.amount.value,
                      peek.entry.amount.currency,
                      numberLocale
                    )}
                  </Text>
                ) : null}

                {!isPeriodReview &&
                (peek.entry.summary || peek.entry.details.note?.bodyPreview) ? (
                  <Text style={{ color: colors.textPrimary, marginBottom: 12 }}>
                    {peek.entry.summary || peek.entry.details.note?.bodyPreview}
                  </Text>
                ) : null}

                <View style={styles.facts}>
                  <Text style={{ color: colors.textSecondary }}>
                    {t('living.field')}: {peek.entry.field?.name || '—'}
                  </Text>
                  {peek.entry.actor?.displayName ? (
                    <Text style={{ color: colors.textSecondary }}>
                      {t('living.actor')}: {peek.entry.actor.displayName}
                    </Text>
                  ) : null}
                  {peek.entry.details.harvest?.mill ? (
                    <Text style={{ color: colors.textSecondary }}>
                      {t('mill')}: {peek.entry.details.harvest.mill}
                    </Text>
                  ) : null}
                  {peek.entry.details.harvest?.workers ? (
                    <Text style={{ color: colors.textSecondary }}>
                      {t('workers')}: {peek.entry.details.harvest.workers}
                    </Text>
                  ) : null}
                </View>

                {(peek.entry.media || []).filter((m) =>
                  isRealMedia(m.url || m.thumbnailUrl)
                ).length > 0 ? (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      {t('living.photos')}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {(peek.entry.media || [])
                        .filter((m) => isRealMedia(m.url || m.thumbnailUrl))
                        .map((m) => (
                          <Image
                            key={m.id}
                            source={{ uri: m.url || m.thumbnailUrl }}
                            style={styles.photo}
                          />
                        ))}
                    </ScrollView>
                  </View>
                ) : null}
              </>
            ) : null}

            {peek?.mode === 'month' ? (
              <>
                <View style={styles.metricsRow}>
                  {yearFixedMetrics(peek.summary, numberLocale, tt).map((m) => (
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
                    {peek.summary.temperatureMax != null ||
                    peek.summary.temperatureMin != null ? (
                      <Text style={{ color: colors.textTertiary, marginTop: 4 }}>
                        {peek.summary.temperatureMin != null
                          ? `${Math.round(peek.summary.temperatureMin)}°`
                          : '—'}
                        {' – '}
                        {peek.summary.temperatureMax != null
                          ? `${Math.round(peek.summary.temperatureMax)}°`
                          : '—'}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {(peek.summary.highlightTitles?.length ||
                  peek.summary.observationHighlight) && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      {t('living.peekHighlights')}
                    </Text>
                    <Text style={{ color: colors.textPrimary }}>
                      {(peek.summary.highlightTitles || []).filter(Boolean).slice(0, 2).join(' · ') ||
                        peek.summary.observationHighlight}
                    </Text>
                    {peek.summary.observationHighlight &&
                    peek.summary.highlightTitles?.length ? (
                      <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                        {peek.summary.observationHighlight}
                      </Text>
                    ) : null}
                  </View>
                )}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {t('living.peekRecent')}
                  </Text>
                  {peek.loadingRecent ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
                  ) : peek.recent.length === 0 ? (
                    <Text style={{ color: colors.textSecondary }}>{t('living.emptyPeriod')}</Text>
                  ) : (
                    peek.recent.slice(0, 5).map((e) => (
                      <TouchableOpacity
                        key={e.id}
                        onPress={() => onSelectRecent?.(e)}
                        style={{ marginTop: 10 }}
                      >
                        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{e.title}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {new Date(e.occurredAt).toLocaleDateString(i18n.language, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </>
            ) : null}

            {peek?.mode === 'year' ? (
              <>
                <View style={styles.metricsRow}>
                  {yearFixedMetrics(peek.summary, numberLocale, tt).map((m) => (
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
                {(peek.summary.highlightTitles || []).filter(Boolean).length > 0 ? (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      {t('living.peekHighlights')}
                    </Text>
                    <Text style={{ color: colors.textPrimary }}>
                      {(peek.summary.highlightTitles || []).filter(Boolean).slice(0, 3).join(' · ')}
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
                    majorMonthsForYear(peek.months).map((m) => (
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
              <View style={{ gap: 12 }}>
                {peek.loading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : peek.reviews.length === 0 ? (
                  <Text style={{ color: colors.textSecondary }}>
                    {t('living.emptyMonthWeather')}
                  </Text>
                ) : (
                  peek.reviews.map((review) => {
                    const w = review.details.weather;
                    if (!w) return null;
                    const fieldAccent = resolveFieldColor(review.field?.color, review.fieldId);
                    const categoryAccent = resolveChronologioCategoryAccent(
                      review.category,
                      String(review.importance)
                    );
                    return (
                      <TouchableOpacity
                        key={review.id}
                        style={[
                          styles.weatherBlock,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.surfaceElevated,
                            borderLeftColor: fieldAccent,
                          },
                        ]}
                        onPress={() => onSelectRecent?.(review)}
                      >
                        <CardAccentFades fieldColor={fieldAccent} endColor={categoryAccent} />
                        {review.field?.name ? (
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontWeight: '700',
                              fontSize: 12,
                              marginBottom: 8,
                              zIndex: 1,
                            }}
                          >
                            {review.field.name}
                          </Text>
                        ) : null}
                        <View style={{ zIndex: 1 }}>
                          <WeatherReviewSummary
                            weather={w}
                            eventType={review.eventType}
                            numberLocale={numberLocale}
                            locale={i18n.language}
                            showSource
                            primaryColor={colors.primary}
                            textPrimary={colors.textPrimary}
                            textSecondary={colors.textSecondary}
                            textTertiary={colors.textTertiary}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            ) : null}
          </ScrollView>

          {peek?.mode === 'event' ? (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, minHeight: Math.max(tapMin, 44) },
              ]}
              onPress={openFull}
            >
              <Text style={styles.primaryBtnText}>
                {isPeriodReview ? t('weatherReview.openCharts') : t('living.openFull')}
              </Text>
            </TouchableOpacity>
          ) : null}
          {peek?.mode === 'month' ? (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, minHeight: Math.max(tapMin, 44) },
              ]}
              onPress={() => onDrillToDays?.(peek.summary.year, peek.summary.month)}
            >
              <Text style={styles.primaryBtnText}>
                {t('living.drillToDays', { month: monthTitle(peek.summary) })}
              </Text>
            </TouchableOpacity>
          ) : null}
          {peek?.mode === 'year' ? (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, minHeight: Math.max(tapMin, 44) },
              ]}
              onPress={() => onDrillToMonths?.(peek.summary.periodYear)}
            >
              <Text style={styles.primaryBtnText}>
                {t('living.drillToMonths', { year: peek.summary.periodYear })}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.closeBtn,
              {
                borderColor: colors.border,
                minHeight: Math.max(tapMin, 44),
              },
            ]}
            onPress={onClose}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
              {t('common:close', { defaultValue: 'Close' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 3,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  meta: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  title: { ...typography.styles.h2, fontWeight: '800', marginBottom: 4 },
  fieldChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  fieldDot: { width: 8, height: 8, borderRadius: 99 },
  harvestRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  harvestStat: { gap: 2 },
  harvestValue: { fontSize: 20, fontWeight: '800' },
  amount: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  facts: { gap: 4, marginBottom: 8 },
  section: { marginTop: 14, gap: 4 },
  sectionTitle: { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  metricCell: { minWidth: '28%', flexGrow: 1 },
  photo: { width: 140, height: 100, borderRadius: 10, marginRight: 8 },
  weatherBlock: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  primaryBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  closeBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: 'center',
  },
});

export default ChronologioPeekSheet;
