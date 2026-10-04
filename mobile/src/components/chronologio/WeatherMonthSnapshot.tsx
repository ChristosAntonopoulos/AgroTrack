import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';
import type { ChronologioWeatherDetails } from '../../services/chronologioService';
import {
  buildTreeLookStory,
  getRainVsPrevious,
  insightLabel,
  formatWettestMonth,
} from '../../utils/weatherReviewDisplay';
import RainSparkline from './RainSparkline';
import WeatherMonthFieldMap from './WeatherMonthFieldMap';

type Props = {
  weather: ChronologioWeatherDetails;
  eventType: string;
  numberLocale: string;
  locale: string;
  fieldId?: string;
  variant?: 'hero' | 'card' | 'detail';
  onOpen?: () => void;
};

const formatMm = (value: number | undefined, locale: string, digits = 0) =>
  value == null
    ? null
    : `${value.toLocaleString(locale, { maximumFractionDigits: digits })} mm`;

const WeatherMonthSnapshot: React.FC<Props> = ({
  weather,
  eventType,
  numberLocale,
  locale,
  fieldId,
  variant = 'detail',
  onOpen,
}) => {
  const { t } = useTranslation(['chronologio']);
  const { colors } = useTheme();
  const isYear = eventType === 'weather.yearReview';
  const rainCompare = getRainVsPrevious(weather, eventType, t);
  const treeLook = buildTreeLookStory(weather, locale, t);
  const wettestLine = isYear ? formatWettestMonth(weather, locale, t) : null;
  const insights = (weather.insights ?? []).filter(
    (insight) => insight.kind !== 'greener' && insight.kind !== 'browner'
  );
  const rainSeries = weather.rainSeries ?? [];
  const water = weather.waterBalanceMm;
  const isCard = variant === 'card';
  const shownInsights = isCard ? insights.slice(0, 3) : insights;
  const showMap =
    !isCard &&
    Boolean(
      fieldId &&
        (weather.openingScene?.observationId ||
          weather.closingScene?.observationId ||
          weather.openingScene?.ndviUrl ||
          weather.closingScene?.ndviUrl)
    );

  const map = showMap && fieldId ? (
    <WeatherMonthFieldMap
      fieldId={fieldId}
      opening={weather.openingScene}
      closing={weather.closingScene}
    />
  ) : null;

  const body = (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        {weather.rainfallMm != null ? (
          <View style={[styles.metric, { backgroundColor: colors.eventWeatherSoft }]}>
            <Ionicons name="rainy-outline" size={16} color={colors.rain} />
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t('chronologio:weatherReview.rainMm')}
            </Text>
          </View>
        ) : null}
        {weather.temperatureMin != null && weather.temperatureMax != null ? (
          <View style={[styles.metric, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="thermometer-outline" size={16} color={colors.temperature} />
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {weather.temperatureMin.toFixed(0)}°–{weather.temperatureMax.toFixed(0)}°
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t('chronologio:weatherReview.tempRange')}
            </Text>
          </View>
        ) : null}
        {water != null ? (
          <View
            style={[
              styles.metric,
              {
                backgroundColor:
                  water < 0 ? colors.warningLight : colors.eventWeatherSoft,
              },
            ]}
          >
            <Ionicons
              name="water-outline"
              size={16}
              color={water < 0 ? colors.warningDark : colors.rain}
            />
            <Text
              style={[
                styles.metricValue,
                { color: water < 0 ? colors.warningDark : colors.textPrimary },
              ]}
            >
              {formatMm(water, numberLocale)}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t('chronologio:weatherReview.waterBalance')}
            </Text>
          </View>
        ) : null}
      </View>

      {treeLook ? (
        <View style={styles.trees}>
          <Text style={[styles.treesTitle, { color: colors.textPrimary }]}>{treeLook.title}</Text>
          <Text style={[styles.treesText, { color: colors.textSecondary }]}>{treeLook.text}</Text>
          {treeLook.startPct != null || treeLook.endPct != null ? (
            <View style={styles.trackRow}>
              <Text style={[styles.trackLabel, { color: colors.textTertiary }]}>
                {t('chronologio:weatherReview.treesSparse')}
              </Text>
              <View style={[styles.trackBar, { backgroundColor: colors.borderLight }]}>
                {treeLook.startPct != null ? (
                  <View
                    style={[
                      styles.trackDot,
                      {
                        left: `${treeLook.startPct}%`,
                        backgroundColor: colors.textTertiary,
                      },
                    ]}
                  />
                ) : null}
                {treeLook.endPct != null ? (
                  <View
                    style={[
                      styles.trackDot,
                      {
                        left: `${treeLook.endPct}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                ) : null}
              </View>
              <Text style={[styles.trackLabel, { color: colors.textTertiary }]}>
                {t('chronologio:weatherReview.treesLush')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {map}

      {rainSeries.length > 0 ? (
        <View>
          <Text style={[styles.chartLabel, { color: colors.textTertiary }]}>
            {t('chronologio:weatherReview.rainChart')}
          </Text>
          <RainSparkline
            values={rainSeries}
            height={variant === 'detail' || variant === 'hero' ? 52 : 40}
            color={colors.rain}
          />
        </View>
      ) : null}

      {variant === 'detail' || variant === 'hero' ? (
        <View style={styles.facts}>
          {weather.et0TotalMm != null ? (
            <View style={styles.fact}>
              <Text style={[styles.dt, { color: colors.textTertiary }]}>
                {t('chronologio:weatherReview.et0')}
              </Text>
              <Text style={[styles.dd, { color: colors.textPrimary }]}>
                {formatMm(weather.et0TotalMm, numberLocale)}
              </Text>
            </View>
          ) : null}
          {weather.rainyDays != null ? (
            <View style={styles.fact}>
              <Text style={[styles.dt, { color: colors.textTertiary }]}>
                {t('chronologio:weatherReview.rainyDays')}
              </Text>
              <Text style={[styles.dd, { color: colors.textPrimary }]}>{weather.rainyDays}</Text>
            </View>
          ) : null}
          {weather.dryDays != null ? (
            <View style={styles.fact}>
              <Text style={[styles.dt, { color: colors.textTertiary }]}>
                {t('chronologio:weatherReview.dryDays')}
              </Text>
              <Text style={[styles.dd, { color: colors.textPrimary }]}>{weather.dryDays}</Text>
            </View>
          ) : null}
          {weather.averageHumidityPercent != null ? (
            <View style={styles.fact}>
              <Text style={[styles.dt, { color: colors.textTertiary }]}>
                {t('chronologio:weatherReview.humidity')}
              </Text>
              <Text style={[styles.dd, { color: colors.textPrimary }]}>
                {Math.round(weather.averageHumidityPercent)}%
              </Text>
            </View>
          ) : null}
          {weather.maxWindGustKmh != null ? (
            <View style={styles.fact}>
              <Text style={[styles.dt, { color: colors.textTertiary }]}>
                {t('chronologio:weatherReview.gusts')}
              </Text>
              <Text style={[styles.dd, { color: colors.textPrimary }]}>
                {weather.maxWindGustKmh.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} km/h
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {shownInsights.length > 0 ? (
        <View style={styles.chips}>
          {shownInsights.map((insight) => (
            <View
              key={insight.kind}
              style={[styles.chip, { backgroundColor: colors.eventWeatherSoft }]}
            >
              {insight.kind === 'frost' ? (
                <Ionicons name="snow-outline" size={13} color={colors.frost} />
              ) : insight.kind === 'heat' ? (
                <Ionicons name="sunny-outline" size={13} color={colors.warningDark} />
              ) : insight.kind === 'dry' || insight.kind === 'waterDeficit' ? (
                <Ionicons name="water-outline" size={13} color={colors.rain} />
              ) : null}
              <Text style={[styles.chipText, { color: colors.textPrimary }]}>
                {insightLabel(insight.kind, t)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {rainCompare ? (
        <Text
          style={{
            color: rainCompare.tone === 'wetter' ? colors.infoDark : colors.warningDark,
            fontWeight: '700',
            fontSize: 13,
          }}
        >
          {rainCompare.text}
        </Text>
      ) : null}
      {!isCard && wettestLine ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{wettestLine}</Text>
      ) : null}
      {isCard ? (
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
          {t('chronologio:weatherReview.tapForDetails')}
        </Text>
      ) : null}
      {!isCard && weather.source ? (
        <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
          {t('chronologio:dataSource')}: {weather.source}
        </Text>
      ) : null}
    </View>
  );

  if (!onOpen || map) return body;

  return (
    <Pressable onPress={onOpen} accessibilityRole="button">
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    flexGrow: 1,
    minWidth: 96,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  metricValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  metricLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  trees: { gap: 4 },
  treesTitle: { fontSize: 14, fontWeight: '700' },
  treesText: { fontSize: 13, lineHeight: 18 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  trackLabel: { fontSize: 10, fontWeight: '700' },
  trackBar: { flex: 1, height: 8, borderRadius: radii.full, position: 'relative' },
  trackDot: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fact: { minWidth: '40%', gap: 2 },
  dt: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  dd: { fontSize: 15, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
});

export default WeatherMonthSnapshot;
