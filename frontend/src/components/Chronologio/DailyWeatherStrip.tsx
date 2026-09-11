import React from 'react';
import { useTranslation } from 'react-i18next';
import { CloudSun } from 'lucide-react';
import type { DayWeatherView } from '../../chronologio/dayWeather';

type Props = {
  weather: DayWeatherView;
  onOpen?: () => void;
};

const DailyWeatherStrip: React.FC<Props> = ({ weather, onOpen }) => {
  const { t, i18n } = useTranslation(['chronologio', 'today']);
  const numberLocale = i18n.language?.startsWith('el')
    ? 'el-GR'
    : i18n.language?.startsWith('it')
      ? 'it-IT'
      : 'en-US';

  const rainLabel =
    weather.rain.kind === 'missing'
      ? null
      : weather.rain.kind === 'zero'
        ? t('chronologio:today.noRain')
        : t('chronologio:today.rainMm', {
            mm: (weather.rain.value ?? 0).toLocaleString(numberLocale, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 1,
            }),
          });

  const content = weather.missing ? (
    <span>{t('chronologio:today.weatherMissing')}</span>
  ) : (
    <>
      {weather.tempLabel ? <span>{weather.tempLabel}</span> : null}
      {rainLabel ? <span>{rainLabel}</span> : null}
      {weather.windBft != null ? (
        <span>{t('today:brief.conditions.windBft', { bft: weather.windBft })}</span>
      ) : null}
    </>
  );

  if (!onOpen) {
    return (
      <p className="chrono-daily-weather" aria-label={t('chronologio:living.weatherButton')}>
        <CloudSun size={16} aria-hidden />
        {content}
      </p>
    );
  }

  return (
    <button
      type="button"
      className="chrono-daily-weather is-button"
      onClick={onOpen}
    >
      <CloudSun size={16} aria-hidden />
      {content}
    </button>
  );
};

export default DailyWeatherStrip;
