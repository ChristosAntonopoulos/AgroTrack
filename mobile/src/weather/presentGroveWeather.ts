import type { FieldWeather, FrostRiskLevel } from '../services/geospatialService';
import type { WeatherData } from '../services/weatherService';

export type GroveWeatherMood =
  | 'frost'
  | 'heat'
  | 'storm'
  | 'rain'
  | 'wind'
  | 'clear'
  | 'cloud'
  | 'missing';

export type GroveWeatherFactId =
  | 'frost'
  | 'heat'
  | 'rainNow'
  | 'rainSoon'
  | 'rainPast'
  | 'wind'
  | 'humidity'
  | 'et';

export type GroveWeatherFact = {
  id: GroveWeatherFactId;
  harsh: boolean;
  labelKey: string;
  params?: Record<string, string | number>;
};

export type GroveWeatherView = {
  mood: GroveWeatherMood;
  temperature: number | null;
  feelsLike: number | null;
  high: number | null;
  low: number | null;
  conditionKey: string;
  facts: GroveWeatherFact[];
  readingKey: string;
  stale: boolean;
  source?: string;
  updatedAt?: Date;
};

const CODE_TO_CONDITION = (code?: number): string => {
  if (code == null) return 'cloud';
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly';
  if (code <= 48) return 'cloud';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain';
  if (code <= 77 || (code >= 85 && code <= 86)) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloud';
};

const SNAP_CONDITION: Record<string, string> = {
  clear: 'clear',
  partly: 'partly',
  partly_cloudy: 'partly',
  cloud: 'cloud',
  cloudy: 'cloud',
  rain: 'rain',
  rainy: 'rain',
  snow: 'snow',
  snowy: 'snow',
  storm: 'storm',
  stormy: 'storm',
  missing: 'missing',
};

const frostWatch = (level?: FrostRiskLevel | string | null) => {
  const value = String(level || '').toLowerCase();
  return value === 'moderate' || value === 'high' || value === 'critical';
};

