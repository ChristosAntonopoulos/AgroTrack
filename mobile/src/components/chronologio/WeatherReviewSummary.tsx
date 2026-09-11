import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioWeatherDetails } from '../../services/chronologioService';
import {
  buildWeatherAdverseChips,
  formatVegetationNote,
  formatWettestMonth,
  getRainVsPrevious,
  type WeatherAdverseKind,
} from '../../utils/weatherReviewDisplay';
import { radii, spacing, typography } from '../../theme';
import RainSparkline from './RainSparkline';

type Props = {
  weather: ChronologioWeatherDetails;
  eventType: string;
  numberLocale: string;
  locale: string;
  compact?: boolean;
  showSource?: boolean;
};

const WeatherReviewSummary: React.FC<Props> = ({
  weather,
  eventType,
  numberLocale,
  locale,
  compact = false,
  showSource = false,
}) => {
  const { t } = useTranslation(['chronologio']);
  const { colors } = useTheme();
  const isYear = eventType === 'weather.yearReview';
  const isMonth = eventType === 'weather.monthReview';
  const chips = buildWeatherAdverseChips(weather, eventType, t);
  const rainCompare = getRainVsPrevious(weather, eventType, t);
  const vegetationLine = formatVegetationNote(weather, eventType, t);
  const wettestLine = isYear ? formatWettestMonth(weather, locale, t) : null;
  const hasTempRange =
    isMonth && weather.temperatureMin != null && weather.temperatureMax != null;

  const chipColors: Record<WeatherAdverseKind, { bg: string; fg: string }> = {
    heavyRain: { bg: colors.eventWeatherSoft, fg: colors.rain },
    frost: { bg: 'rgba(140,169,191,0.22)', fg: colors.frost },
    heat: { bg: colors.warningLight, fg: colors.warningDark },
    dry: { bg: 'rgba(164,111,50,0.14)', fg: colors.accentGold },
  };

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={[styles.compactMeta, { color: colors.textSecondary }]}>
          {weather.rainfallMm != null
            ? `${weather.rainfallMm.toLocaleString(numberLocale, {
                maximumFractionDigits: 0,
              })} mm`
            : ''}
          {weather.temperatureMax != null ? ` · ${weather.temperatureMax.toFixed(0)}°` : ''}
          {isMonth && weather.temperatureMin != null
            ? ` / ${weather.temperatureMin.toFixed(0)}°`
            : ''}
          {isYear && (weather.frostNights ?? 0) > 0 ? ` · ${weather.frostNights} frost` : ''}
        </Text>
        {chips.slice(0, 1).map(chip => (
          <Text key={chip.kind} style={[styles.compactChip, { color: chipColors[chip.kind].fg }]}>
            {chip.label}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {weather.rainfallMm != null ? (
        <View style={[styles.rainHero, { backgroundColor: colors.eventWeatherSoft }]}>
          <Text style={[styles.rainValue, { color: colors.textPrimary }]}>
            {weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.rainLabel, { color: colors.rain }]}>
            {t('chronologio:weatherReview.rainMm')}
          </Text>
        </View>
      ) : null}

      {hasTempRange ? (
        <View style={[styles.tempRow, { backgroundColor: colors.surfaceMuted }]}>
          <View style={styles.tempSide}>
            <Text style={[styles.tempValue, { color: colors.frost }]}>
              {weather.temperatureMin!.toFixed(0)}°
            </Text>
            <Text style={[styles.tempLabel, { color: colors.textSecondary }]}>
              {t('chronologio:weatherReview.coldest')}
            </Text>
          </View>
          <View style={[styles.tempTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.tempFill,
                {
                  backgroundColor: colors.weatherBlue,
                },
              ]}
            />
          </View>
          <View style={[styles.tempSide, styles.tempSideRight]}>
            <Text style={[styles.tempValue, { color: colors.temperature }]}>
              {weather.temperatureMax!.toFixed(0)}°
            </Text>
            <Text style={[styles.tempLabel, { color: colors.textSecondary }]}>
              {t('chronologio:weatherReview.hottest')}
            </Text>
          </View>
        </View>
      ) : null}

      {isYear ? (
        <View style={styles.yearStats}>
          {weather.temperatureMax != null ? (
            <View style={[styles.miniStat, { backgroundColor: colors.eventWeatherSoft }]}>
              <Text style={[styles.miniValue, { color: colors.textPrimary }]}>
                {weather.temperatureMax.toFixed(0)}°
              </Text>
              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>
                {t('chronologio:weatherReview.hottest')}
              </Text>
            </View>
          ) : null}
          {(weather.frostNights ?? 0) > 0 ? (
            <View style={[styles.miniStat, { backgroundColor: colors.eventWeatherSoft }]}>
              <Text style={[styles.miniValue, { color: colors.textPrimary }]}>{weather.frostNights}</Text>
              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>
                {t('chronologio:weatherReview.frostNights')}
              </Text>
            </View>
          ) : null}
          {(weather.heatDays ?? 0) > 0 ? (
            <View style={[styles.miniStat, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.miniValue, { color: colors.textPrimary }]}>{weather.heatDays}</Text>
              <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>
                {t('chronologio:weatherReview.heatDays')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {weather.rainSeries?.length ? (
        <View style={[styles.chart, { backgroundColor: colors.eventWeatherSoft }]}>
          <Text style={[styles.chartLabel, { color: colors.textSecondary }]}>
            {t('chronologio:weatherReview.rainChart')}
          </Text>
          <RainSparkline values={weather.rainSeries} height={44} color={colors.rain} />
        </View>
      ) : null}

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map(chip => (
            <View
              key={chip.kind}
              style={[styles.chip, { backgroundColor: chipColors[chip.kind].bg }]}
            >
              <Text style={[styles.chipText, { color: chipColors[chip.kind].fg }]}>
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {rainCompare ? (
        <View
          style={[
            styles.compare,
            {
              backgroundColor:
                rainCompare.tone === 'wetter' ? colors.eventWeatherSoft : colors.warningLight,
              borderLeftColor: rainCompare.tone === 'wetter' ? colors.rain : colors.warning,
            },
          ]}
        >
          <Text
            style={{
              color: rainCompare.tone === 'wetter' ? colors.infoDark : colors.warningDark,
              fontWeight: '700',
              fontSize: 14,
            }}
          >
            {rainCompare.text}
          </Text>
        </View>
      ) : null}

      {wettestLine ? (
        <Text style={{ color: colors.textSecondary, marginTop: 2 }}>{wettestLine}</Text>
      ) : null}
      {vegetationLine ? (
        <Text style={{ color: colors.primary, marginTop: 2, fontWeight: '600' }}>{vegetationLine}</Text>
      ) : null}
      {showSource && weather.source ? (
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>{weather.source}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 10, marginBottom: 4 },
  compact: { marginTop: 6, gap: 4 },
  compactMeta: { fontSize: 13 },
  compactChip: { fontSize: 12, fontWeight: '600' },
  rainHero: {
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rainValue: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  rainLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.lg,
  },
  tempSide: { minWidth: 52 },
  tempSideRight: { alignItems: 'flex-end' },
  tempValue: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  tempLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 },
  tempTrack: {
    flex: 1,
    height: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  tempFill: {
    height: '100%',
    width: '100%',
    borderRadius: radii.full,
  },
  yearStats: { flexDirection: 'row', gap: 8 },
  miniStat: {
    flex: 1,
    borderRadius: radii.md,
    padding: 10,
  },
  miniValue: { fontSize: 16, fontWeight: '700' },
  miniLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  chart: { borderRadius: radii.lg, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 },
  chartLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: '700' },
  compare: {
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
  },
});

export default WeatherReviewSummary;
