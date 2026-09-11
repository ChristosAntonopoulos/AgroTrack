import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ChronologioEntry } from '../../services/chronologioService';
import {
  buildDayWeatherView,
  type DayWeatherInput,
} from '../../chronologio/dayWeather';
import { presentChronologioEvent } from '../../chronologio/eventPresentation';

type Props = {
  dateKey: string;
  weather: DayWeatherInput | null;
  events: ChronologioEntry[];
  numberLocale: string;
  onSelectEvent?: (entry: ChronologioEntry) => void;
};

const ChronologioDayWeatherDetail: React.FC<Props> = ({
  dateKey,
  weather,
  events,
  numberLocale,
  onSelectEvent,
}) => {
  const { t, i18n } = useTranslation(['chronologio', 'today']);
  const view = buildDayWeatherView(weather, numberLocale);
  const rainLabel =
    view.rain.kind === 'missing'
      ? t('today.weatherMissing')
      : view.rain.kind === 'zero'
        ? t('today.noRain')
        : t('today.rainMm', {
            mm: (view.rain.value ?? 0).toLocaleString(numberLocale, {
              maximumFractionDigits: 1,
            }),
          });
  const tasks = events.filter((e) => e.category === 'task');
  const others = events.filter((e) => e.category !== 'task' && e.eventType !== 'weather.monthReview');

  return (
    <div data-date={dateKey}>
      {view.missing && !weather ? (
        <p className="chrono-drawer-notes">{t('today.weatherMissing')}</p>
      ) : (
        <dl className="chrono-drawer-facts">
          <div>
            <dt>{t('weatherReview.tempRange')}</dt>
            <dd>{view.tempLabel || '—'}</dd>
          </div>
          <div>
            <dt>{t('weatherReview.rainMm')}</dt>
            <dd>{rainLabel}</dd>
          </div>
          {view.windBft != null ? (
            <div>
              <dt>{t('drawer.wind')}</dt>
              <dd>{t('today:brief.conditions.windBft', { bft: view.windBft })}</dd>
            </div>
          ) : null}
          {weather?.gustKmh != null ? (
            <div>
              <dt>{t('today.gust', { kmh: Math.round(weather.gustKmh) })}</dt>
              <dd>
                {weather.gustKmh.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} km/h
              </dd>
            </div>
          ) : null}
          {weather?.humidityPercent != null ? (
            <div>
              <dt>{t('drawer.humidity')}</dt>
              <dd>{Math.round(weather.humidityPercent)}%</dd>
            </div>
          ) : null}
          {weather?.et0Mm != null ? (
            <div>
              <dt>{t('weatherVegetation.et0Mm')}</dt>
              <dd>
                {weather.et0Mm.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} mm
              </dd>
            </div>
          ) : null}
          {weather?.frost ? (
            <div>
              <dt>{t('drawer.frost')}</dt>
              <dd>{t('today:brief.conditions.frost')}</dd>
            </div>
          ) : null}
          {weather?.heat ? (
            <div>
              <dt>{t('weatherReview.heatDays')}</dt>
              <dd>{t('drawer.heat')}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t('drawer.dataType')}</dt>
            <dd>{t('drawer.measured')}</dd>
          </div>
          {weather?.source ? (
            <div>
              <dt>{t('drawer.source')}</dt>
              <dd>{weather.source}</dd>
            </div>
          ) : null}
          {weather?.updatedAt ? (
            <div>
              <dt>{t('today.updated', { time: '' })}</dt>
              <dd>
                {new Date(weather.updatedAt).toLocaleString(i18n.language, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  hour12: false,
                })}
              </dd>
            </div>
          ) : null}
        </dl>
      )}

      {tasks.length ? (
        <section className="chrono-drawer-section">
          <h3>{t('drawer.affectedTasks')}</h3>
          <ul className="chrono-peek-recent">
            {tasks.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="chrono-peek-recent-btn"
                  onClick={() => onSelectEvent?.(e)}
                >
                  <span className="chrono-peek-recent-title">
                    {presentChronologioEvent(e, i18n.language).label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {others.length ? (
        <section className="chrono-drawer-section">
          <h3>{t('drawer.dayEvents')}</h3>
          <ul className="chrono-peek-recent">
            {others.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className="chrono-peek-recent-btn"
                  onClick={() => onSelectEvent?.(e)}
                >
                  <span className="chrono-peek-recent-title">
                    {presentChronologioEvent(e, i18n.language).label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default ChronologioDayWeatherDetail;
