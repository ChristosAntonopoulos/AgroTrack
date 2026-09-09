import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudRain, Droplets, Leaf, Snowflake, Sun, Thermometer } from 'lucide-react';
import type { ChronologioWeatherDetails } from '../../services/chronologioService';
import {
  buildWeatherAdverseChips,
  formatVegetationNote,
  formatWettestMonth,
  getRainVsPrevious,
  type WeatherAdverseKind,
} from '../../utils/weatherReviewDisplay';
import RainSparkline from './RainSparkline';

type Props = {
  weather: ChronologioWeatherDetails;
  eventType: string;
  size?: 'md' | 'lg';
  /** Multi-field timeline: rain + one insight + tiny spark only. */
  compact?: boolean;
  showSource?: boolean;
  numberLocale: string;
  locale: string;
};

const chipIcon = (kind: WeatherAdverseKind) => {
  switch (kind) {
    case 'frost':
      return <Snowflake size={13} aria-hidden />;
    case 'heat':
      return <Sun size={13} aria-hidden />;
    case 'heavyRain':
      return <Droplets size={13} aria-hidden />;
    case 'dry':
      return <Thermometer size={13} aria-hidden />;
    default:
      return null;
  }
};

const WeatherReviewSummary: React.FC<Props> = ({
  weather,
  eventType,
  size = 'md',
  compact = false,
  showSource = false,
  numberLocale,
  locale,
}) => {
  const { t } = useTranslation(['chronologio']);
  const isYear = eventType === 'weather.yearReview';
  const isMonth = eventType === 'weather.monthReview';
  const chips = buildWeatherAdverseChips(weather, eventType, t);
  const rainCompare = getRainVsPrevious(weather, eventType, t);
  const vegetationLine = formatVegetationNote(weather, eventType, t);
  const wettestLine = isYear ? formatWettestMonth(weather, locale, t) : null;
  const rainSeries = weather.rainSeries ?? [];
  const sparkHeight = size === 'lg' ? 52 : 36;
  const hasTempRange =
    isMonth && weather.temperatureMin != null && weather.temperatureMax != null;

  if (compact) {
    const leadChip = chips[0];
    return (
      <div className="weather-review weather-review--compact">
        <div className="weather-review-compact-row">
          {weather.rainfallMm != null ? (
            <div className="weather-review-compact-rain">
              <CloudRain size={15} aria-hidden />
              <strong>
                {weather.rainfallMm.toLocaleString(numberLocale, {
                  maximumFractionDigits: 0,
                })}
              </strong>
              <span>mm</span>
            </div>
          ) : null}
          {hasTempRange ? (
            <span className="weather-review-compact-temps">
              {weather.temperatureMin!.toFixed(0)}°–{weather.temperatureMax!.toFixed(0)}°
            </span>
          ) : weather.temperatureMax != null ? (
            <span className="weather-review-compact-temps">
              {weather.temperatureMax.toFixed(0)}°
            </span>
          ) : null}
        </div>
        {leadChip ? (
          <span className={`weather-review-chip is-${leadChip.kind}`}>
            {chipIcon(leadChip.kind)}
            <span>{leadChip.label}</span>
          </span>
        ) : rainCompare ? (
          <p className={`weather-review-compare is-${rainCompare.tone} is-compact`}>
            {rainCompare.text}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`weather-review weather-review--${size}`}>
      <div className="weather-review-hero">
        {weather.rainfallMm != null ? (
          <div className="weather-review-rain">
            <span className="weather-review-rain-icon" aria-hidden>
              <CloudRain size={size === 'lg' ? 22 : 18} />
            </span>
            <div>
              <strong>
                {weather.rainfallMm.toLocaleString(numberLocale, {
                  maximumFractionDigits: 0,
                })}
              </strong>
              <span>{t('chronologio:weatherReview.rainMm')}</span>
            </div>
          </div>
        ) : null}

        {hasTempRange ? (
          <div className="weather-review-temps" aria-label={t('chronologio:weatherReview.tempRange')}>
            <div className="weather-review-temp weather-review-temp--cold">
              <strong>{weather.temperatureMin!.toFixed(0)}°</strong>
              <span>{t('chronologio:weatherReview.coldest')}</span>
            </div>
            <div className="weather-review-temp-track" aria-hidden>
              <span className="weather-review-temp-fill" />
            </div>
            <div className="weather-review-temp weather-review-temp--hot">
              <strong>{weather.temperatureMax!.toFixed(0)}°</strong>
              <span>{t('chronologio:weatherReview.hottest')}</span>
            </div>
          </div>
        ) : null}

        {isYear ? (
          <div className="weather-review-year-stats">
            {weather.temperatureMax != null ? (
              <div className="weather-review-mini">
                <strong>{weather.temperatureMax.toFixed(0)}°</strong>
                <span>{t('chronologio:weatherReview.hottest')}</span>
              </div>
            ) : null}
            {(weather.frostNights ?? 0) > 0 ? (
              <div className="weather-review-mini">
                <strong>{weather.frostNights}</strong>
                <span>{t('chronologio:weatherReview.frostNights')}</span>
              </div>
            ) : null}
            {(weather.heatDays ?? 0) > 0 ? (
              <div className="weather-review-mini">
                <strong>{weather.heatDays}</strong>
                <span>{t('chronologio:weatherReview.heatDays')}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {rainSeries.length > 0 ? (
        <div className="weather-review-chart">
          <div className="weather-review-chart-label">
            {t('chronologio:weatherReview.rainChart')}
          </div>
          <RainSparkline
            values={rainSeries}
            height={sparkHeight}
            className="chronologio-rain-spark"
            ariaLabel={t('chronologio:weatherReview.rainChart')}
          />
        </div>
      ) : null}

      {chips.length > 0 ? (
        <ul className="weather-review-chips">
          {chips.map((chip) => (
            <li key={chip.kind} className={`weather-review-chip is-${chip.kind}`}>
              {chipIcon(chip.kind)}
              <span>{chip.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {rainCompare ? (
        <p className={`weather-review-compare is-${rainCompare.tone}`}>{rainCompare.text}</p>
      ) : null}

      {wettestLine ? <p className="weather-review-note">{wettestLine}</p> : null}

      {vegetationLine ? (
        <p className="weather-review-note weather-review-note--veg">
          <Leaf size={14} aria-hidden />
          <span>{vegetationLine}</span>
        </p>
      ) : null}

      {showSource && weather.source ? (
        <p className="weather-review-source">
          {t('chronologio:dataSource')}: {weather.source}
        </p>
      ) : null}
    </div>
  );
};

export default WeatherReviewSummary;
