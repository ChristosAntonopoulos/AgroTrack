import { weatherFromMeasured, type WeatherValue } from './weatherValue';
import { kmhToBeaufort } from '../today/buildDailyBrief';

export type DayWeatherInput = {
  minC?: number | null;
  maxC?: number | null;
  currentC?: number | null;
  rainMm?: number | null;
  windKmh?: number | null;
  gustKmh?: number | null;
  humidityPercent?: number | null;
  et0Mm?: number | null;
  source?: string | null;
  updatedAt?: string | null;
  frost?: boolean;
  heat?: boolean;
};

export type DayWeatherView = {
  missing: boolean;
  tempLabel?: string;
  rain: WeatherValue<number>;
  windBft?: number;
};

const formatTemp = (value: number, locale: string): string =>
  `${value.toLocaleString(locale, { maximumFractionDigits: 0 })}°`;

export const buildDayWeatherView = (
  input: DayWeatherInput | null | undefined,
  locale = 'el-GR'
): DayWeatherView => {
  if (!input) return { missing: true, rain: weatherFromMeasured(null) };

  const rain = weatherFromMeasured(input.rainMm);
  const temps = [input.minC, input.maxC, input.currentC].filter(
    (n): n is number => n != null && !Number.isNaN(n)
  );
  let tempLabel: string | undefined;
  if (input.minC != null && input.maxC != null && !Number.isNaN(input.minC) && !Number.isNaN(input.maxC)) {
    tempLabel = `${input.minC.toLocaleString(locale, { maximumFractionDigits: 0 })}–${input.maxC.toLocaleString(locale, { maximumFractionDigits: 0 })}°C`;
  } else if (input.currentC != null && !Number.isNaN(input.currentC)) {
    tempLabel = `${formatTemp(input.currentC, locale)}C`;
  } else if (temps.length === 1) {
    tempLabel = `${formatTemp(temps[0], locale)}C`;
  }

  const windBft =
    input.windKmh != null && !Number.isNaN(input.windKmh) ? kmhToBeaufort(input.windKmh) : undefined;

  const missing = !tempLabel && rain.kind === 'missing' && windBft == null;
  return { missing, tempLabel, rain, windBft };
};

export const dayWeatherDateKey = (value: string | Date): string => {
  const d = typeof value === 'string' ? new Date(value.length <= 10 ? `${value}T12:00:00` : value) : value;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
