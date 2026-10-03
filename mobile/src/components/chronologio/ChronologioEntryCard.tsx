import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioEntry } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import {
  presentChronologioEvent,
  presentExpenseChip,
  presentActorName,
  presentMetaLabel,
} from '../../chronologio/eventPresentation';
import { eventAccentToken, eventCardSize } from '../../chronologio/eventCardLayout';
import { accentColorsForToken } from '../../utils/chronologioCategoryAccents';
import { hexToRgba } from '../../utils/hexToRgba';
import { resolveFieldColor } from '../../utils/fieldColors';
import WeatherMonthSnapshot from './WeatherMonthSnapshot';
import HarvestDayJourney from './HarvestDayJourney';
import { resolvePublicAssetUrl } from '../../config/env';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { appFonts, createElevation, motion, radii, spacing } from '../../theme';
import {
  extremeKindFromEventType,
  extremeMetricLine,
  extremePalette,
  extremeVisualTone,
  formatExtremeDateRange,
  isWeatherExtremeEventType,
} from '../../chronologio/weatherExtreme';

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
  /** Inside a labeled report cluster — skip repeating the report title. */
  embeddedReport?: boolean;
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
  embeddedReport = false,
  selected = false,
  onPress,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'common']);
  const presented = presentChronologioEvent(entry, i18n.language);
  const actorName = presentActorName(entry.actor?.displayName, i18n.language);
  const { colors } = useTheme();
  const token = eventAccentToken(entry.category, String(entry.importance));
  const { accent: categoryAccent, soft: softBg } = accentColorsForToken(colors, token);
  const isPeriodReview =
    entry.eventType === 'weather.monthReview' || entry.eventType === 'weather.yearReview';
  const isExtreme = isWeatherExtremeEventType(entry.eventType);

  if (isExtreme && !weatherTile) {
    const weather = entry.details.weather;
    const kind =
      weather?.extremeKind || extremeKindFromEventType(entry.eventType) || 'heatwave';
    const tone = extremeVisualTone(kind);
    const palette = extremePalette(tone);
    const kindLabel = t(`chronologio:extremeWeather.kinds.${kind}`, {
      defaultValue: presented.label,
    });
    const period = formatExtremeDateRange(
      weather?.extremeStartDate,
      weather?.extremeEndDate,
      i18n.language
    );
    const streak =
      weather?.streakDays != null && weather.streakDays > 0
        ? t('chronologio:extremeWeather.days', { count: weather.streakDays })
        : null;
    const metrics = extremeMetricLine(weather, numberLocale, kind);
    const fieldChip =
      showField && entry.field?.name ? friendlyFieldLabel(entry.field.name) : null;
    const detail = [streak, metrics, period].filter(Boolean).join(' · ');
    const iconName =
      tone === 'heat'
        ? 'flame'
        : tone === 'drought'
          ? 'sunny'
          : tone === 'rain'
            ? 'rainy'
            : tone === 'frost'
              ? 'snow'
              : 'thermometer-outline';

    return (
      <View style={styles.extremeWrap} pointerEvents="none">
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={[kindLabel, detail, fieldChip].filter(Boolean).join(', ')}
          style={[styles.extremeCard, { backgroundColor: palette.fill }]}
        >
          <View style={[styles.extremeIcon, { backgroundColor: palette.iconBg }]}>
            <Ionicons name={iconName} size={14} color="#fff" />
          </View>
          <View style={styles.extremeCopy}>
            <Text style={[styles.extremeKind, { color: palette.ink }]}>{kindLabel}</Text>
            {detail ? (
              <Text style={[styles.extremeMeta, { color: palette.ink }]}>{detail}</Text>
            ) : null}
            {fieldChip ? (
              <Text style={[styles.extremeField, { color: palette.ink }]} numberOfLines={1}>
                {fieldChip}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  const size = weatherTile
    ? 'compact'
    : density === 'compact'
      ? 'compact'
      : eventCardSize(entry);
  const compact = size === 'compact' && !weatherTile;
  const featured = size === 'featured';
  const fieldAccent = resolveFieldColor(entry.field?.color, entry.fieldId);
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
    const isYear = entry.eventType === 'weather.yearReview';
    const reportLabel = t(
      isYear ? 'chronologio:weatherReview.yearReport' : 'chronologio:weatherReview.monthReport',
      { defaultValue: isYear ? 'Yearly report' : 'Monthly report' }
    );
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={[reportLabel, presented.label, fieldLabel].filter(Boolean).join(', ')}
        style={({ pressed }) => [
          styles.reportTile,
          {
            backgroundColor: embeddedReport ? softBg : colors.surfaceElevated,
            borderColor: selected
              ? fieldAccent
              : hexToRgba(categoryAccent, embeddedReport ? 0.28 : 0.35),
            opacity: pressed ? motion.pressOpacity : 1,
            ...createElevation(colors, 'sm'),
          },
        ]}
      >
        {!embeddedReport ? (
          <View style={[styles.reportBadge, { backgroundColor: hexToRgba(categoryAccent, 0.14) }]}>
            <Ionicons name="calendar-outline" size={13} color={categoryAccent} />
            <Text style={[styles.reportBadgeText, { color: categoryAccent }]} numberOfLines={1}>
              {reportLabel}
            </Text>
          </View>
        ) : null}

        {!embeddedReport ? (
          <Text style={[styles.reportPeriod, { color: colors.textPrimary }]} numberOfLines={1}>
            {presented.label}
          </Text>
        ) : null}

        <View style={styles.weatherPickField}>
          <View style={[styles.fieldDotLg, { backgroundColor: fieldAccent }]} />
          <Text
            style={[
              embeddedReport ? styles.weatherPickTitle : styles.reportField,
              { color: embeddedReport ? colors.textPrimary : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {fieldLabel || presented.label}
          </Text>
        </View>

        {weather ? (
          <View
            style={[
              styles.weatherPickMetrics,
              styles.reportMetrics,
              { borderTopColor: hexToRgba(categoryAccent, 0.16) },
            ]}
          >
            {weather.rainfallMm != null ? (
              <View style={styles.pickMetric}>
                <Text style={[styles.pickValue, { color: colors.eventWeather }]} numberOfLines={1}>
                  {weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
                  <Text style={styles.pickUnit}> mm</Text>
                </Text>
                <Text style={[styles.pickLabel, { color: colors.textTertiary }]} numberOfLines={2}>
                  {t('chronologio:weatherReview.rainfall')}
                </Text>
              </View>
            ) : null}
            {weather.temperatureMin != null && weather.temperatureMax != null ? (
              <View style={styles.pickMetric}>
                <Text style={[styles.pickValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {weather.temperatureMin.toFixed(0)}–{weather.temperatureMax.toFixed(0)}°
                </Text>
                <Text style={[styles.pickLabel, { color: colors.textTertiary }]} numberOfLines={2}>
                  {t('chronologio:weatherReview.tempShort', { defaultValue: 'Temperature' })}
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
                numberOfLines={1}
              >
                {weather.waterBalanceMm == null
                  ? '—'
                  : `${weather.waterBalanceMm.toLocaleString(numberLocale, {
                      maximumFractionDigits: 0,
                    })}`}
                {weather.waterBalanceMm != null ? <Text style={styles.pickUnit}> mm</Text> : null}
              </Text>
              <Text style={[styles.pickLabel, { color: colors.textTertiary }]} numberOfLines={2}>
                {t('chronologio:weatherReview.waterShort', { defaultValue: 'Water' })}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.reportCtaRow}>
          <Text style={[styles.reportCta, { color: categoryAccent }]}>
            {t('chronologio:weatherReview.openReport', { defaultValue: 'Open report' })}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={categoryAccent} />
        </View>
      </Pressable>
    );
  }

  if (isPeriodReview) {
    const isYear = entry.eventType === 'weather.yearReview';
    const reportLabel = t(
      isYear ? 'chronologio:weatherReview.yearReport' : 'chronologio:weatherReview.monthReport',
      { defaultValue: isYear ? 'Yearly report' : 'Monthly report' }
    );
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={[reportLabel, presented.label, fieldLabel].filter(Boolean).join(', ')}
        style={({ pressed }) => [
          styles.reportCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: hexToRgba(categoryAccent, 0.38),
            opacity: pressed ? motion.pressOpacity : 1,
            transform: [{ scale: pressed ? motion.pressScale : 1 }],
            ...createElevation(colors, 'sm'),
          },
        ]}
      >
        <View style={[styles.reportCardHeader, { backgroundColor: hexToRgba(categoryAccent, 0.12) }]}>
          <View style={[styles.reportHeaderIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="document-text-outline" size={18} color={categoryAccent} />
          </View>
          <View style={styles.reportHeaderCopy}>
            <Text style={[styles.reportBadgeText, { color: categoryAccent }]}>{reportLabel}</Text>
            <Text style={[styles.reportPeriod, { color: colors.textPrimary }]} numberOfLines={1}>
              {presented.label}
            </Text>
          </View>
        </View>
        {showField && fieldLabel ? (
          <View style={[styles.weatherPickField, { paddingHorizontal: 14, paddingTop: 10 }]}>
            <View style={[styles.fieldDotLg, { backgroundColor: fieldAccent }]} />
            <Text style={[styles.reportField, { color: colors.textSecondary }]} numberOfLines={1}>
              {fieldLabel}
            </Text>
          </View>
        ) : null}
        {weather ? (
          <View style={{ paddingHorizontal: 10, paddingBottom: 4 }}>
            <WeatherMonthSnapshot
              weather={weather}
              eventType={entry.eventType}
              numberLocale={numberLocale}
              locale={i18n.language}
              variant="card"
            />
          </View>
        ) : null}
        <View style={[styles.reportCtaRow, { paddingHorizontal: 14, paddingBottom: 12 }]}>
          <Text style={[styles.reportCta, { color: categoryAccent }]}>
            {t('chronologio:weatherReview.openReport', { defaultValue: 'Open report' })}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={categoryAccent} />
        </View>
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
          backgroundColor: pressed ? colors.surfaceMuted : colors.surfaceElevated,
          borderColor: selected
            ? hexToRgba(categoryAccent, 0.62)
            : hexToRgba(categoryAccent, 0.4),
          minHeight: resolvedMinHeight,
          opacity: pressed ? motion.pressOpacity : 1,
          transform: [{ scale: pressed ? motion.pressScale : 1 }],
          ...createElevation(colors, 'sm'),
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
                ? presentMetaLabel(
                    t(
                      entry.eventType === 'weather.yearReview'
                        ? 'chronologio:weatherReview.yearReport'
                        : 'chronologio:weatherReview.monthReport',
                      {
                        defaultValue:
                          entry.eventType === 'weather.yearReview' ? 'Year report' : 'Month report',
                      }
                    ),
                    i18n.language
                  )
                : presentMetaLabel(presented.shortLabel, i18n.language)}
            </Text>
            {note?.pinned ? (
              <Text style={{ color: colors.textTertiary }}>
                {` · ${t('chronologio:pinned', { defaultValue: 'Pinned' })}`}
              </Text>
            ) : null}
          </Text>

          {presented.label &&
          presented.label.toLowerCase() !== presented.shortLabel.toLowerCase() ? (
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
          ) : null}

          {category === 'harvest' && harvest ? (
            <HarvestDayJourney
              compact
              harvest={harvest}
              numberLocale={numberLocale}
              fieldName={entry.field?.name}
              fieldAccent={fieldAccent}
            />
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
            <Text style={[styles.summary, { color: colors.textSecondary }]} numberOfLines={1}>
              {entry.summary ||
                (weather?.rainfallMm != null
                  ? `${weather.rainfallMm} mm`
                  : t('chronologio:categoryLabel.weather', { defaultValue: 'Weather' }))}
            </Text>
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

/** Monthly / yearly weather report — compact grove chips when several fields share the month. */
export const ChronologioWeatherCluster: React.FC<{
  entries: ChronologioEntry[];
  numberLocale: string;
  onPressEntry: (entry: ChronologioEntry) => void;
}> = ({ entries, numberLocale, onPressEntry }) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors } = useTheme();
  if (!entries.length) return null;
  const several = entries.length > 1;
  const lead = entries[0];
  const isYear = lead.eventType === 'weather.yearReview';
  const reportLabel = t(
    isYear ? 'weatherReview.yearReport' : 'weatherReview.monthReport',
    { defaultValue: isYear ? 'Yearly report' : 'Monthly report' }
  );
  const periodTitle = presentChronologioEvent(lead, i18n.language).label;

  return (
    <View
      style={[
        styles.cluster,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: hexToRgba(colors.eventWeather, 0.28),
        },
      ]}
    >
      <View style={[styles.clusterHeader, { backgroundColor: hexToRgba(colors.eventWeather, 0.1) }]}>
        <View style={[styles.clusterHeaderIcon, { backgroundColor: colors.surface }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.eventWeather} />
        </View>
        <View style={styles.clusterHeaderCopy}>
          <Text style={[styles.clusterBadge, { color: colors.eventWeather }]}>{reportLabel}</Text>
          <Text style={[styles.clusterTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {periodTitle}
          </Text>
        </View>
      </View>

      {several ? (
        <View style={styles.clusterPick}>
          <Text style={[styles.clusterHint, { color: colors.textSecondary }]}>
            {t('weatherReview.pickGrove', { defaultValue: 'Choose a grove' })}
          </Text>
          <View style={styles.groveGrid}>
            {entries.map((entry) => {
              const weather = entry.details.weather;
              const fieldAccent = resolveFieldColor(entry.field?.color, entry.fieldId);
              const name = entry.field?.name
                ? friendlyFieldLabel(entry.field.name)
                : presentChronologioEvent(entry, i18n.language).label;
              const rain =
                weather?.rainfallMm != null
                  ? `${weather.rainfallMm.toLocaleString(numberLocale, {
                      maximumFractionDigits: 0,
                    })} mm`
                  : null;
              return (
                <Pressable
                  key={entry.id}
                  onPress={() => onPressEntry(entry)}
                  accessibilityRole="button"
                  accessibilityLabel={name}
                  style={({ pressed }) => [
                    styles.groveChip,
                    {
                      backgroundColor: hexToRgba(fieldAccent, 0.1),
                      borderColor: hexToRgba(fieldAccent, 0.32),
                      opacity: pressed ? motion.pressOpacity : 1,
                    },
                  ]}
                >
                  <View style={[styles.groveChipDot, { backgroundColor: fieldAccent }]} />
                  <View style={styles.groveChipCopy}>
                    <Text style={[styles.groveChipName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {name}
                    </Text>
                    {rain ? (
                      <Text style={[styles.groveChipMeta, { color: colors.eventWeather }]} numberOfLines={1}>
                        {rain}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.clusterBody}>
          <ChronologioEntryCard
            entry={lead}
            showField
            numberLocale={numberLocale}
            weatherTile
            embeddedReport
            onPress={() => onPressEntry(lead)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
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
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 1,
  },
  accentMarkCompact: { top: 9, bottom: 9 },
  accentMarkFeatured: { width: 3, top: 14, bottom: 14 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowCompact: { gap: 8, alignItems: 'center' },
  iconTile: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  body: { flex: 1, minWidth: 0, gap: 3 },
  meta: {
    fontFamily: appFonts.semibold,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  metaCompact: { fontSize: 10, letterSpacing: 0.3 },
  title: {
    fontFamily: appFonts.semibold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.15,
  },
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
    borderWidth: 1,
    padding: 14,
    gap: 12,
    alignSelf: 'stretch',
  },
  reportTile: {
    borderRadius: radii.card,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
    alignSelf: 'stretch',
  },
  reportCard: {
    borderRadius: radii.card,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  reportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reportHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportHeaderCopy: { flex: 1, minWidth: 0, gap: 2 },
  reportBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  reportBadgeText: {
    fontFamily: appFonts.bold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  reportPeriod: {
    fontFamily: appFonts.bold,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  reportField: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  reportMetrics: {
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reportCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  reportCta: {
    fontFamily: appFonts.semibold,
    fontSize: 13,
    fontWeight: '650',
  },
  weatherPickField: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weatherPickTitle: { fontWeight: '700', fontSize: 16, flexShrink: 1 },
  weatherPickMetrics: { flexDirection: 'row', gap: 8 },
  extremeWrap: {
    alignSelf: 'stretch',
    maxWidth: '100%',
    marginVertical: 2,
  },
  extremeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  extremeCopy: { flex: 1, minWidth: 0, gap: 2 },
  extremeIcon: {
    width: 26,
    height: 26,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  extremeKind: { fontSize: 14, fontWeight: '700' },
  extremeMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    opacity: 0.95,
  },
  extremeField: { fontSize: 12, fontWeight: '600', opacity: 0.9, marginTop: 2 },
  pickMetric: { flex: 1, minWidth: 0, gap: 2 },
  pickValue: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pickUnit: { fontSize: 12, fontWeight: '600' },
  pickLabel: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  cluster: {
    marginBottom: 14,
    borderRadius: radii.card,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  clusterHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterHeaderCopy: { flex: 1, minWidth: 0, gap: 2 },
  clusterBadge: {
    fontFamily: appFonts.bold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  clusterTitle: {
    fontFamily: appFonts.bold,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  clusterHint: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  clusterBody: {
    padding: 10,
    paddingTop: 8,
  },
  clusterPick: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  groveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groveChip: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: '42%',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  groveChipDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    flexShrink: 0,
  },
  groveChipCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  groveChipName: {
    fontFamily: appFonts.semibold,
    fontSize: 14,
    fontWeight: '650',
    letterSpacing: -0.1,
  },
  groveChipMeta: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  clusterRow: { gap: 10, paddingRight: 8 },
  clusterTile: { width: 280 },
  clusterTileSolo: { alignSelf: 'stretch', width: '100%' },
});

export default ChronologioEntryCard;
