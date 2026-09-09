import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Task } from '../../services/taskService';
import { weatherService, WeatherData } from '../../services/weatherService';
import { formatCompactDate, getNextUpcomingTask, kmhToBeaufort } from '../../utils/fieldDisplay';
import './FieldOverviewBlocks.css';

type Props = {
  fieldId: string;
  tasks: Task[];
  locale: string;
};

const FieldTodaySummary: React.FC<Props> = ({ fieldId, tasks, locale }) => {
  const { t } = useTranslation(['fields', 'chronologio']);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const nextTask = getNextUpcomingTask(tasks);

  useEffect(() => {
    let cancelled = false;
    weatherService
      .getFieldWeatherData(fieldId)
      .then((data) => {
        if (!cancelled) setWeather(data);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  const rainLabel =
    weather && (weather.precipitation > 0 || (weather.rainForecast24hMm ?? 0) >= 0.5)
      ? t('fields:overview.withRain')
      : t('fields:overview.noRain');
  const wind = weather ? kmhToBeaufort(weather.windSpeed) : null;

  return (
    <section className="fd-block">
      <h2>{t('fields:overview.todayTitle')}</h2>
      {weather ? (
        <p className="fd-today-conditions">
          {weather.temperature}°C · {rainLabel}
          {wind != null ? ` · ${t('fields:overview.windBft', { value: wind })}` : ''}
        </p>
      ) : (
        <p className="fd-muted">{t('fields:weather.unavailable')}</p>
      )}

      <div className="fd-next-task">
        <h3>{t('fields:overview.nextTask')}</h3>
        {nextTask ? (
          <>
            <p className="fd-next-task-title">{nextTask.title}</p>
            {nextTask.scheduledEnd || nextTask.scheduledStart ? (
              <p className="fd-muted">
                {formatCompactDate(nextTask.scheduledEnd || nextTask.scheduledStart || '', locale)}
              </p>
            ) : null}
          </>
        ) : (
          <p className="fd-muted">{t('fields:overview.noNextTask')}</p>
        )}
      </div>

      <Link className="fd-text-link" to={`/fields/${fieldId}/weather`}>
        {t('chronologio:weatherVegetation.button')} →
      </Link>
    </section>
  );
};

export default FieldTodaySummary;
