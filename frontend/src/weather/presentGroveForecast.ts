import type { FieldWeather } from '../services/geospatialService';
import { weatherCodeToCondition } from './presentGroveWeather';

export type GroveForecastDay = {
  date: string;
  high: number | null;
  low: number | null;
  conditionKey: string;
  rainMm: number;
};

const RAIN_WORTH_SHOWING_MM = 0.5;

const round = (value?: number | null) =>
  value == null || Number.isNaN(value) ? null : Math.round(value);

/** Today and the six days after it. Skips days the forecast window does not cover. */
export const presentGroveForecast = (
  field?: FieldWeather | null,
  today = new Date().toISOString().slice(0, 10)
): GroveForecastDay[] => {
  const days = field?.days ?? [];
  const nowCode = field?.current?.weatherCode;
  return days
    .map((day) => {
      const date = String(day.date || '').slice(0, 10);
      const high = round(day.maxTemperatureC);
      const low = round(day.minTemperatureC);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (high == null && low == null)) return null;
      const code = date === today && nowCode != null ? nowCode : day.weatherCode;
      return {
        date,
        high,
        low,
        conditionKey: weatherCodeToCondition(code),
        rainMm: Number.isFinite(day.rainMm) ? day.rainMm : 0,
      };
    })
    .filter((day): day is GroveForecastDay => day != null)
    .slice(0, 7);
};

export const forecastHasRain = (days: GroveForecastDay[]) =>
  days.some((day) => day.rainMm >= RAIN_WORTH_SHOWING_MM);

export const formatForecastRain = (mm: number) => {
  if (mm < RAIN_WORTH_SHOWING_MM) return null;
  const rounded = mm >= 10 ? Math.round(mm) : Math.round(mm * 10) / 10;
  return String(rounded);
};
