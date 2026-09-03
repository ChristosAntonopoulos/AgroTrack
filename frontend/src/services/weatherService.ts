import { geospatialService, FieldWeather } from './geospatialService';

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  icon: string;
  description: string;
  high: number;
  low: number;
  timestamp: Date;
  stale: boolean;
  source: string;
  sourceResolution?: string;
  lastUpdatedAt?: Date;
  rainForecast24hMm?: number;
  frostLevel?: string;
}

const weatherCodeLabel = (code: number): { condition: string; icon: string } => {
  if (code === 0) return { condition: 'clear', icon: '☀️' };
  if (code <= 3) return { condition: 'partly_cloudy', icon: '⛅' };
  if (code <= 48) return { condition: 'cloudy', icon: '☁️' };
  if (code <= 67) return { condition: 'rainy', icon: '🌧️' };
  if (code <= 77) return { condition: 'snowy', icon: '❄️' };
  if (code <= 82) return { condition: 'rainy', icon: '🌦️' };
  if (code <= 86) return { condition: 'snowy', icon: '🌨️' };
  if (code >= 95) return { condition: 'stormy', icon: '⛈️' };
  return { condition: 'cloudy', icon: '☁️' };
};

export const toWeatherData = (weather: FieldWeather): WeatherData | null => {
  if (!weather.current) return null;
  const meta = weatherCodeLabel(weather.current.weatherCode);
  return {
    temperature: Math.round(weather.current.temperatureC),
    condition: meta.condition,
    humidity: Math.round(weather.current.humidityPercent),
    windSpeed: Math.round(weather.current.windSpeedKmh),
    precipitation: weather.current.precipitationMm,
    icon: meta.icon,
    description: weather.current.description,
    high: Math.round(weather.current.highC),
    low: Math.round(weather.current.lowC),
    timestamp: new Date(),
    stale: weather.stale,
    source: weather.metadata.source,
    sourceResolution: weather.metadata.spatialResolution,
    lastUpdatedAt: weather.lastUpdatedAt ? new Date(weather.lastUpdatedAt) : undefined,
    rainForecast24hMm: weather.rain?.forecast24hMm,
    frostLevel: weather.frost?.level,
  };
};

/**
 * Weather is served from the AgroTrack backend cache. The browser never calls
 * an external weather provider directly.
 */
export const weatherService = {
  getFieldWeather: (fieldId: string): Promise<FieldWeather> => geospatialService.getFieldWeather(fieldId),

  async getFieldWeatherData(fieldId: string): Promise<WeatherData | null> {
    const weather = await geospatialService.getFieldWeather(fieldId);
    return toWeatherData(weather);
  },
};
