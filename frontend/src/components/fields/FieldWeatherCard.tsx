import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplets, Wind, Info } from 'lucide-react';
import { weatherService, WeatherData } from '../../services/weatherService';
import DataSourceInfoModal, { DataSourceInfo } from '../Common/DataSourceInfoModal';
import LoadingSpinner from '../Common/LoadingSpinner';
import { useExperienceMode } from '../../context/ExperienceModeContext';
import './FieldWeatherCard.css';

interface Props {
  fieldId: string;
}

const formatAge = (updatedAt?: Date): string | null => {
  if (!updatedAt) return null;
  const minutes = Math.round((Date.now() - updatedAt.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} h ago`;
};

const FieldWeatherCard: React.FC<Props> = ({ fieldId }) => {
  const { t } = useTranslation(['fields', 'settings']);
  const { showWidget, isEveryday, recordIntelligenceOpen } = useExperienceMode();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sourceInfo, setSourceInfo] = useState<DataSourceInfo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    weatherService
      .getFieldWeatherData(fieldId)
      .then((data) => {
        if (!cancelled) {
          setWeather(data);
          setError(!data);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  if (!showWidget('weatherAdvice') && isEveryday) {
    return null;
  }

  if (loading) {
    return (
      <div className="field-weather-card field-weather-card--loading">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="field-weather-card field-weather-card--empty">
        <p>{t('weather.unavailable')}</p>
      </div>
    );
  }

  const age = formatAge(weather.lastUpdatedAt);
  const advice =
    weather.frostLevel && weather.frostLevel !== 'None'
      ? t('weather.frostRisk', { level: weather.frostLevel })
      : weather.rainForecast24hMm != null && weather.rainForecast24hMm >= 0.5
        ? t('weather.rainNext24h', { mm: weather.rainForecast24hMm.toFixed(1) })
        : t('weather.rainNone');

  // Everyday: plain advice first; denser numbers behind peek (counts toward on-ramp).
  if (isEveryday && !detailsOpen) {
    return (
      <div className="field-weather-card field-weather-card--everyday">
        <div className="field-weather-header">
          <span className="field-weather-title">{t('weather.today')}</span>
        </div>
        <div className="field-weather-main">
          <span className="field-weather-icon" aria-hidden>
            {weather.icon}
          </span>
          <div>
            <div className="field-weather-temp">{weather.temperature}°C</div>
            <div className="field-weather-desc">{advice}</div>
          </div>
        </div>
        <button
          type="button"
          className="fd-everyday-peek-btn"
          onClick={() => {
            setDetailsOpen(true);
            recordIntelligenceOpen();
          }}
        >
          {t('settings:experience.peekMoreAboutField')}
        </button>
      </div>
    );
  }

  return (
    <div className="field-weather-card">
      <div className="field-weather-header">
        <span className="field-weather-title">{t('weather.today')}</span>
        <span className="field-weather-actions">
          <span className={weather.stale ? 'field-weather-stale' : 'field-weather-updated'}>
            {weather.stale && age ? `Last updated ${age}` : t('weather.live')}
          </span>
          <button
            type="button"
            className="field-weather-info"
            aria-label="Weather data source"
            onClick={() =>
              setSourceInfo({
                title: 'Temperature',
                source: weather.source,
                spatialResolution: weather.sourceResolution,
                temporalResolution: 'hourly',
                valueType: 'modelled',
                lastUpdatedAt: weather.lastUpdatedAt?.toISOString(),
              })
            }
          >
            <Info size={14} aria-hidden />
          </button>
        </span>
      </div>
      <div className="field-weather-main">
        <span className="field-weather-icon" aria-hidden>
          {weather.icon}
        </span>
        <div>
          <div className="field-weather-temp">{weather.temperature}°C</div>
          <div className="field-weather-desc">{weather.description}</div>
        </div>
      </div>
      <div className="field-weather-meta">
        <span>{t('weather.highLow', { high: weather.high, low: weather.low })}</span>
        <span className="field-weather-meta-item">
          <Droplets size={14} aria-hidden />
          {t('weather.humidity', { percent: weather.humidity })}
        </span>
        <span className="field-weather-meta-item">
          <Wind size={14} aria-hidden />
          {t('weather.wind', { speed: weather.windSpeed })}
        </span>
      </div>
      <p className="field-weather-outlook">{advice}</p>
      {weather.frostLevel && weather.frostLevel !== 'None' ? (
        <p className="field-weather-frost">{t('weather.frostRisk', { level: weather.frostLevel })}</p>
      ) : null}
      {sourceInfo && <DataSourceInfoModal info={sourceInfo} onClose={() => setSourceInfo(null)} />}
    </div>
  );
};

export default FieldWeatherCard;