export const presentGroveWeather = (input: {
  field?: FieldWeather | null;
  snapshot?: WeatherData | null;
}): GroveWeatherView => {
  const field = input.field;
  const snap = input.snapshot;
  const current = field?.current;

  if (!current && !snap) {
    return {
      mood: 'missing',
      temperature: null,
      feelsLike: null,
      high: null,
      low: null,
      conditionKey: 'missing',
      facts: [],
      readingKey: 'reading.missing',
      stale: false,
    };
  }

  const temperature = current ? Math.round(current.temperatureC) : snap?.temperature ?? null;
  const apparent = current ? Math.round(current.apparentTemperatureC) : null;
  const feelsLike =
    apparent != null && temperature != null && Math.abs(apparent - temperature) >= 3
      ? apparent
      : null;
  const high = current ? Math.round(current.highC) : snap?.high ?? null;
  const low = current ? Math.round(current.lowC) : snap?.low ?? null;
  const conditionKey = current
    ? CODE_TO_CONDITION(current.weatherCode)
    : SNAP_CONDITION[snap?.condition || ''] || 'cloud';
  const rainNow = current?.precipitationMm ?? snap?.precipitation ?? 0;
  const rain24 = field?.rain?.forecast24hMm ?? snap?.rainForecast24hMm ?? 0;
  const rainPast = field?.rain?.previous24hMm ?? 0;
  const wind = field?.wind?.currentSpeedKmh ?? current?.windSpeedKmh ?? snap?.windSpeed ?? 0;
  const gust = field?.wind?.currentGustKmh ?? current?.windGustKmh ?? 0;
  const windSoon = field?.wind?.maxNext24hKmh ?? 0;
  const humidity = current?.humidityPercent ?? snap?.humidity ?? null;
  const etToday = field?.evapotranspiration?.todayMm;
  const deficit = field?.waterBalance?.balanceMm;
  const frostLevel = field?.frost?.level || snap?.frostLevel;
  const frostMin = field?.frost?.forecastMinTempC ?? low;
  const isFrost = frostWatch(frostLevel) || (frostMin != null && frostMin <= 2);
  const isHeat = (high != null && high >= 36) || (temperature != null && temperature >= 34);
  const isStorm = conditionKey === 'storm';
  const isRain = rainNow >= 0.2 || rain24 >= 1;
  const isWind = wind >= 20 || gust >= 30 || windSoon >= 32;

  const facts: GroveWeatherFact[] = [];
  if (isFrost) {
    facts.push({
      id: 'frost',
      harsh: true,
      labelKey:
        String(frostLevel || '').toLowerCase() === 'critical'
          ? 'fact.frostCritical'
          : frostMin != null
            ? 'fact.frost'
            : 'fact.frostWatch',
      params: frostMin != null ? { temp: Math.round(frostMin) } : undefined,
    });
  }
  if (isHeat) {
    facts.push({
      id: 'heat',
      harsh: true,
      labelKey: 'fact.heat',
      params: { temp: high ?? temperature ?? 0 },
    });
  }
  if (isStorm) {
    facts.push({ id: 'rainNow', harsh: true, labelKey: 'fact.storm' });
  } else if (rainNow >= 0.2) {
    facts.push({
      id: 'rainNow',
      harsh: rainNow >= 2,
      labelKey: 'fact.raining',
      params: { mm: rainNow.toLocaleString(undefined, { maximumFractionDigits: 1 }) },
    });
  } else if (rain24 >= 1) {
    facts.push({
      id: 'rainSoon',
      harsh: rain24 >= 8,
      labelKey: 'fact.rainSoon',
      params: { mm: Math.round(rain24) },
    });
  } else if (rainPast >= 3) {
    facts.push({
      id: 'rainPast',
      harsh: rainPast >= 10,
      labelKey: 'fact.rained',
      params: { mm: Math.round(rainPast) },
    });
  }
  if (wind >= 20 || gust >= 30) {
    facts.push({
      id: 'wind',
      harsh: wind >= 35 || gust >= 45,
      labelKey: gust >= 25 ? 'fact.windGust' : 'fact.wind',
      params: { kmh: Math.round(wind), gust: Math.round(gust) },
    });
  } else if (windSoon >= 32) {
    facts.push({
      id: 'wind',
      harsh: windSoon >= 40,
      labelKey: 'fact.windSoon',
      params: { kmh: Math.round(windSoon) },
    });
  }
  if (facts.length < 3 && isHeat && etToday != null && etToday >= 5) {
    facts.push({
      id: 'et',
      harsh: etToday >= 7,
      labelKey: 'fact.et',
      params: { mm: etToday.toLocaleString(undefined, { maximumFractionDigits: 1 }) },
    });
  } else if (facts.length < 3 && !isFrost && !isStorm && deficit != null && deficit <= -8) {
    facts.push({
      id: 'et',
      harsh: deficit <= -15,
      labelKey: 'fact.deficit',
      params: { mm: Math.round(Math.abs(deficit)) },
    });
  }
  if (
    humidity != null &&
    (humidity >= 88 || humidity <= 22) &&
    facts.length < 3 &&
    (isHeat || isRain || isFrost)
  ) {
    facts.push({
      id: 'humidity',
      harsh: humidity >= 92 || humidity <= 18,
      labelKey: humidity >= 88 ? 'fact.humidityHigh' : 'fact.humidityLow',
      params: { pct: Math.round(humidity) },
    });
  }

  const mood: GroveWeatherMood = isFrost
    ? 'frost'
    : isStorm
      ? 'storm'
      : isHeat
        ? 'heat'
        : rainNow >= 0.2 || rain24 >= 8
          ? 'rain'
          : isWind && (wind >= 35 || gust >= 45)
            ? 'wind'
            : conditionKey === 'clear' || conditionKey === 'partly'
              ? 'clear'
              : conditionKey === 'rain'
                ? 'rain'
                : 'cloud';

  const readingKey = isFrost
    ? 'reading.frost'
    : isStorm
      ? 'reading.storm'
      : isHeat
        ? 'reading.heat'
        : rain24 >= 8
          ? 'reading.rainHeavy'
          : wind >= 35 || gust >= 45 || windSoon >= 40
            ? 'reading.wind'
            : deficit != null && deficit <= -15
              ? 'reading.dry'
              : 'reading.fair';

  return {
    mood,
    temperature,
    feelsLike,
    high,
    low,
    conditionKey,
    facts: facts.slice(0, 3),
    readingKey,
    stale: Boolean(field?.stale || snap?.stale),
    source: field?.metadata?.source || snap?.source,
    updatedAt: field?.lastUpdatedAt
      ? new Date(field.lastUpdatedAt)
      : snap?.lastUpdatedAt,
  };
};
