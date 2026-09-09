import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ChronologioWeatherDetails } from '../../services/chronologioService';
import {
  buildWeatherAdverseChips,
  formatVegetationNote,
  formatWettestMonth,
  getRainVsPrevious,
  type WeatherAdverseKind,
} from '../../utils/weatherReviewDisplay';
import RainSparkline from './RainSparkline';

type Props = {
  weather: ChronologioWeatherDetails;
  eventType: string;
  numberLocale: string;
  locale: string;
  compact?: boolean;
  showSource?: boolean;
  primaryColor?: string;
  textPrimary?: string;
  textSecondary?: string;
  textTertiary?: string;
};

const CHIP_COLORS: Record<WeatherAdverseKind, { bg: string; fg: string }> = {
  heavyRain: { bg: 'rgba(45,106,159,0.14)', fg: '#1f4f78' },
  frost: { bg: 'rgba(107,163,212,0.18)', fg: '#2f5f8f' },
  heat: { bg: 'rgba(234,88,12,0.14)', fg: '#9a3412' },
  dry: { bg: 'rgba(212,160,23,0.16)', fg: '#92400e' },
};

const WeatherReviewSummary: React.FC<Props> = ({
  weather,
  eventType,
  numberLocale,
  locale,
  compact = false,
  showSource = false,
  primaryColor = '#2D6A9F',
  textPrimary = '#1a1a1a',
  textSecondary = '#667085',
  textTertiary = '#98a2b3',
}) => {
  const { t } = useTranslation(['chronologio']);
  const isYear = eventType === 'weather.yearReview';
  const isMonth = eventType === 'weather.monthReview';
  const chips = buildWeatherAdverseChips(weather, eventType, t);
  const rainCompare = getRainVsPrevious(weather, eventType, t);
  const vegetationLine = formatVegetationNote(weather, eventType, t);
  const wettestLine = isYear ? formatWettestMonth(weather, locale, t) : null;
  const hasTempRange =
    isMonth && weather.temperatureMin != null && weather.temperatureMax != null;

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={[styles.compactMeta, { color: textSecondary }]}>
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
        {chips.slice(0, 1).map((chip) => (
          <Text key={chip.kind} style={[styles.compactChip, { color: CHIP_COLORS[chip.kind].fg }]}>
            {chip.label}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {weather.rainfallMm != null ? (
        <View style={[styles.rainHero, { backgroundColor: 'rgba(45,106,159,0.12)' }]}>
          <Text style={[styles.rainValue, { color: textPrimary }]}>
            {weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}
          </Text>
          <Text style={[styles.rainLabel, { color: textSecondary }]}>
            {t('chronologio:weatherReview.rainMm')}
          </Text>
        </View>
      ) : null}

      {hasTempRange ? (
        <View style={styles.tempRow}>
          <View style={styles.tempSide}>
            <Text style={[styles.tempValue, { color: '#3d6ea8' }]}>
              {weather.temperatureMin!.toFixed(0)}°
            </Text>
            <Text style={[styles.tempLabel, { color: textSecondary }]}>
              {t('chronologio:weatherReview.coldest')}
            </Text>
          </View>
          <View style={styles.tempTrack}>
            <View style={styles.tempFill} />
          </View>
          <View style={[styles.tempSide, styles.tempSideRight]}>
            <Text style={[styles.tempValue, { color: '#b45309' }]}>
              {weather.temperatureMax!.toFixed(0)}°
            </Text>
            <Text style={[styles.tempLabel, { color: textSecondary }]}>
              {t('chronologio:weatherReview.hottest')}
            </Text>
          </View>
        </View>
      ) : null}

      {isYear ? (
        <View style={styles.yearStats}>
          {weather.temperatureMax != null ? (
            <View style={styles.miniStat}>
              <Text style={[styles.miniValue, { color: textPrimary }]}>
                {weather.temperatureMax.toFixed(0)}°
              </Text>
              <Text style={[styles.miniLabel, { color: textSecondary }]}>
                {t('chronologio:weatherReview.hottest')}
              </Text>
            </View>
          ) : null}
          {(weather.frostNights ?? 0) > 0 ? (
            <View style={styles.miniStat}>
              <Text style={[styles.miniValue, { color: textPrimary }]}>{weather.frostNights}</Text>
              <Text style={[styles.miniLabel, { color: textSecondary }]}>
                {t('chronologio:weatherReview.frostNights')}
              </Text>
            </View>
          ) : null}
          {(weather.heatDays ?? 0) > 0 ? (
            <View style={styles.miniStat}>
              <Text style={[styles.miniValue, { color: textPrimary }]}>{weather.heatDays}</Text>
              <Text style={[styles.miniLabel, { color: textSecondary }]}>
                {t('chronologio:weatherReview.heatDays')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {weather.rainSeries?.length ? (
        <View style={[styles.chart, { backgroundColor: 'rgba(45,106,159,0.07)' }]}>
          <Text style={[styles.chartLabel, { color: textSecondary }]}>
            {t('chronologio:weatherReview.rainChart')}
          </Text>
          <RainSparkline values={weather.rainSeries} height={44} color={primaryColor} />
        </View>
      ) : null}

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View
              key={chip.kind}
              style={[styles.chip, { backgroundColor: CHIP_COLORS[chip.kind].bg }]}
            >
              <Text style={[styles.chipText, { color: CHIP_COLORS[chip.kind].fg }]}>
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
                rainCompare.tone === 'wetter'
                  ? 'rgba(45,106,159,0.12)'
                  : 'rgba(212,160,23,0.14)',
              borderLeftColor: rainCompare.tone === 'wetter' ? '#2d6a9f' : '#c27803',
            },
          ]}
        >
          <Text
            style={{
              color: rainCompare.tone === 'wetter' ? '#1f4f78' : '#92400e',
              fontWeight: '700',
              fontSize: 14,
            }}
          >
            {rainCompare.text}
          </Text>
        </View>
      ) : null}

      {wettestLine ? (
        <Text style={{ color: textSecondary, marginTop: 2 }}>{wettestLine}</Text>
      ) : null}
      {vegetationLine ? (
        <Text style={{ color: '#3d6b2a', marginTop: 2 }}>{vegetationLine}</Text>
      ) : null}
      {showSource && weather.source ? (
        <Text style={{ color: textTertiary, fontSize: 12, marginTop: 4 }}>{weather.source}</Text>
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
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rainValue: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  rainLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  tempSide: { minWidth: 52 },
  tempSideRight: { alignItems: 'flex-end' },
  tempValue: { fontSize: 17, fontWeight: '700' },
  tempLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 },
  tempTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  tempFill: {
    height: '100%',
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#5b8fc7',
  },
  yearStats: { flexDirection: 'row', gap: 8 },
  miniStat: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(45,106,159,0.08)',
  },
  miniValue: { fontSize: 16, fontWeight: '700' },
  miniLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  chart: { borderRadius: 12, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 6 },
  chartLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: '700' },
  compare: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
  },
});

export default WeatherReviewSummary;
