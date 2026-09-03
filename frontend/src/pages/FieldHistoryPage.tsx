import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { format, parseISO, subDays, subYears } from 'date-fns';
import { ArrowLeft, History } from 'lucide-react';
import { getFieldService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import {
  DailyWeatherSnapshot,
  FieldSatelliteObservation,
  geospatialService,
} from '../services/geospatialService';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import LineChart from '../components/Analytics/LineChart';
import BarChart from '../components/Analytics/BarChart';
import './FieldHistoryPage.css';

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

const FieldHistoryPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { id } = useParams<{ id: string }>();
  const [field, setField] = useState<Field | null>(null);
  const [snapshots, setSnapshots] = useState<DailyWeatherSnapshot[]>([]);
  const [observations, setObservations] = useState<FieldSatelliteObservation[]>([]);
  const [range, setRange] = useState<HistoryRange>('1y');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gathering = snapshots.length < 60 || observations.filter((item) => item.isUsable).length < 6;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async (showSpinner: boolean) => {
      if (showSpinner) {
        setLoading(true);
        setError(null);
      }
      const from = format(rangeStart(range), 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');
      try {
        const [fieldData, weather, satellite] = await Promise.all([
          getFieldService().getField(id),
          geospatialService.getWeatherHistory(id, from, to).catch(() => []),
          geospatialService.getSatelliteObservations(id).catch(() => []),
        ]);
        if (cancelled) return;
        setField(fieldData);
        setSnapshots(weather);
        setObservations(satellite);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
        setError(message || t('fields:history.failedLoad'));
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    };

    void load(true);
    return () => {
      cancelled = true;
    };
  }, [id, range, t]);

  useEffect(() => {
    if (!id || loading || !gathering) return;
    void geospatialService.requestHistoryBackfill(id).catch(() => undefined);

    const timer = window.setInterval(() => {
      const from = format(rangeStart(range), 'yyyy-MM-dd');
      const to = format(new Date(), 'yyyy-MM-dd');
      Promise.all([
        geospatialService.getWeatherHistory(id, from, to).catch(() => []),
        geospatialService.getSatelliteObservations(id).catch(() => []),
      ]).then(([weather, satellite]) => {
        setSnapshots(weather);
        setObservations(satellite);
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [id, range, loading, gathering]);

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
    return (
      <PageContainer>
        <div className="field-history-loading">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error || !field) {
    return (
      <PageContainer>
        <EmptyState title={t('fields:history.failedLoad')} description={error || undefined} />
        <Button to={id ? `/fields/${id}` : '/fields'} icon={<ArrowLeft />} variant="outline">
          {t('fields:history.backToField')}
        </Button>
      </PageContainer>
    );
  }

  const hasWeather = weatherPoints.length > 0;
  const hasVegetation = vegetationPoints.length > 0;

  return (
    <PageContainer maxWidth="full" padding="sm">
      <div className="field-history-page">
        <Breadcrumbs />
        <header className="field-history-header">
          <div>
            <p className="field-history-kicker">
              <History size={16} />
              {t('fields:history.kicker')}
            </p>
            <h1>{t('fields:history.title', { name: field.name })}</h1>
            <p className="field-history-desc">{t('fields:history.description')}</p>
          </div>
          <Button to={`/fields/${field.id}`} icon={<ArrowLeft />} variant="outline" size="sm">
            {t('fields:history.backToField')}
          </Button>
        </header>

        {gathering ? (
          <p className="field-history-gathering">{t('fields:history.gathering')}</p>
        ) : null}

        <div className="field-history-ranges" role="tablist" aria-label={t('fields:history.rangeAria')}>
          {ranges.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              className={`field-history-range${range === item.id ? ' is-active' : ''}`}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {!hasWeather && !hasVegetation ? (
          <EmptyState
            title={t('fields:history.emptyTitle')}
            description={t('fields:history.emptyDescription')}
          />
        ) : (
          <div className="field-history-charts">
            {hasWeather ? (
              <>
                <LineChart
                  data={weatherPoints}
                  dataKey="max"
                  xAxisKey="label"
                  title={t('fields:history.temperatureTitle')}
                  lines={[
                    { dataKey: 'max', name: t('fields:history.maxTemp'), color: '#c45c26' },
                    { dataKey: 'min', name: t('fields:history.minTemp'), color: '#2d6a9f' },
                  ]}
                />
                <BarChart
                  data={weatherPoints}
                  xAxisKey="label"
                  title={t('fields:history.rainTitle')}
                  bars={[{ dataKey: 'rain', name: t('fields:history.rainMm'), color: '#2d6a9f' }]}
                />
                <LineChart
                  data={weatherPoints}
                  dataKey="et0"
                  xAxisKey="label"
                  title={t('fields:history.etTitle')}
                  lines={[{ dataKey: 'et0', name: t('fields:history.et0Mm'), color: '#4a7c2a' }]}
                />
              </>
            ) : null}

            {hasVegetation ? (
              <LineChart
                data={vegetationPoints}
                dataKey="ndvi"
                xAxisKey="label"
                title={t('fields:history.vegetationTitle')}
                lines={[
                  { dataKey: 'ndvi', name: t('fields:history.ndvi'), color: '#2d5016' },
                  { dataKey: 'ndmi', name: t('fields:history.ndmi'), color: '#17a2b8' },
                ]}
              />
            ) : (
              <EmptyState
                title={t('fields:history.vegetationEmptyTitle')}
                description={t('fields:history.vegetationEmptyDescription')}
              />
            )}
          </div>
        )}

        <p className="field-history-source">
          {t('fields:history.sourceNote')}
        </p>
      </div>
    </PageContainer>
  );
};

export default FieldHistoryPage;
