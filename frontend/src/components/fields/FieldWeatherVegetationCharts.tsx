import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, subDays, subYears } from 'date-fns';
import {
  DailyWeatherSnapshot,
  FieldSatelliteObservation,
  geospatialService,
} from '../../services/geospatialService';
import EmptyState from '../Common/EmptyState';
import LoadingSpinner from '../Common/LoadingSpinner';
import LineChart from '../Analytics/LineChart';
import BarChart from '../Analytics/BarChart';
import { getCssToken, getChartPalette } from '../../styles/colorTokens';
import './FieldWeatherVegetationCharts.css';

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

  return [...months.values()].map((month) => ({
    label: format(month.date, 'MMM yyyy'),
    min: month.min.length ? round(month.min.reduce((a, b) => a + b, 0) / month.min.length) : undefined,
    max: month.max.length ? round(month.max.reduce((a, b) => a + b, 0) / month.max.length) : undefined,
    rain: round(month.rain),
    et0: round(month.et0),
  }));
};

type Props = {
  fieldId: string;
  fieldName?: string;
};

/**
 * Multi-year weather + vegetation charts (relocated from Field History).
 */
const FieldWeatherVegetationCharts: React.FC<Props> = ({ fieldId, fieldName }) => {
  const { t } = useTranslation(['chronologio']);
  const [snapshots, setSnapshots] = useState<DailyWeatherSnapshot[]>([]);
  const [observations, setObservations] = useState<FieldSatelliteObservation[]>([]);
  const [range, setRange] = useState<HistoryRange>('1y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gathering = snapshots.length < 60 || observations.filter((item) => item.isUsable).length < 6;

  useEffect(() => {
    let cancelled = false;

    const load = async (showSpinner: boolean) => {
      if (showSpinner) {
        setLoading(true);
        setError(null);
      }
      const from = format(rangeStart(range), 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');
      try {
        const [weather, satellite] = await Promise.all([
          geospatialService.getWeatherHistory(fieldId, from, to).catch(() => []),
          geospatialService.getSatelliteObservations(fieldId).catch(() => []),
        ]);
        if (cancelled) return;
        setSnapshots(weather);
        setObservations(satellite);
      } catch {
        if (!cancelled) setError(t('chronologio:weatherVegetation.failedLoad'));
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    };

    void load(true);
    return () => {
      cancelled = true;
    };
  }, [fieldId, range, t]);

  useEffect(() => {
    if (loading || !gathering) return;
    void geospatialService.requestHistoryBackfill(fieldId).catch(() => undefined);

    const timer = window.setInterval(() => {
      const from = format(rangeStart(range), 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');
      Promise.all([
        geospatialService.getWeatherHistory(fieldId, from, to).catch(() => []),
        geospatialService.getSatelliteObservations(fieldId).catch(() => []),
      ]).then(([weather, satellite]) => {
        setSnapshots(weather);
        setObservations(satellite);
      });
    }, 5000);

    return () => window.clearInterval(timer);
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
      <div className="field-wv-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <EmptyState title={t('chronologio:weatherVegetation.failedLoad')} description={error} />;
  }

  const hasWeather = weatherPoints.length > 0;
  const hasVegetation = vegetationPoints.length > 0;

  return (
    <section className="field-wv-panel">
      <header className="field-wv-header">
        <p className="field-wv-kicker">{t('chronologio:weatherVegetation.kicker')}</p>
        <h2>
          {fieldName
            ? t('chronologio:weatherVegetation.title', { name: fieldName })
            : t('chronologio:weatherVegetation.kicker')}
        </h2>
        <p className="field-wv-desc">{t('chronologio:weatherVegetation.description')}</p>
      </header>

      {gathering ? <p className="field-wv-gathering">{t('chronologio:weatherVegetation.gathering')}</p> : null}

      <div className="field-wv-ranges" role="tablist" aria-label={t('chronologio:weatherVegetation.rangeAria')}>
        {ranges.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={range === item.id}
            className={`field-wv-range${range === item.id ? ' is-active' : ''}`}
            onClick={() => setRange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!hasWeather && !hasVegetation ? (
        <EmptyState
          title={t('chronologio:weatherVegetation.emptyTitle')}
          description={t('chronologio:weatherVegetation.emptyDescription')}
        />
      ) : (
        <div className="field-wv-charts">
          {hasWeather ? (
            <>
              <LineChart
                data={weatherPoints}
                dataKey="max"
                xAxisKey="label"
                title={t('chronologio:weatherVegetation.temperatureTitle')}
                lines={[
                  { dataKey: 'max', name: t('chronologio:weatherVegetation.maxTemp'), color: getCssToken('--temperature') },
                  { dataKey: 'min', name: t('chronologio:weatherVegetation.minTemp'), color: getCssToken('--weather-blue') },
                ]}
              />
              <BarChart
                data={weatherPoints}
                xAxisKey="label"
                title={t('chronologio:weatherVegetation.rainTitle')}
                bars={[{ dataKey: 'rain', name: t('chronologio:weatherVegetation.rainMm'), color: getCssToken('--rain') }]}
              />
              <LineChart
                data={weatherPoints}
                dataKey="et0"
                xAxisKey="label"
                title={t('chronologio:weatherVegetation.etTitle')}
                lines={[{ dataKey: 'et0', name: t('chronologio:weatherVegetation.et0Mm'), color: getChartPalette().olive }]}
              />
            </>
          ) : null}

          {hasVegetation ? (
            <LineChart
              data={vegetationPoints}
              dataKey="ndvi"
              xAxisKey="label"
              title={t('chronologio:weatherVegetation.vegetationTitle')}
              lines={[
                { dataKey: 'ndvi', name: t('chronologio:weatherVegetation.ndvi'), color: getChartPalette().olive },
                { dataKey: 'ndmi', name: t('chronologio:weatherVegetation.ndmi'), color: getChartPalette().weather },
              ]}
            />
          ) : (
            <EmptyState
              title={t('chronologio:weatherVegetation.vegetationEmptyTitle')}
              description={t('chronologio:weatherVegetation.vegetationEmptyDescription')}
            />
          )}
        </div>
      )}

      <p className="field-wv-source">{t('chronologio:weatherVegetation.sourceNote')}</p>
    </section>
  );
};

export default FieldWeatherVegetationCharts;
