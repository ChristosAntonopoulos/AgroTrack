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
  variant?: 'compact' | 'detail' | 'strip';
  /** Journal header already shows today. Keep only the days after it. */
  futureOnly?: boolean;
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

const GroveWeekForecast: React.FC<Props> = ({ fieldWeather, variant = 'compact', futureOnly = false }) => {
  const { t, i18n } = useTranslation('chronologio');
  const todayIso = new Date().toISOString().slice(0, 10);
  const days = presentGroveForecast(fieldWeather).filter((day) => !futureOnly || day.date !== todayIso);
  if (days.length < (futureOnly ? 1 : 2)) return null;

  const showRain = variant !== 'strip' && forecastHasRain(days);
  const iconSize = variant === 'detail' ? 18 : variant === 'strip' ? 12 : 15;
  const locale = i18n.language;

  return (
    <ol
      className={`grove-week grove-week--${variant}${showRain ? ' has-rain' : ''}`}
      aria-label={variant === 'detail' ? undefined : t('weatherPeek.week')}
    >
      {days.map((day) => {
        const when = calendarDate(day.date);
        const weekday = when
          .toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })
          .replace(/\.$/, '');
        const longDay = when.toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        });
        const rain = formatForecastRain(day.rainMm);
        const high = day.high != null ? `${day.high}°` : '—';
        const low = day.low != null ? `${day.low}°` : '';
        const range = day.low != null && day.high != null ? `${day.low}–${day.high}°` : high;
        const condition = t(`weatherCard.condition.${day.conditionKey}`);
        const today = day.date === todayIso;
        const label = t('weatherPeek.dayLabel', {
          day: longDay,
          range,
          condition,
          rain: rain ? t('weatherPeek.dayRain', { mm: rain }) : '',
        });
        return (
          <li key={day.date} className={today ? 'is-today' : undefined} title={`${longDay}, ${range}`} aria-label={label}>
            <span className="grove-week-dow">{weekday}</span>
            <span className="grove-week-icon" aria-hidden>
              {iconFor(day.conditionKey, iconSize)}
            </span>
            <span className="grove-week-temps">
              <span className="grove-week-high">{high}</span>
              {variant === 'detail' && low ? <span className="grove-week-low">{low}</span> : null}
            </span>
            {showRain && rain ? (
              <span className="grove-week-rain">
                <Droplets size={10} strokeWidth={2} aria-hidden />
                {rain}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};

export default GroveWeekForecast;
