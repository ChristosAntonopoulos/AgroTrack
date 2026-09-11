import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudRain, Droplets, Snowflake, Sun, Thermometer, Wind } from 'lucide-react';
import type { ChronologioWeatherDetails } from '../../services/chronologioService';
import {
  buildTreeLookStory,
  formatWettestMonth,
  getRainVsPrevious,
  insightLabel,
} from '../../utils/weatherReviewDisplay';
import RainSparkline from './RainSparkline';
import WeatherMonthFieldMap from './WeatherMonthFieldMap';

type Props = {
  weather: ChronologioWeatherDetails;
  eventType: string;
  numberLocale: string;
  locale: string;
  fieldId?: string;
  variant?: 'hero' | 'card' | 'detail';
  onOpen?: () => void;
};

const formatMm = (value: number | undefined, locale: string, digits = 0) =>
  value == null
    ? null
    : `${value.toLocaleString(locale, { maximumFractionDigits: digits })} mm`;

const WeatherMonthSnapshot: React.FC<Props> = ({
  weather,
  eventType,
  numberLocale,
  locale,
  fieldId,
  variant = 'detail',
  onOpen,
}) => {
  const { t } = useTranslation(['chronologio']);
  const isYear = eventType === 'weather.yearReview';
  const rainCompare = getRainVsPrevious(weather, eventType, t);
  const treeLook = buildTreeLookStory(weather, locale, t);
  const wettestLine = isYear ? formatWettestMonth(weather, locale, t) : null;
  const insights = (weather.insights ?? []).filter(
    (insight) => insight.kind !== 'greener' && insight.kind !== 'browner'
  );
  const rainSeries = weather.rainSeries ?? [];
  const water = weather.waterBalanceMm;
  const isCard = variant === 'card';
  const showMap =
    variant === 'detail' &&
    Boolean(fieldId && (weather.openingScene?.observationId || weather.closingScene?.observationId));
  const shownInsights = isCard ? insights.slice(0, 3) : insights;
  const Wrapper = onOpen ? 'button' : 'div';

  return (
    <Wrapper
      {...(onOpen
        ? { type: 'button' as const, onClick: onOpen, className: `weather-snap weather-snap--${variant} is-button` }
        : { className: `weather-snap weather-snap--${variant}` })}
    >
      <div className="weather-snap-hero">
        {weather.rainfallMm != null ? (
          <div className="weather-snap-metric">
            <CloudRain size={18} aria-hidden />
            <strong>{weather.rainfallMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })}</strong>
            <span>{t('chronologio:weatherReview.rainMm')}</span>
          </div>
        ) : null}
        {weather.temperatureMin != null && weather.temperatureMax != null ? (
          <div className="weather-snap-metric">
            <Thermometer size={18} aria-hidden />
            <strong>
              {weather.temperatureMin.toFixed(0)}°–{weather.temperatureMax.toFixed(0)}°
            </strong>
            <span>{t('chronologio:weatherReview.tempRange')}</span>
          </div>
        ) : null}
        {water != null ? (
          <div className={`weather-snap-metric${water < 0 ? ' is-deficit' : ' is-surplus'}`}>
            <Droplets size={18} aria-hidden />
            <strong>{formatMm(water, numberLocale)}</strong>
            <span>{t('chronologio:weatherReview.waterBalance')}</span>
          </div>
        ) : null}
      </div>

      {treeLook ? (
        <section className="weather-snap-trees" aria-label={treeLook.title}>
          <h4>{treeLook.title}</h4>
          <p>{treeLook.text}</p>
          {treeLook.startPct != null || treeLook.endPct != null ? (
            <div className="weather-snap-track" aria-hidden>
              <span className="weather-snap-track-label">{t('chronologio:weatherReview.treesSparse')}</span>
              <div className="weather-snap-track-bar">
                {treeLook.startPct != null ? (
                  <i
                    className="weather-snap-track-dot is-start"
                    style={{ left: `${treeLook.startPct}%` }}
                    title={treeLook.startLabel}
                  />
                ) : null}
                {treeLook.endPct != null ? (
                  <i
                    className="weather-snap-track-dot is-end"
                    style={{ left: `${treeLook.endPct}%` }}
                    title={treeLook.endLabel}
                  />
                ) : null}
              </div>
              <span className="weather-snap-track-label">{t('chronologio:weatherReview.treesLush')}</span>
            </div>
          ) : null}
          {treeLook.startLabel && treeLook.endLabel && treeLook.startLabel !== treeLook.endLabel ? (
            <p className="weather-snap-track-dates">
              <span>{treeLook.startLabel}</span>
              <span aria-hidden>→</span>
              <span>{treeLook.endLabel}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      {showMap && fieldId ? (
        <WeatherMonthFieldMap
          fieldId={fieldId}
          opening={weather.openingScene}
          closing={weather.closingScene}
        />
      ) : null}

      {rainSeries.length > 0 ? (
        <div className="weather-snap-chart">
          <div className="weather-review-chart-label">{t('chronologio:weatherReview.rainChart')}</div>
          <RainSparkline
            values={rainSeries}
            height={variant === 'detail' ? 52 : 40}
            className="chronologio-rain-spark"
            ariaLabel={t('chronologio:weatherReview.rainChart')}
          />
        </div>
      ) : null}

      {variant === 'detail' ? (
        <dl className="weather-snap-facts">
          {weather.et0TotalMm != null ? (
            <div>
              <dt>{t('chronologio:weatherReview.et0')}</dt>
              <dd>{formatMm(weather.et0TotalMm, numberLocale)}</dd>
            </div>
          ) : null}
          {weather.rainyDays != null ? (
            <div>
              <dt>{t('chronologio:weatherReview.rainyDays')}</dt>
              <dd>{weather.rainyDays}</dd>
            </div>
          ) : null}
          {weather.dryDays != null ? (
            <div>
              <dt>{t('chronologio:weatherReview.dryDays')}</dt>
              <dd>{weather.dryDays}</dd>
            </div>
          ) : null}
          {weather.averageHumidityPercent != null ? (
            <div>
              <dt>{t('chronologio:weatherReview.humidity')}</dt>
              <dd>{Math.round(weather.averageHumidityPercent)}%</dd>
            </div>
          ) : null}
          {weather.maxWindGustKmh != null ? (
            <div>
              <dt>
                <Wind size={12} aria-hidden /> {t('chronologio:weatherReview.gusts')}
              </dt>
              <dd>
                {weather.maxWindGustKmh.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} km/h
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {shownInsights.length > 0 ? (
        <ul className="weather-snap-insights">
          {shownInsights.map((insight) => (
            <li key={insight.kind} className={`weather-review-chip is-${insight.kind} is-${insight.severity}`}>
              {insight.kind === 'frost' ? <Snowflake size={13} aria-hidden /> : null}
              {insight.kind === 'heat' ? <Sun size={13} aria-hidden /> : null}
              {insight.kind === 'dry' || insight.kind === 'waterDeficit' ? <Droplets size={13} aria-hidden /> : null}
              <span>{insightLabel(insight.kind, t)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {rainCompare ? (
        <p className={`weather-review-compare is-${rainCompare.tone}`}>{rainCompare.text}</p>
      ) : null}
      {!isCard && wettestLine ? <p className="weather-review-note">{wettestLine}</p> : null}
      {isCard ? <p className="weather-snap-hint">{t('chronologio:weatherReview.tapForDetails')}</p> : null}
      {!isCard && weather.source ? (
        <p className="weather-review-source">
          {t('chronologio:dataSource')}: {weather.source}
        </p>
      ) : null}
    </Wrapper>
  );
};

export default WeatherMonthSnapshot;
