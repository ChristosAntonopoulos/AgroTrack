import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { format, parseISO, subDays, subYears } from 'date-fns';
import {
  DailyWeatherSnapshot,
  FieldSatelliteObservation,
  geospatialService,
} from '../../services/geospatialService';
import HistoryChart from '../charts/HistoryChart';
import LoadingSpinner from '../LoadingSpinner';
import EmptyState from '../EmptyState';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

type HistoryRange = '90d' | '1y' | '3y';

type WeatherPoint = {
  label: string;
  min?: number;
  max?: number;
  rain?: number;
  et0?: number;
};

type VegetationPoint = {
  label: string;
  ndvi?: number;
  ndmi?: number;
};

type Props = {
  fieldId: string;
  /** Compact = map-tab embed (shorter ranges default, less chrome). */
  compact?: boolean;
};

const rangeStart = (range: HistoryRange): Date => {
  const now = new Date();
  if (range === '90d') return subDays(now, 90);
  if (range === '1y') return subYears(now, 1);
  return subYears(now, 3);
};

const toDate = (value: string): Date => {
  const parsed = parseISO(value.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
};

const round = (value: number | undefined, digits = 1): number | undefined =>
  value == null || Number.isNaN(value) ? undefined : Number(value.toFixed(digits));

const aggregateWeather = (snapshots: DailyWeatherSnapshot[], range: HistoryRange): WeatherPoint[] => {
  const sorted = [...snapshots].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  if (range === '90d') {
    return sorted.map((day) => ({
      label: format(toDate(day.date), 'd MMM'),
      min: round(day.minTemperatureC),
      max: round(day.maxTemperatureC),
      rain: round(day.rainTotalMm),
      et0: round(day.et0Mm),
    }));
  }

  const months = new Map<string, { min: number[]; max: number[]; rain: number; et0: number; date: Date }>();
  for (const day of sorted) {
    const date = toDate(day.date);
    const key = format(date, 'yyyy-MM');
    const bucket = months.get(key) ?? { min: [], max: [], rain: 0, et0: 0, date };
    if (day.minTemperatureC != null) bucket.min.push(day.minTemperatureC);
    if (day.maxTemperatureC != null) bucket.max.push(day.maxTemperatureC);
    bucket.rain += day.rainTotalMm ?? 0;
    bucket.et0 += day.et0Mm ?? 0;
    months.set(key, bucket);
  }

  return [...months.values()].map((bucket) => ({
    label: format(bucket.date, 'MMM yyyy'),
    min: bucket.min.length
      ? round(bucket.min.reduce((sum, value) => sum + value, 0) / bucket.min.length)
      : undefined,
    max: bucket.max.length
      ? round(bucket.max.reduce((sum, value) => sum + value, 0) / bucket.max.length)
      : undefined,
    rain: round(bucket.rain),
    et0: round(bucket.et0),
  }));
};

/** Weather + vegetation history — same data as web FieldWeatherVegetationCharts. */
const FieldWeatherVegetationCharts: React.FC<Props> = ({ fieldId, compact = false }) => {
  const { colors } = useTheme();
  const { t } = useTranslation(['chronologio', 'common']);
  const [snapshots, setSnapshots] = useState<DailyWeatherSnapshot[]>([]);
  const [observations, setObservations] = useState<FieldSatelliteObservation[]>([]);
  const [range, setRange] = useState<HistoryRange>(compact ? '90d' : '1y');
  const [loading, setLoading] = useState(true);
  const gathering =
    snapshots.length < 60 || observations.filter((item) => item.isUsable).length < 6;

  useEffect(() => {
    let cancelled = false;
    const load = async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      const from = format(rangeStart(range), 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');
      const [weather, satellite] = await Promise.all([
        geospatialService.getWeatherHistory(fieldId, from, to),
        geospatialService.getSatelliteObservations(fieldId),
      ]);
      if (cancelled) return;
      setSnapshots(weather);
      setObservations(satellite);
      if (showSpinner) setLoading(false);
    };
    void load(true);
    return () => {
      cancelled = true;
    };
  }, [fieldId, range]);

  useEffect(() => {
    if (loading || !gathering) return;
    void geospatialService.requestHistoryBackfill(fieldId);
    const timer = setInterval(() => {
      const from = format(rangeStart(range), 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');
      Promise.all([
        geospatialService.getWeatherHistory(fieldId, from, to),
        geospatialService.getSatelliteObservations(fieldId),
      ]).then(([weather, satellite]) => {
        setSnapshots(weather);
        setObservations(satellite);
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [fieldId, range, loading, gathering]);

  const weatherPoints = useMemo(() => aggregateWeather(snapshots, range), [snapshots, range]);
  const vegetationPoints = useMemo<VegetationPoint[]>(() => {
    const start = rangeStart(range).getTime();
    return observations
      .filter((item) => item.isUsable && item.ndvi && toDate(item.observationDate).getTime() >= start)
      .sort((a, b) => toDate(a.observationDate).getTime() - toDate(b.observationDate).getTime())
      .map((item) => ({
        label: format(toDate(item.observationDate), range === '90d' ? 'd MMM' : 'MMM yyyy'),
        ndvi: round(item.ndvi?.mean, 2),
        ndmi: round(item.ndmi?.mean, 2),
      }));
  }, [observations, range]);

  const ranges: { id: HistoryRange; label: string }[] = [
    { id: '90d', label: t('chronologio:weatherVegetation.range90d') },
    { id: '1y', label: t('chronologio:weatherVegetation.range1y') },
    { id: '3y', label: t('chronologio:weatherVegetation.range3y') },
  ];

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {!compact ? (
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('chronologio:weatherVegetation.kicker')}
        </Text>
      ) : (
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t('fields:weather.seeCharts', { defaultValue: 'Weather & vegetation' })}
        </Text>
      )}

      {gathering ? (
        <View style={[styles.gathering, { backgroundColor: colors.primary + '1F' }]}>
          <Text style={{ color: colors.textPrimary, fontSize: 13 }}>
            {t('chronologio:weatherVegetation.gathering')}
          </Text>
        </View>
      ) : null}

      <View style={styles.ranges} accessibilityRole="tablist">
        {ranges.map((item) => {
          const active = range === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setRange(item.id)}
              style={[
                styles.rangeChip,
                {
                  backgroundColor: active ? colors.primary : colors.surfaceElevated,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ color: active ? colors.onOlive : colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {weatherPoints.length === 0 && vegetationPoints.length === 0 ? (
        <EmptyState
          title={t('chronologio:weatherVegetation.emptyTitle')}
          description={t('chronologio:weatherVegetation.emptyDescription')}
        />
      ) : (
        <View style={styles.charts}>
          {weatherPoints.length > 0 ? (
            <>
              <HistoryChart
                title={t('chronologio:weatherVegetation.temperatureTitle')}
                data={weatherPoints}
                series={[
                  { key: 'max', label: t('chronologio:weatherVegetation.maxTemp'), color: colors.temperature },
                  { key: 'min', label: t('chronologio:weatherVegetation.minTemp'), color: colors.weatherBlue },
                ]}
                emptyLabel={t('chronologio:weatherVegetation.emptyTitle')}
              />
              <HistoryChart
                title={t('chronologio:weatherVegetation.rainTitle')}
                data={weatherPoints}
                mode="bar"
                series={[{ key: 'rain', label: t('chronologio:weatherVegetation.rainMm'), color: colors.rain }]}
                emptyLabel={t('chronologio:weatherVegetation.emptyTitle')}
              />
              {!compact ? (
                <HistoryChart
                  title={t('chronologio:weatherVegetation.etTitle')}
                  data={weatherPoints}
                  series={[{ key: 'et0', label: t('chronologio:weatherVegetation.et0Mm'), color: colors.primary }]}
                  emptyLabel={t('chronologio:weatherVegetation.emptyTitle')}
                />
              ) : null}
            </>
          ) : null}
          {vegetationPoints.length > 0 ? (
            <HistoryChart
              title={t('chronologio:weatherVegetation.vegetationTitle')}
              data={vegetationPoints}
              series={[
                { key: 'ndvi', label: t('chronologio:weatherVegetation.ndvi'), color: colors.olive },
                { key: 'ndmi', label: t('chronologio:weatherVegetation.ndmi'), color: colors.humidity },
              ]}
              emptyLabel={t('chronologio:weatherVegetation.vegetationEmptyDescription')}
            />
          ) : (
            <EmptyState
              title={t('chronologio:weatherVegetation.vegetationEmptyTitle')}
              description={t('chronologio:weatherVegetation.vegetationEmptyDescription')}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  sectionTitle: {
    ...typography.styles.body,
    fontWeight: '700',
    fontSize: 15,
  },
  gathering: {
    borderRadius: 10,
    padding: spacing.sm,
  },
  ranges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rangeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  charts: { gap: spacing.md },
});

export default FieldWeatherVegetationCharts;
