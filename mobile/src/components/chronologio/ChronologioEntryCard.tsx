import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import {
  presentChronologioEvent,
  presentExpenseChip,
} from '../../chronologio/eventPresentation';
import { eventAccentToken, eventCardSize } from '../../chronologio/eventCardLayout';
import { accentColorsForToken } from '../../utils/chronologioCategoryAccents';
import { resolveFieldColor } from '../../utils/fieldColors';
import WeatherReviewSummary from './WeatherReviewSummary';
import { createElevation, motion, radii, spacing } from '../../theme';

export type ChronologioEntryCardDensity = 'default' | 'compact';

type Props = {
  entry: ChronologioEntry;
  showField?: boolean;
  numberLocale: string;
  minHeight?: number;
  density?: ChronologioEntryCardDensity;
  dateStyle?: 'time' | 'dayMonth';
  /** Field-first weather pick tile (same report card family, choose grove). */
  weatherTile?: boolean;
  selected?: boolean;
  onPress: () => void;
};

const iconFor = (
  category: string,
  token: string
): React.ComponentProps<typeof Ionicons>['name'] => {
  if (token === 'warning') return 'warning-outline';
  switch (category) {
    case 'task':
      return 'checkbox-outline';
    case 'expense':
      return 'wallet-outline';
    case 'income':
      return 'trending-up-outline';
    case 'harvest':
      return 'leaf-outline';
    case 'note':
      return 'document-text-outline';
    case 'weather':
      return 'rainy-outline';
    case 'intelligence':
      return 'sparkles-outline';
    case 'lifecycle':
      return 'git-branch-outline';
    case 'collaborator':
      return 'people-outline';
    case 'photo':
      return 'camera-outline';
    default:
      return 'ellipse-outline';
  }
};

const isRealMedia = (url?: string | null) => {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('unsplash') || u.includes('picsum') || u.includes('placeholder')) return false;
  return u.includes('/uploads/') || u.startsWith('file:') || u.startsWith('content:') || u.startsWith('http');
};

const pickThumb = (entry: ChronologioEntry): string | undefined => {
  for (const m of entry.media || []) {
    const candidate = m.thumbnailUrl || m.url;
    if (isRealMedia(candidate)) return candidate!;
  }
  return undefined;
};

/**
 * Canonical Chronologio event card — type-specific bodies like the web journal.
 */
