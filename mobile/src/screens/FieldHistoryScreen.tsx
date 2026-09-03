import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { format, parseISO, subDays, subYears } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { getFieldService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import {
  DailyWeatherSnapshot,
  FieldSatelliteObservation,
  geospatialService,
} from '../services/geospatialService';
import ScreenLayout from '../components/layout/ScreenLayout';
import HistoryChart from '../components/charts/HistoryChart';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'FieldHistory'>;
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
    min: bucket.min.length ? round(bucket.min.reduce((sum, value) => sum + value, 0) / bucket.min.length) : undefined,
    max: bucket.max.length ? round(bucket.max.reduce((sum, value) => sum + value, 0) / bucket.max.length) : undefined,
    rain: round(bucket.rain),
    et0: round(bucket.et0),
  }));
};

const FieldHistoryScreen = () => {
  const route = useRoute<Route>();
  const { fieldId } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const [field, setField] = useState<Field | null>(null);
  const [snapshots, setSnapshots] = useState<DailyWeatherSnapshot[]>([]);
  const [observations, setObservations] = useState<FieldSatelliteObservation[]>([]);
  const [range, setRange] = useState<HistoryRange>('1y');
  const [loading, setLoading] = useState(true);
  const gathering = snapshots.length < 60 || observations.filter((item) => item.isUsable).length < 6;

  useEffect(() => {
    let cancelled = false;

    const load = async (showSpinner: boolean) => {
      if (showSpinner) setLoading(true);
      const from = format(rangeStart(range), 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');
      const [fieldData, weather, satellite] = await Promise.all([
        getFieldService().getField(fieldId).catch(() => null),
        geospatialService.getWeatherHistory(fieldId, from, to),
        geospatialService.getSatelliteObservations(fieldId),
      ]);
      if (cancelled) return;
      setField(fieldData);
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
    { id: '90d', label: t('fields:history.range90d') },
    { id: '1y', label: t('fields:history.range1y') },
    { id: '3y', label: t('fields:history.range3y') },
  ];

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!field) {
    return (
      <ScreenLayout scroll contentContainerStyle={styles.content}>
        <EmptyState title={t('fields:history.failedLoad')} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scroll contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <View style={styles.kickerRow}>
          <Ionicons name="time-outline" size={16} color={colors.primaryDark} />
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>{t('fields:history.kicker')}</Text>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('fields:history.title', { name: field.name })}
        </Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>{t('fields:history.description')}</Text>
      </View>

      {gathering ? (
        <View style={[styles.gathering, { backgroundColor: colors.primary + '1F' }]}>
          <Text style={[styles.gatheringText, { color: colors.textPrimary }]}>
            {t('fields:history.gathering')}
          </Text>
        </View>
      ) : null}

      <View style={styles.ranges} accessibilityRole="tablist" accessibilityLabel={t('fields:history.rangeAria')}>
        {ranges.map((item) => {
          const active = range === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setRange(item.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.rangeChip,
                {
                  backgroundColor: active ? colors.primaryDark : colors.surfaceElevated,
                  borderColor: active ? colors.primaryDark : colors.border,
                },
              ]}
            >
              <Text style={[styles.rangeLabel, { color: active ? colors.textInverse : colors.textPrimary }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {weatherPoints.length === 0 && vegetationPoints.length === 0 ? (
        <EmptyState
          title={t('fields:history.emptyTitle')}
          description={t('fields:history.emptyDescription')}
        />
      ) : (
        <View style={styles.charts}>
          {weatherPoints.length > 0 ? (
            <>
              <HistoryChart
                title={t('fields:history.temperatureTitle')}
                data={weatherPoints}
                series={[
                  { key: 'max', label: t('fields:history.maxTemp'), color: '#C45C26' },
                  { key: 'min', label: t('fields:history.minTemp'), color: '#2D6A9F' },
                ]}
                emptyLabel={t('fields:history.emptyTitle')}
              />
              <HistoryChart
                title={t('fields:history.rainTitle')}
                data={weatherPoints}
                mode="bar"
                series={[{ key: 'rain', label: t('fields:history.rainMm'), color: '#2D6A9F' }]}
                emptyLabel={t('fields:history.emptyTitle')}
              />
              <HistoryChart
                title={t('fields:history.etTitle')}
                data={weatherPoints}
                series={[{ key: 'et0', label: t('fields:history.et0Mm'), color: '#4A7C2A' }]}
                emptyLabel={t('fields:history.emptyTitle')}
              />
            </>
          ) : null}
          {vegetationPoints.length > 0 ? (
            <HistoryChart
              title={t('fields:history.vegetationTitle')}
              data={vegetationPoints}
              series={[
                { key: 'ndvi', label: t('fields:history.ndvi'), color: '#2D5016' },
                { key: 'ndmi', label: t('fields:history.ndmi'), color: '#17A2B8' },
              ]}
              emptyLabel={t('fields:history.vegetationEmptyDescription')}
            />
          ) : (
            <EmptyState
              title={t('fields:history.vegetationEmptyTitle')}
              description={t('fields:history.vegetationEmptyDescription')}
            />
          )}
        </View>
      )}

      <Text style={[styles.source, { color: colors.textTertiary }]}>{t('fields:history.sourceNote')}</Text>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  intro: {
    gap: 6,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kicker: {
    ...typography.styles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    ...typography.styles.h2,
    fontSize: 22,
  },
  desc: {
    ...typography.styles.body,
    lineHeight: 20,
  },
  gathering: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  gatheringText: {
    ...typography.styles.body,
    fontWeight: '600',
  },
  ranges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rangeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rangeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  charts: {
    gap: spacing.md,
  },
  source: {
    ...typography.styles.caption,
    marginTop: spacing.xs,
  },
});

export default FieldHistoryScreen;
