import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudRain, Droplets, Info, Snowflake, Sun, Wind } from 'lucide-react';
import type { FieldWeather } from '../../services/geospatialService';
import type { FieldAttentionModel } from '../../utils/fieldOverviewAttention';
import {
  isOutlookDry,
  rainOutlookScaleMm,
  resolveWeatherImplication,
  weatherOutlookBars,
  type WeatherImplicationCode,
} from '../../utils/fieldWeatherImplication';
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
  onSeeMore?: () => void;
};

const formatUpdated = (
  iso: string | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string
): string => {
  if (!iso) return t('weather.live');
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(minutes) || minutes < 1) return t('weather.updatedJustNow');
  if (minutes < 60) return t('weather.updatedShortMinutes', { count: minutes });
  const hours = Math.round(minutes / 60);
  return t('weather.updatedShortHours', { count: hours });
};

const formatMm = (mm: number, locale: string): string =>
  mm.toLocaleString(locale, { maximumFractionDigits: mm >= 10 ? 0 : 1 });

const statusIcon = (code: WeatherImplicationCode) => {
  if (code === 'frost') return <Snowflake size={16} aria-hidden />;
  if (code === 'rain') return <CloudRain size={16} aria-hidden />;
  if (code === 'wind') return <Wind size={16} aria-hidden />;
  if (code === 'ok') return <Sun size={16} aria-hidden />;
  return <Droplets size={16} aria-hidden />;
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
  onSeeMore,
}) => {
  const { t, i18n } = useTranslation('fields');
  const [sourceInfo, setSourceInfo] = useState<DataSourceInfo | null>(null);
  const implication = useMemo(
    () => resolveWeatherImplication(weather, { allowRecommendation }),
    [weather, allowRecommendation]
  );
  const bars = useMemo(() => weatherOutlookBars(weather), [weather]);
  const dry = isOutlookDry(bars);
  const scale = rainOutlookScaleMm(bars);

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
  const windSpeed = Math.round(weather.wind?.currentSpeedKmh ?? current?.windSpeedKmh ?? 0);
  const windGust = Math.round(weather.wind?.currentGustKmh ?? current?.windGustKmh ?? 0);
  const statusCode = implication.code;
  const showStatus = allowRecommendation && statusCode !== 'unknown';
  const statusDetail =
    statusCode === 'ok' && nextTaskTitle
      ? t('weather.implication.okNamed', { task: nextTaskTitle })
      : statusCode !== 'ok' && statusCode !== 'unknown'
        ? t(implication.textKey)
        : null;

  const openSource = () =>
    setSourceInfo({
      title: t('weather.fieldTitle'),
      source: weather.metadata.source,
      spatialResolution: weather.metadata.spatialResolution,
      temporalResolution: weather.metadata.temporalResolution,
      valueType: weather.metadata.valueType,
      lastUpdatedAt: weather.lastUpdatedAt,
    });

  return (
    <section
      className={`field-weather-card field-weather-card--${statusCode}`}
      aria-labelledby="field-weather-title"
    >
      <header className="field-weather-header">
        <h2 id="field-weather-title">{t('weather.fieldTitle')}</h2>
        <span className="field-weather-actions">
          <span className={weather.stale ? 'field-weather-stale' : 'field-weather-updated'}>
            {formatUpdated(weather.lastUpdatedAt, t)}
          </span>
          <button type="button" className="field-weather-info" aria-label={t('weather.sourceAria')} onClick={openSource}>
            <Info size={15} aria-hidden />
          </button>
        </span>
      </header>

      {isHistoricalYear ? <p className="field-weather-year-note">{t('weather.notThatYear', { year })}</p> : null}

      <div className="field-weather-hero">
        {current ? (
          <div className="field-weather-temp-block">
            <p className="field-weather-temp">
              {Math.round(current.temperatureC)}
              <span>°</span>
            </p>
            <p className="field-weather-range">
              {Math.round(current.lowC)}° / {Math.round(current.highC)}°
            </p>
          </div>
        ) : (
          <p className="field-weather-desc">{t('weather.implication.unknown')}</p>
        )}

        {showStatus ? (
          <div className={`field-weather-status field-weather-status--${statusCode}`}>
            <p className="field-weather-status-label">
              {statusIcon(statusCode)}
              {t(`weather.status.${statusCode}`)}
            </p>
            {statusDetail ? <p className="field-weather-status-detail">{statusDetail}</p> : null}
          </div>
        ) : null}
      </div>

      {bars.length > 0 ? (
        <div className="field-weather-rain">
          <p className="field-weather-rain-label">{t('weather.rainLabel')}</p>
          {dry ? <p className="field-weather-rain-dry">{t('weather.rainNone72')}</p> : null}
          <ul className="field-weather-rain-bars" aria-label={t('weather.rainLabel')}>
            {bars.map((bar) => {
              const height = Math.max(6, Math.round((bar.periodMm / scale) * 100));
              return (
                <li key={bar.key}>
                  <span className="field-weather-rain-track" aria-hidden>
                    <span
                      className={`field-weather-rain-fill${bar.periodMm >= 2 ? ' is-wet' : ''}`}
                      style={{ height: `${height}%` }}
                    />
                  </span>
                  <strong>{formatMm(bar.periodMm, i18n.language)}</strong>
                  <span>{t(`weather.outlookShort.${bar.key}`)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p className={`field-weather-wind${statusCode === 'wind' ? ' is-alert' : ''}`}>
        <Wind size={14} aria-hidden />
        {t('weather.windLine', { speed: windSpeed, gust: windGust })}
      </p>

      {allowRecommendation && attention?.kind === 'weatherReschedule' && attention.primaryTo ? (
        <Link className="field-weather-move" to={attention.primaryTo}>
          {t('overview.attention.moveTask')}
        </Link>
      ) : null}

      {onSeeMore ? (
        <button type="button" className="field-weather-more" onClick={onSeeMore}>
          {t('weather.seeCharts')}
        </button>
      ) : null}

      {sourceInfo ? <DataSourceInfoModal info={sourceInfo} onClose={() => setSourceInfo(null)} /> : null}
    </section>
  );
};

export default FieldWeatherCard;
