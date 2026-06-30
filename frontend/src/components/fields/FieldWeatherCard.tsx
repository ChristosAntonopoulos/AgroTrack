import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplets, Wind } from 'lucide-react';
import { weatherService, WeatherData } from '../../services/weatherService';
import LoadingSpinner from '../Common/LoadingSpinner';
import './FieldWeatherCard.css';

interface Props {
  latitude: number;
  longitude: number;
}

const FieldWeatherCard: React.FC<Props> = ({ latitude, longitude }) => {
  const { t } = useTranslation('fields');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    weatherService
      .getCurrentWeather(latitude, longitude)
      .then((data) => {
        if (!cancelled) setWeather(data);
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
  }, [latitude, longitude]);

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

  return (
    <div className="field-weather-card">
      <div className="field-weather-header">
        <span className="field-weather-title">{t('weather.today')}</span>
        <span className="field-weather-updated">{t('weather.live')}</span>
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
        <span>
          {t('weather.highLow', { high: weather.high, low: weather.low })}
        </span>
        <span className="field-weather-meta-item">
          <Droplets size={14} aria-hidden />
          {weather.humidity}%
        </span>
        <span className="field-weather-meta-item">
          <Wind size={14} aria-hidden />
          {weather.windSpeed} km/h
        </span>
      </div>
    </div>
  );
};

export default FieldWeatherCard;