const ChronologioEntryCard: React.FC<Props> = ({
  entry,
  showField = false,
  numberLocale,
  minHeight,
  density = 'default',
  dateStyle = 'time',
  weatherTile = false,
  selected = false,
  onPress,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common']);
  const presented = presentChronologioEvent(entry, i18n.language);
  const { colors } = useTheme();
  const token = eventAccentToken(entry.category, String(entry.importance));
  const { accent: categoryAccent, soft: softBg } = accentColorsForToken(colors, token);
  const size = weatherTile ? 'compact' : density === 'compact' ? 'compact' : eventCardSize(entry);
  const compact = size === 'compact' && !weatherTile;
  const featured = size === 'featured';
  const fieldAccent = resolveFieldColor(entry.field?.color, entry.fieldId);
  const thumb = pickThumb(entry);
  const extraPhotos = Math.max(0, (entry.media?.length || 0) - 1);
  const isPeriodReview =
    entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview';
  const harvest = entry.details.harvest;
  const note = entry.details.note;
  const weather = entry.details.weather;
  const category = (entry.category || '').toLowerCase();

  const when =
    dateStyle === 'dayMonth'
      ? new Date(entry.occurredAt).toLocaleDateString(i18n.language, {
          day: 'numeric',
          month: 'short',
        })
      : new Date(entry.occurredAt).toLocaleTimeString(i18n.language, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

  const expenseChip = presentExpenseChip(entry, i18n.language);
  const taskStatus = entry.details.task?.status;
  const statusKey = taskStatus
    ? `common:taskStatus.${String(taskStatus).toLowerCase()}`
    : null;

  const resolvedMinHeight =
    minHeight ?? (weatherTile ? 88 : compact ? 44 : featured ? 72 : 52);

  if (weatherTile) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          styles.weatherTile,
          {
            backgroundColor: pressed || selected ? softBg : colors.surface,
            borderColor: selected ? fieldAccent : colors.borderLight,
            opacity: pressed ? motion.pressOpacity : 1,
            ...createElevation(colors, 'flat'),
          },
        ]}
      >
        <View style={styles.weatherPickField}>
          <View style={[styles.fieldDotLg, { backgroundColor: fieldAccent }]} />
          <Text style={[styles.weatherPickTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {entry.field?.name || presented.label}
          </Text>
        </View>
        {weather ? (
          <View style={styles.weatherPickMetrics}>
            {weather.rainfallMm != null ? (
              <View style={styles.pickMetric}>
                <Text style={[styles.pickValue, { color: colors.eventWeather }]}>
                  {weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.pickLabel, { color: colors.textTertiary }]}>
                  {t('chronologio:weatherReview.rainMm')}
                </Text>
              </View>
            ) : null}
            {weather.temperatureMin != null && weather.temperatureMax != null ? (
              <View style={styles.pickMetric}>
                <Text style={[styles.pickValue, { color: colors.textPrimary }]}>
                  {weather.temperatureMin.toFixed(0)}°–{weather.temperatureMax.toFixed(0)}°
                </Text>
                <Text style={[styles.pickLabel, { color: colors.textTertiary }]}>
                  {t('chronologio:weatherReview.tempRange')}
                </Text>
              </View>
            ) : null}
            <View style={styles.pickMetric}>
              <Text
                style={[
                  styles.pickValue,
                  {
                    color:
                      weather.waterBalanceMm == null
                        ? colors.textSecondary
                        : weather.waterBalanceMm < 0
                          ? colors.eventExpense
                          : colors.eventIncome,
                  },
                ]}
              >
                {weather.waterBalanceMm == null
                  ? '—'
                  : `${weather.waterBalanceMm.toLocaleString(numberLocale, {
                      maximumFractionDigits: 0,
                    })} mm`}
              </Text>
              <Text style={[styles.pickLabel, { color: colors.textTertiary }]}>
                {t('chronologio:weatherReview.waterBalance', {
                  defaultValue: 'Water balance',
                })}
              </Text>
            </View>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        featured && styles.cardFeatured,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.borderLight,
          minHeight: resolvedMinHeight,
          opacity: pressed ? motion.pressOpacity : 1,
          transform: [{ scale: pressed ? motion.pressScale : 1 }],
          ...(compact ? {} : createElevation(colors, featured ? 'sm' : 'flat')),
        },
      ]}
    >
      <View
        style={[
          styles.accentMark,
          compact && styles.accentMarkCompact,
          featured && styles.accentMarkFeatured,
          { backgroundColor: categoryAccent },
        ]}
      />
      <View style={[styles.row, compact && styles.rowCompact]}>
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor: softBg,
              width: compact ? 32 : featured ? 44 : 40,
              height: compact ? 32 : featured ? 44 : 40,
              borderRadius: compact ? 10 : 12,
            },
          ]}
        >
          <Ionicons
            name={iconFor(entry.category, token)}
            size={compact ? 16 : featured ? 22 : 20}
            color={categoryAccent}
          />
        </View>

        <View style={styles.body}>
          <Text
            style={[styles.meta, compact && styles.metaCompact, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {isPeriodReview
              ? t(
                  entry.eventType === 'weather.yearReview'
                    ? 'chronologio:weatherReview.yearReport'
                    : 'chronologio:weatherReview.monthReport',
                  {
                    defaultValue:
                      entry.eventType === 'weather.yearReview' ? 'Year report' : 'Month report',
                  }
                )
              : `${when} · ${presented.shortLabel}`}
            {note?.pinned ? ` · ${t('chronologio:pinned', { defaultValue: 'Pinned' })}` : ''}
          </Text>

          <Text
            style={[
              styles.title,
              compact && styles.titleCompact,
              featured && styles.titleFeatured,
              { color: colors.textPrimary },
            ]}
            numberOfLines={compact ? 1 : 2}
          >
            {presented.label}
          </Text>

          {category === 'harvest' && harvest ? (
            <View style={styles.harvestStats}>
              <View style={styles.harvestStat}>
                <Text style={[styles.statValue, { color: colors.eventHarvest }]}>
                  {harvest.oliveKg.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
                  {t('chronologio:olivesUnit')}
                </Text>
              </View>
              {harvest.oilKg != null ? (
                <View style={styles.harvestStat}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {harvest.oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
                    {t('chronologio:oilUnit')}
                  </Text>
                </View>
              ) : null}
              {harvest.oilYieldPercent != null ? (
                <View style={styles.harvestStat}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {harvest.oilYieldPercent.toLocaleString(numberLocale, {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textTertiary }]}>
                    {t('chronologio:yieldUnit')}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {category === 'expense' ||
          category === 'income' ||
          (category === 'task' && entry.amount) ? (
            <View style={styles.moneyRow}>
              {entry.amount ? (
                <Text
                  style={[
                    styles.amount,
                    {
                      color:
                        category === 'income' ? colors.eventIncome : colors.eventExpense,
                    },
                  ]}
                >
                  {category === 'income' ? '+' : category === 'expense' ? '−' : ''}
                  {formatChronologioMoney(
                    entry.amount.value,
                    entry.amount.currency,
                    numberLocale
                  )}
                </Text>
              ) : null}
              {expenseChip && expenseChip !== presented.label ? (
                <View style={[styles.chip, { backgroundColor: softBg }]}>
                  <Text style={[styles.chipText, { color: categoryAccent }]} numberOfLines={1}>
                    {expenseChip}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {category === 'task' ? (
            <>
              {entry.summary && !compact ? (
                <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={2}>
                  {entry.summary}
                </Text>
              ) : null}
              {statusKey ? (
                <View style={[styles.chip, { backgroundColor: softBg, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.chipText, { color: categoryAccent }]}>
                    {t(statusKey, { defaultValue: String(taskStatus) })}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          {category === 'note' &&
          (note?.bodyPreview || entry.summary) &&
          (note?.bodyPreview || entry.summary) !== presented.label ? (
            <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={compact ? 1 : 2}>
              {note?.bodyPreview || entry.summary}
            </Text>
          ) : null}

          {category === 'weather' ? (
            isPeriodReview && weather ? (
              <View style={{ marginTop: 8 }}>
                <WeatherReviewSummary
                  weather={weather}
                  eventType={entry.eventType}
                  numberLocale={numberLocale}
                  locale={i18n.language}
                  compact={!featured}
                />
              </View>
            ) : (
              <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={1}>
                {entry.summary ||
                  (weather?.rainfallMm != null
                    ? `${weather.rainfallMm} mm`
                    : t('chronologio:categoryLabel.weather', { defaultValue: 'Weather' }))}
              </Text>
            )
          ) : null}

          {category !== 'harvest' &&
          category !== 'expense' &&
          category !== 'income' &&
          category !== 'task' &&
          category !== 'note' &&
          category !== 'weather' &&
          entry.summary ? (
            <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={compact ? 1 : 2}>
              {entry.summary}
            </Text>
          ) : null}

          {showField && entry.field?.name ? (
            <View style={[styles.fieldRow, compact && styles.fieldRowCompact]}>
              <View style={[styles.fieldDot, { backgroundColor: fieldAccent }]} />
              <Text style={[styles.fieldName, { color: colors.textSecondary }]} numberOfLines={1}>
                {entry.field.name}
              </Text>
            </View>
          ) : null}
        </View>

        {thumb && !isPeriodReview ? (
          <View
            style={[
              styles.thumbWrap,
              {
                width: compact ? 44 : featured ? 64 : 56,
                height: compact ? 44 : featured ? 64 : 56,
                borderRadius: compact ? 10 : 12,
              },
            ]}
          >
            <Image source={{ uri: thumb }} style={styles.thumb} />
            {!compact && extraPhotos > 0 ? (
              <View style={[styles.thumbBadge, { backgroundColor: colors.charcoal + 'B8' }]}>
                <Text style={[styles.thumbBadgeText, { color: colors.onOlive }]}>+{extraPhotos}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

/** Horizontal weather field-pick cluster — same card family, choose which grove. */
export const ChronologioWeatherCluster: React.FC<{
  entries: ChronologioEntry[];
  numberLocale: string;
  onPressEntry: (entry: ChronologioEntry) => void;
}> = ({ entries, numberLocale, onPressEntry }) => {
  const { t } = useTranslation('chronologio');
  const { colors } = useTheme();
  if (!entries.length) return null;
  return (
    <View style={styles.cluster}>
      <Text style={[styles.clusterKicker, { color: colors.textTertiary }]}>
        {t('weatherReview.pickGrove', { defaultValue: 'Choose a grove' })}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.clusterRow}
      >
        {entries.map(entry => (
          <View key={entry.id} style={styles.clusterTile}>
            <ChronologioEntryCard
              entry={entry}
              showField
              numberLocale={numberLocale}
              weatherTile
              onPress={() => onPressEntry(entry)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 16,
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  cardCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingLeft: 14,
    marginBottom: 8,
    borderRadius: 14,
  },
  cardFeatured: {
    paddingVertical: 16,
    borderRadius: 20,
  },
  accentMark: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 0.9,
  },
  accentMarkCompact: { top: 10, bottom: 10 },
  accentMarkFeatured: { width: 4, top: 16, bottom: 16 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowCompact: { gap: 10, alignItems: 'center' },
  iconTile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, minWidth: 0, gap: 4 },
  meta: {
    fontSize: 11,
    fontWeight: '650' as '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metaCompact: { fontSize: 10, letterSpacing: 0.3 },
  title: { fontWeight: '650' as '600', fontSize: 16, lineHeight: 22 },
  titleCompact: { fontSize: 15, lineHeight: 20 },
  titleFeatured: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  summary: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  harvestStats: { flexDirection: 'row', gap: 14, marginTop: 4 },
  harvestStat: { gap: 1 },
  statValue: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  moneyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 2 },
  amount: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chip: { borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '700' },
  related: { fontSize: 12, flexShrink: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  fieldRowCompact: { marginTop: 2 },
  fieldDot: { width: 7, height: 7, borderRadius: 99 },
  fieldDotLg: { width: 10, height: 10, borderRadius: 99 },
  fieldName: { fontSize: 12, fontWeight: '450' as '400', flexShrink: 1 },
  thumbWrap: { overflow: 'hidden', position: 'relative', flexShrink: 0 },
  thumb: { width: '100%', height: '100%' },
  thumbBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  thumbBadgeText: { fontSize: 10, fontWeight: '700' },
  weatherTile: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    minWidth: 148,
    gap: 10,
  },
  weatherPickField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherPickTitle: { fontWeight: '700', fontSize: 15, flexShrink: 1 },
  weatherPickMetrics: { flexDirection: 'row', gap: 10 },
  pickMetric: { gap: 1, minWidth: 44 },
  pickValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pickLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  cluster: { marginBottom: 12, gap: 8 },
  clusterKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingLeft: 2,
  },
  clusterRow: { gap: 10, paddingRight: 8 },
  clusterTile: { width: 168 },
});

export default ChronologioEntryCard;
