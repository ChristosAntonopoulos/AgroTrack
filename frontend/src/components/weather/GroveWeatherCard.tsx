import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Snowflake,
  Sun,
  Wind,
} from 'lucide-react';
import type { FieldWeather } from '../../services/geospatialService';
import type { WeatherData } from '../../services/weatherService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { presentGroveWeather, type GroveWeatherMood } from '../../weather/presentGroveWeather';
import './GroveWeatherCard.css';

type Props = {
  fieldWeather?: FieldWeather | null;
  snapshot?: WeatherData | null;
  fieldName?: string | null;
  onOpen?: () => void;
  embedded?: boolean;
};

const iconFor = (mood: GroveWeatherMood, condition: string) => {
  if (mood === 'frost') return <Snowflake size={28} strokeWidth={1.75} />;
  if (mood === 'storm') return <CloudLightning size={28} strokeWidth={1.75} />;
  if (mood === 'rain' || condition === 'rain') return <CloudRain size={28} strokeWidth={1.75} />;
  if (mood === 'wind') return <Wind size={28} strokeWidth={1.75} />;
  if (mood === 'heat' || condition === 'clear') return <Sun size={28} strokeWidth={1.75} />;
  if (condition === 'partly') return <CloudSun size={28} strokeWidth={1.75} />;
  return <Cloud size={28} strokeWidth={1.75} />;
};

const GroveWeatherCard: React.FC<Props> = ({ fieldWeather, snapshot, fieldName, onOpen, embedded }) => {
  const { t, i18n } = useTranslation('chronologio');
  const view = presentGroveWeather({ field: fieldWeather, snapshot });
  const range =
    view.low != null && view.high != null ? `${view.low}–${view.high}°` : null;
  const updated =
    view.updatedAt && !Number.isNaN(view.updatedAt.getTime())
      ? view.updatedAt.toLocaleTimeString(i18n.language, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : null;

  const className = `grove-weather grove-weather--${view.mood}${onOpen ? ' is-button' : ''}${embedded ? ' is-embedded' : ''}`;
  const inner = (
    <>
      <div className="grove-weather-sky" aria-hidden />
      <header className="grove-weather-head">
        <div>
          {embedded ? null : <p className="grove-weather-kicker">{t('weatherCard.label')}</p>}
          {view.mood === 'missing' ? (
            <p className="grove-weather-missing">{t('weatherCard.reading.missing')}</p>
          ) : (
            <>
              <p className="grove-weather-temp">
                {view.temperature != null ? `${view.temperature}°` : '—'}
              </p>
              {view.feelsLike != null ? (
                <p className="grove-weather-feels">
                  {t('weatherCard.feelsLike', { temp: view.feelsLike })}
                </p>
              ) : null}
            </>
          )}
        </div>
        {view.mood !== 'missing' ? (
          <span className="grove-weather-icon">{iconFor(view.mood, view.conditionKey)}</span>
        ) : null}
      </header>

      {view.mood !== 'missing' ? (
        <p className="grove-weather-condition">
          {[t(`weatherCard.condition.${view.conditionKey}`), range].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      {view.facts.length > 0 ? (
        <ul className="grove-weather-facts">
          {view.facts.map((fact) => (
            <li key={fact.id} className={fact.harsh ? 'is-harsh' : undefined}>
              {t(`weatherCard.${fact.labelKey}`, fact.params)}
            </li>
          ))}
        </ul>
      ) : null}

      {view.mood !== 'missing' ? (
        <p className="grove-weather-reading">{t(`weatherCard.${view.readingKey}`)}</p>
      ) : null}

      {fieldName || updated ? (
        <p className="grove-weather-meta">
          {[
            fieldName ? friendlyFieldLabel(fieldName) : null,
            updated
              ? view.stale
                ? t('weatherCard.stale')
                : t('weatherCard.updated', { time: updated })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
    </>
  );

  if (onOpen) {
    return (
      <button type="button" className={className} onClick={onOpen} aria-label={t('weatherCard.label')}>
        {inner}
      </button>
    );
  }

  return (
    <article className={className} aria-label={t('weatherCard.label')}>
      {inner}
    </article>
  );
};

export default GroveWeatherCard;
