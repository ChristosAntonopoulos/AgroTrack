import type { FieldWeather } from '../services/geospatialService';

export type WeatherImplicationCode = 'frost' | 'rain' | 'wind' | 'ok' | 'unknown';

export type WeatherImplication = {
  code: WeatherImplicationCode;
  textKey: string;
};

export type WeatherOutlookBucket = {
  key: 'h24' | 'h48' | 'h72';
  mm: number;
};

const FROST_WATCH = new Set(['high', 'critical']);

export function resolveWeatherImplication(
  weather: FieldWeather | null,
  options?: { allowRecommendation?: boolean }
): WeatherImplication {
  if (!options?.allowRecommendation) {
    return { code: 'unknown', textKey: 'weather.implication.unknown' };
  }
  if (!weather?.current) {
    return { code: 'unknown', textKey: 'weather.implication.unknown' };
  }

  const frost = String(weather.frost?.level || '').toLowerCase();
  if (FROST_WATCH.has(frost)) {
    return { code: 'frost', textKey: 'weather.implication.frost' };
  }

  const rain24 = weather.rain?.forecast24hMm ?? 0;
  const rain48 = weather.rain?.forecast48hMm ?? 0;
  if (rain24 >= 2 || rain48 >= 5) {
    return { code: 'rain', textKey: 'weather.implication.rain' };
  }

  const wind = weather.wind?.currentSpeedKmh ?? 0;
  const gust = weather.wind?.currentGustKmh ?? weather.wind?.maxNext24hKmh ?? 0;
  if (wind >= 25 || gust >= 40) {
    return { code: 'wind', textKey: 'weather.implication.wind' };
  }

  return { code: 'ok', textKey: 'weather.implication.ok' };
}

/** Rain totals the API already aggregates. Do not invent daily temperatures. */
export function weatherOutlookBuckets(weather: FieldWeather | null): WeatherOutlookBucket[] {
  if (!weather?.rain) return [];
  const buckets: WeatherOutlookBucket[] = [{ key: 'h24', mm: weather.rain.forecast24hMm ?? 0 }];
  if (weather.rain.forecast48hMm != null) {
    buckets.push({ key: 'h48', mm: weather.rain.forecast48hMm });
  }
  if (weather.rain.forecast72hMm != null) {
    buckets.push({ key: 'h72', mm: weather.rain.forecast72hMm });
  }
  return buckets;
}
