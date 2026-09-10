import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplets, Wind, Info } from 'lucide-react';
import type { FieldWeather } from '../../services/geospatialService';
import type { FieldAttentionModel } from '../../utils/fieldOverviewAttention';
import { resolveWeatherImplication, weatherOutlookBuckets } from '../../utils/fieldWeatherImplication';
import DataSourceInfoModal, { DataSourceInfo } from '../Common/DataSourceInfoModal';
import LoadingSpinner from '../Common/LoadingSpinner';
import { Link } from 'react-router-dom';
import './FieldWeatherCard.css';

type Props = {
  weather: FieldWeather | null;
  loading?: boolean;
  error?: boolean;
  year: number;
  isHistoricalYear: boolean;
  allowRecommendation: boolean;
  attention?: FieldAttentionModel;
  nextTaskTitle?: string;
  onRetry?: () => void;
};

const formatUpdated = (iso: string | undefined, t: (key: string, opts?: Record<string, unknown>) => string): string => {
  if (!iso) return t('weather.live');
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(minutes) || minutes < 1) return t('weather.updatedJustNow');
  if (minutes < 60) return t('weather.updatedMinutes', { count: minutes });
  const hours = Math.round(minutes / 60);
  return t('weather.updatedHours', { count: hours });
};

const FieldWeatherCard: React.FC<Props> = ({
  weather,
  loading,
  error,
  year,
  isHistoricalYear,
  allowRecommendation,
  attention,
  nextTaskTitle,
  onRetry,
}) => {
  const { t } = useTranslation('fields');
  const [sourceInfo, setSourceInfo] = useState<DataSourceInfo | null>(null);
  const implication = useMemo(
    () => resolveWeatherImplication(weather, { allowRecommendation }),
    [weather, allowRecommendation]
  );
  const outlook = useMemo(() => weatherOutlookBuckets(weather), [weather]);

  if (loading) {
    return (
      <section className="field-weather-card field-weather-card--loading" aria-label={t('weather.fieldTitle')}>
        <LoadingSpinner size="sm" />
      </section>
    );
  }

  if (error || !weather) {
    return (
      <section className="field-weather-card field-weather-card--empty" aria-label={t('weather.fieldTitle')}>
        <h2>{t('weather.fieldTitle')}</h2>
        <p>{t('weather.unavailable')}</p>
        {onRetry ? (
          <button type="button" className="field-weather-retry" onClick={onRetry}>
            {t('weather.retry')}
          </button>
        ) : null}
      </section>
    );
  }

  const current = weather.current;
  const valueType = weather.metadata?.valueType || 'modelled';

  return (
    <section className="field-weather-card" aria-labelledby="field-weather-title">
      <div className="field-weather-header">
        <h2 id="field-weather-title">{t('weather.fieldTitle')}</h2>
        <span className="field-weather-actions">
          <span className={weather.stale ? 'field-weather-stale' : 'field-weather-updated'}>
            {formatUpdated(weather.lastUpdatedAt, t)}
          </span>
          <button
            type="button"
            className="field-weather-info"
            aria-label={t('weather.sourceAria')}
            onClick={() =>
              setSourceInfo({
                title: t('weather.fieldTitle'),
                source: weather.metadata.source,
                spatialResolution: weather.metadata.spatialResolution,
                temporalResolution: weather.metadata.temporalResolution,
                valueType: weather.metadata.valueType,
                lastUpdatedAt: weather.lastUpdatedAt,
              })
            }
          >
            <Info size={16} aria-hidden />
          </button>
        </span>
      </div>

      {isHistoricalYear ? <p className="field-weather-year-note">{t('weather.notThatYear', { year })}</p> : null}

      <p className="field-weather-implication">
        {implication.code === 'ok' && nextTaskTitle
          ? t('weather.implication.okNamed', { task: nextTaskTitle })
          : t(implication.textKey)}
      </p>

      {current ? (
        <div className="field-weather-main">
          <div>
            <div className="field-weather-temp">{Math.round(current.temperatureC)}°C</div>
            <div className="field-weather-desc">{t('weather.nowCondition')}</div>
          </div>
          <div className="field-weather-meta">
            <span>{t('weather.highLow', { high: Math.round(current.highC), low: Math.round(current.lowC) })}</span>
            <span className="field-weather-meta-item">
              <Droplets size={16} aria-hidden />
              {t('weather.rainAmount', { mm: (weather.rain?.forecast24hMm ?? 0).toFixed(1) })}
            </span>
            <span className="field-weather-meta-item">
              <Wind size={16} aria-hidden />
              {t('weather.windGust', {
                speed: Math.round(weather.wind?.currentSpeedKmh ?? current.windSpeedKmh),
                gust: Math.round(weather.wind?.currentGustKmh ?? current.windGustKmh),
              })}
            </span>
          </div>
        </div>
      ) : (
        <p className="field-weather-desc">{t('weather.implication.unknown')}</p>
      )}

      {outlook.length > 0 ? (
        <ul className="field-weather-outlook">
          {outlook.map((bucket) => (
            <li key={bucket.key}>
              <span>{t(`weather.outlook.${bucket.key}`)}</span>
              <strong>{t('weather.rainAmount', { mm: bucket.mm.toFixed(1) })}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="field-weather-type">{t('weather.dataType', { type: t(`weather.valueType.${valueType}`, valueType) })}</p>

      {allowRecommendation && attention?.kind === 'weatherReschedule' && attention.primaryTo ? (
        <div className="field-weather-actions-row">
          <Link className="field-attention-primary" to={attention.primaryTo}>
            {t('overview.attention.moveTask')}
          </Link>
        </div>
      ) : null}

      {sourceInfo ? <DataSourceInfoModal info={sourceInfo} onClose={() => setSourceInfo(null)} /> : null}
    </section>
  );
};

export default FieldWeatherCard;
