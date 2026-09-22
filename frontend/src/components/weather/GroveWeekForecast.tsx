import React from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, CloudLightning, CloudRain, CloudSun, Droplets, Snowflake, Sun } from 'lucide-react';
import type { FieldWeather } from '../../services/geospatialService';
import {
  formatForecastRain,
  forecastHasRain,
  presentGroveForecast,
} from '../../weather/presentGroveForecast';
import './GroveWeekForecast.css';

type Props = {
  fieldWeather?: FieldWeather | null;
  variant?: 'compact' | 'detail';
};

const iconFor = (condition: string, size: number) => {
  if (condition === 'storm') return <CloudLightning size={size} strokeWidth={1.75} />;
  if (condition === 'rain') return <CloudRain size={size} strokeWidth={1.75} />;
  if (condition === 'snow') return <Snowflake size={size} strokeWidth={1.75} />;
  if (condition === 'clear') return <Sun size={size} strokeWidth={1.75} />;
  if (condition === 'partly') return <CloudSun size={size} strokeWidth={1.75} />;
  return <Cloud size={size} strokeWidth={1.75} />;
};

const calendarDate = (iso: string) => new Date(`${iso}T12:00:00Z`);

const GroveWeekForecast: React.FC<Props> = ({ fieldWeather, variant = 'compact' }) => {
  const { t, i18n } = useTranslation('chronologio');
  const days = presentGroveForecast(fieldWeather);
  if (days.length < 2) return null;

  const showRain = forecastHasRain(days);
  const iconSize = variant === 'detail' ? 18 : 15;
  const locale = i18n.language;

  return (
    <ol
      className={`grove-week grove-week--${variant}${showRain ? ' has-rain' : ''}`}
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      aria-label={variant === 'compact' ? t('weatherPeek.week') : undefined}
    >
      {days.map((day) => {
        const when = calendarDate(day.date);
        const weekday = when.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' });
        const longDay = when.toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        });
        const rain = formatForecastRain(day.rainMm);
        const range =
          day.low != null && day.high != null
            ? `${day.low}–${day.high}°`
            : day.high != null
              ? `${day.high}°`
              : day.low != null
                ? `${day.low}°`
                : '';
        const condition = t(`weatherCard.condition.${day.conditionKey}`);
        const today = day.date === new Date().toISOString().slice(0, 10);
        const label = t('weatherPeek.dayLabel', {
          day: longDay,
          range,
          condition,
          rain: rain ? t('weatherPeek.dayRain', { mm: rain }) : '',
        });
        return (
          <li key={day.date} className={today ? 'is-today' : undefined} title={`${longDay}, ${range}`} aria-label={label}>
            <span className="grove-week-dow">{weekday.replace(/\.$/, '')}</span>
            <span className="grove-week-icon" aria-hidden>
              {iconFor(day.conditionKey, iconSize)}
            </span>
            <span className="grove-week-high">{day.high != null ? `${day.high}°` : '—'}</span>
            {variant === 'detail' ? (
              <span className="grove-week-low">{day.low != null ? `${day.low}°` : ''}</span>
            ) : null}
            {showRain ? (
              <span className={`grove-week-rain${rain ? '' : ' is-empty'}`}>
                {rain ? (
                  <>
                    <Droplets size={10} strokeWidth={2} aria-hidden />
                    {rain}
                  </>
                ) : (
                  '·'
                )}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};

export default GroveWeekForecast;
