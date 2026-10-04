import { weatherFromMeasured, type WeatherValue } from './weatherValue';
import { kmhToBeaufort } from '../today/buildDailyBrief';
import { athensCalendarDateKey } from '../utils/athensDate';

export type DayWeatherInput = {
  minC?: number | null;
  maxC?: number | null;
  currentC?: number | null;
  rainMm?: number | null;
  windKmh?: number | null;
  gustKmh?: number | null;
  humidityPercent?: number | null;
  et0Mm?: number | null;
  waterBalanceMm?: number | null;
  source?: string | null;
  updatedAt?: string | null;
  frost?: boolean;
  heat?: boolean;
  fieldId?: string | null;
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

/** Athens calendar day — matches harvest/Chronologio business dates. */
export const dayWeatherDateKey = (value: string | Date): string => {
  try {
    return athensCalendarDateKey(value);
  } catch {
    return '';
  }
};

/** Matches backend WeatherIntelligenceService.ComputeGridKey (2 decimal places). */
export const weatherGridKey = (latitude: number, longitude: number): string =>
  `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

export type FieldPlace = {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
};

/**
 * Fields that share the same weather grid cell as `fieldId`.
 * Returns only `fieldId` when coordinates are missing.
 */
export const fieldsSharingWeatherGrid = (
  fieldId: string,
  fields: FieldPlace[]
): string[] => {
  const anchor = fields.find((f) => f.id === fieldId);
  if (!anchor || anchor.latitude == null || anchor.longitude == null) return [fieldId];
  const key = weatherGridKey(anchor.latitude, anchor.longitude);
  const shared = fields
    .filter((f) => f.latitude != null && f.longitude != null)
    .filter((f) => weatherGridKey(f.latitude!, f.longitude!) === key)
    .map((f) => f.id);
  return shared.length ? shared : [fieldId];
};

/** Same-conditions association: field (or shared grid) + Athens date. */
export const entryMatchesDayWeather = (
  entry: { fieldId?: string | null; occurredAt: string },
  opts: { dateKey: string; fieldIds: string[] }
): boolean => {
  if (dayWeatherDateKey(entry.occurredAt) !== opts.dateKey) return false;
  if (!entry.fieldId) return false;
  return opts.fieldIds.includes(entry.fieldId);
};

/** "Φιλιατρών 088" and "Φιλιατρών 089" share the place name Φιλιατρών. */
export const sharedPlaceLabel = (names: string[]): string | null => {
  const stems = names
    .map((name) => name.replace(/\s+\d+\s*$/u, '').trim())
    .filter(Boolean);
  if (stems.length < 2) return null;
  const unique = [...new Set(stems)];
  return unique.length === 1 ? unique[0] : null;
};
