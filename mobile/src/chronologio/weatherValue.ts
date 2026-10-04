export type WeatherValueKind = 'missing' | 'zero' | 'actual' | 'forecast';

export type WeatherValue<T> = {
  kind: WeatherValueKind;
  value?: T;
};

export const missingWeather = <T>(): WeatherValue<T> => ({ kind: 'missing' });

export const weatherFromMeasured = (value?: number | null): WeatherValue<number> => {
  if (value == null || Number.isNaN(value)) return { kind: 'missing' };
  if (value === 0) return { kind: 'zero', value: 0 };
  return { kind: 'actual', value };
};

export const forecastWeather = (value?: number | null): WeatherValue<number> => {
  if (value == null || Number.isNaN(value)) return { kind: 'missing' };
  return { kind: 'forecast', value };
};

/** Historical totals never include forecast and never treat missing as zero. */
export const measuredTotal = (values: WeatherValue<number>[]): number | undefined => {
  const measured = values.filter((v) => v.kind === 'zero' || v.kind === 'actual');
  if (measured.length === 0) return undefined;
  return measured.reduce((sum, v) => sum + (v.value ?? 0), 0);
};

export const displayWeatherNumber = (
  value: WeatherValue<number>,
  format: (n: number) => string,
  missingLabel = '—'
): string => {
  if (value.kind === 'missing' || value.value == null) return missingLabel;
  return format(value.value);
};

export type WeatherCoverage = {
  daysWithData: number;
  expectedDays: number;
  includesForecast: boolean;
};

export const coverageSufficient = (coverage: WeatherCoverage, minimumRatio = 0.66): boolean => {
  if (coverage.includesForecast) return false;
  if (coverage.expectedDays <= 0) return false;
  return coverage.daysWithData / coverage.expectedDays >= minimumRatio;
};
