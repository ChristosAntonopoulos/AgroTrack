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
  presentActorName,
} from '../../chronologio/eventPresentation';
import { eventAccentToken, eventCardSize } from '../../chronologio/eventCardLayout';
import { accentColorsForToken } from '../../utils/chronologioCategoryAccents';
import { resolveFieldColor } from '../../utils/fieldColors';
import WeatherReviewSummary from './WeatherReviewSummary';
import { resolvePublicAssetUrl } from '../../config/env';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
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
  return (
    u.includes('/uploads/') ||
    u.startsWith('file:') ||
    u.startsWith('content:') ||
    u.startsWith('http') ||
    u.startsWith('/')
  );
};

const pickGallery = (entry: ChronologioEntry, limit = 3): string[] => {
  const out: string[] = [];
  for (const m of entry.media || []) {
    if (/audio|voice|document/i.test(m.type || '')) continue;
    const candidate = m.thumbnailUrl || m.url;
    if (!isRealMedia(candidate)) continue;
    const uri = resolvePublicAssetUrl(candidate) || candidate;
    if (!uri || out.includes(uri)) continue;
    out.push(uri);
    if (out.length >= limit) break;
  }
  return out;
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
  const actorName = presentActorName(entry.actor?.displayName, i18n.language);
  const { colors } = useTheme();
  const token = eventAccentToken(entry.category, String(entry.importance));
  const { accent: categoryAccent, soft: softBg } = accentColorsForToken(colors, token);
  const size = weatherTile ? 'compact' : density === 'compact' ? 'compact' : eventCardSize(entry);
  const compact = size === 'compact' && !weatherTile;
  const featured = size === 'featured';
  const fieldAccent = resolveFieldColor(entry.field?.color, entry.fieldId);
  const isPeriodReview =
    entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview';
  const harvest = entry.details.harvest;
  const note = entry.details.note;
  const weather = entry.details.weather;
  const category = (entry.category || '').toLowerCase();
  const fieldLabel = entry.field?.name ? friendlyFieldLabel(entry.field.name) : '';
  const gallery = !compact && !isPeriodReview ? pickGallery(entry, 3) : pickGallery(entry, 1);
  const showInlineGallery = !compact && !isPeriodReview && gallery.length > 0;
  const thumb = gallery[0];
  const extraPhotos = Math.max(0, (entry.media?.length || 0) - gallery.length);

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
            {fieldLabel || presented.label}
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
              width: compact ? 28 : featured ? 36 : 32,
              height: compact ? 28 : featured ? 36 : 32,
              borderRadius: compact ? 8 : 10,
            },
          ]}
        >
          <Ionicons
            name={iconFor(entry.category, token)}
            size={compact ? 14 : featured ? 18 : 16}
            color={categoryAccent}
          />
        </View>

        <View style={styles.body}>
          <Text style={[styles.meta, compact && styles.metaCompact]} numberOfLines={1}>
            <Text style={{ color: colors.textTertiary, fontWeight: '500' }}>{when}</Text>
            <Text style={{ color: colors.textTertiary }}> · </Text>
            <Text style={{ color: categoryAccent, fontWeight: '700' }}>
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
                : presented.shortLabel}
            </Text>
            {note?.pinned ? (
              <Text style={{ color: colors.textTertiary }}>
                {` · ${t('chronologio:pinned', { defaultValue: 'Pinned' })}`}
              </Text>
            ) : null}
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
                <Text
                  style={[styles.statusInline, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {t(statusKey, { defaultValue: String(taskStatus) })}
                </Text>
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

          {showField && fieldLabel ? (
            <View style={[styles.fieldRow, compact && styles.fieldRowCompact]}>
              <View style={[styles.fieldDot, { backgroundColor: fieldAccent }]} />
              <Text style={[styles.fieldName, { color: colors.textSecondary }]} numberOfLines={1}>
                {fieldLabel}
              </Text>
            </View>
          ) : null}

          {actorName && !compact ? (
            <Text style={[styles.actorName, { color: colors.textTertiary }]} numberOfLines={1}>
              {t('chronologio:fromActor', { name: actorName })}
            </Text>
          ) : null}

          {showInlineGallery && gallery.length > 0 ? (
            <View style={styles.mediaRow}>
              {gallery.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.mediaThumb} />
              ))}
              {extraPhotos > 0 ? (
                <View style={[styles.mediaMore, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={[styles.mediaMoreText, { color: colors.textSecondary }]}>
                    +{extraPhotos}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {thumb && !isPeriodReview && !showInlineGallery ? (
          <View
            style={[
              styles.thumbWrap,
              {
                width: compact ? 44 : 56,
                height: compact ? 44 : 56,
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
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingLeft: 14,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  cardCompact: {
    paddingVertical: 9,
    paddingHorizontal: 11,
    paddingLeft: 12,
    marginBottom: 10,
    borderRadius: radii.card,
  },
  cardFeatured: {
    paddingVertical: 14,
    borderRadius: radii.card,
  },
  accentMark: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 2,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 0.75,
  },
  accentMarkCompact: { top: 9, bottom: 9 },
  accentMarkFeatured: { width: 2, top: 14, bottom: 14 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowCompact: { gap: 8, alignItems: 'center' },
  iconTile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, minWidth: 0, gap: 3 },
  meta: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaCompact: { fontSize: 10, letterSpacing: 0.3 },
  title: { fontWeight: '600', fontSize: 16, lineHeight: 21 },
  titleCompact: { fontSize: 15, lineHeight: 20 },
  titleFeatured: { fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  summary: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  statusInline: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  harvestStats: { flexDirection: 'row', gap: 14, marginTop: 4 },
  harvestStat: { gap: 1 },
  statValue: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  moneyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chip: { borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '600' },
  related: { fontSize: 12, flexShrink: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  fieldRowCompact: { marginTop: 2 },
  fieldDot: { width: 7, height: 7, borderRadius: 99 },
  fieldDotLg: { width: 10, height: 10, borderRadius: 99 },
  fieldName: { fontSize: 12, fontWeight: '400', flexShrink: 1 },
  actorName: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  mediaThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#1f2a1c',
  },
  mediaMore: {
    width: 72,
    height: 72,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaMoreText: { fontSize: 13, fontWeight: '700' },
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
    borderRadius: radii.card,
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
