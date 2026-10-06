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
import { resolveFieldColor } from '../../utils/fieldColors';
import { presentGroveWeather, type GroveWeatherMood } from '../../weather/presentGroveWeather';
import GroveWeekForecast from './GroveWeekForecast';
import './GroveWeatherCard.css';

type Props = {
  fieldWeather?: FieldWeather | null;
  snapshot?: WeatherData | null;
  fieldName?: string | null;
  fieldId?: string | null;
  fieldColor?: string | null;
  /** Area or selection note shown in place of a single field name. */
  scopeNote?: string;
  onOpen?: () => void;
  embedded?: boolean;
  /** Journal header: temperature and the week, without the long reading. */
  compact?: boolean;
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

const GroveWeatherCard: React.FC<Props> = ({
  fieldWeather,
  snapshot,
  fieldName,
  fieldId,
  fieldColor,
  scopeNote,
  onOpen,
  embedded,
  compact,
}) => {
  const { t } = useTranslation('chronologio');
  const view = presentGroveWeather({ field: fieldWeather, snapshot });
  const range =
    view.low != null && view.high != null ? `${view.low}–${view.high}°` : null;
  const fieldLabel = fieldName ? friendlyFieldLabel(fieldName) : null;

  const className = `grove-weather grove-weather--${view.mood}${onOpen ? ' is-button' : ''}${embedded ? ' is-embedded' : ''}${compact ? ' is-compact' : ''}`;
  const condition =
    view.mood === 'missing'
      ? null
      : [t(`weatherCard.condition.${view.conditionKey}`), range].filter(Boolean).join(' · ');
  const inner = (
    <>
      <div className="grove-weather-sky" aria-hidden />
      {compact && view.mood !== 'missing' ? (
        <div className="grove-weather-now">
          <p className="grove-weather-temp">{view.temperature != null ? `${view.temperature}°` : '—'}</p>
          {condition ? <p className="grove-weather-condition">{condition}</p> : null}
          <span className="grove-weather-icon">{iconFor(view.mood, view.conditionKey)}</span>
        </div>
      ) : null}
      {compact ? null : (
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
              {!compact && view.feelsLike != null ? (
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
      )}

      {!compact && condition ? <p className="grove-weather-condition">{condition}</p> : null}

      {!compact && view.facts.length > 0 ? (
        <ul className="grove-weather-facts">
          {view.facts.map((fact) => (
            <li key={fact.id} className={fact.harsh ? 'is-harsh' : undefined}>
              {t(`weatherCard.${fact.labelKey}`, fact.params)}
            </li>
          ))}
        </ul>
      ) : null}

      {!compact && view.mood !== 'missing' ? (
        <p className="grove-weather-reading">{t(`weatherCard.${view.readingKey}`)}</p>
      ) : null}

      {view.mood !== 'missing' ? (
        <GroveWeekForecast
          fieldWeather={fieldWeather}
          variant={compact ? 'strip' : 'compact'}
          futureOnly={Boolean(compact || embedded)}
        />
      ) : null}

      {!compact && scopeNote ? <p className="grove-weather-meta">{scopeNote}</p> : null}
      {!compact && !scopeNote && fieldLabel ? (
        <p className="grove-weather-field">
          <span
            className="grove-weather-field-dot"
            style={{ background: resolveFieldColor(fieldColor, fieldId || fieldName) }}
            aria-hidden
          />
          <span>{fieldLabel}</span>
        </p>
      ) : null}
    </>
  );

  return (
    <article
      className={className}
      aria-label={t('weatherCard.label')}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      tabIndex={onOpen ? 0 : undefined}
    >
      {inner}
    </article>
  );
};

export default GroveWeatherCard;
