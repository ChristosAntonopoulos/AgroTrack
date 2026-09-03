import { geospatialService, FieldWeather } from './geospatialService';

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  pressure?: number;
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

export interface WeatherAlert {
  type: 'frost' | 'drought' | 'storm' | 'wind' | 'heat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  startDate: Date;
  endDate: Date;
}

export interface IrrigationRecommendation {
  recommended: boolean;
  reason: string;
  amount?: number;
  urgency: 'low' | 'medium' | 'high';
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
 * Derives display alerts from the backend's already-computed intelligence so
 * thresholds stay in one place (backend configuration) rather than on device.
 */
const deriveAlerts = (weather: FieldWeather): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (weather.frost.level !== 'None') {
    const severity: WeatherAlert['severity'] =
      weather.frost.level === 'Critical'
        ? 'critical'
        : weather.frost.level === 'High'
          ? 'high'
          : weather.frost.level === 'Moderate'
            ? 'medium'
            : 'low';
    const window = weather.frost.window ? ` (${weather.frost.window})` : '';
    alerts.push({
      type: 'frost',
      severity,
      message: `Frost risk ${weather.frost.level}${window}. Forecast minimum ${weather.frost.forecastMinTempC?.toFixed(1) ?? '?'}°C.`,
      startDate: now,
      endDate: tomorrow,
    });
  }

  if (weather.wind.maxNext24hKmh >= 40) {
    alerts.push({
      type: 'wind',
      severity: weather.wind.maxNext24hKmh >= 60 ? 'high' : 'medium',
      message: `Strong wind expected — up to ${Math.round(weather.wind.maxNext24hKmh)} km/h in the next 24 hours.`,
      startDate: now,
      endDate: tomorrow,
    });
  }

  if ((weather.current?.temperatureC ?? 0) >= 35) {
    alerts.push({
      type: 'heat',
      severity: (weather.current?.temperatureC ?? 0) >= 38 ? 'high' : 'medium',
      message: 'High heat — plan irrigation and avoid midday field work.',
      startDate: now,
      endDate: tomorrow,
    });
  }

  return alerts;
};

/**
 * Weather is served from the AgroTrack backend cache; the device never calls an
 * external weather provider directly.
 */
export const weatherService = {
  getFieldWeather: (fieldId: string): Promise<FieldWeather | null> =>
    geospatialService.getFieldWeather(fieldId),

  async getFieldWeatherData(fieldId: string): Promise<WeatherData | null> {
    const weather = await geospatialService.getFieldWeather(fieldId);
    return weather ? toWeatherData(weather) : null;
  },

  async getFieldWeatherAlerts(fieldId: string): Promise<WeatherAlert[]> {
    const weather = await geospatialService.getFieldWeather(fieldId);
    return weather ? deriveAlerts(weather) : [];
  },

  getIrrigationRecommendation(
    field: { irrigationStatus: boolean; currentLifecycleYear: string },
    weather: FieldWeather
  ): IrrigationRecommendation {
    // Significant forecast rain outweighs current dryness.
    if (weather.rain.forecast24hMm >= 5) {
      return {
        recommended: false,
        reason: `${weather.rain.forecast24hMm.toFixed(1)} mm rain forecast in the next 24 hours.`,
        urgency: 'low',
      };
    }

    const temperature = weather.current?.temperatureC ?? 0;
    const humidity = weather.current?.humidityPercent ?? 100;
    const needsWater =
      weather.rain.previous24hMm === 0 &&
      humidity < 50 &&
      (field.currentLifecycleYear === 'high' || temperature > 25);

    if (needsWater) {
      return {
        recommended: true,
        reason: `Low humidity (${Math.round(humidity)}%) and no recent rain.`,
        amount: field.currentLifecycleYear === 'high' ? 15 : 10,
        urgency: temperature > 30 || humidity < 30 ? 'high' : temperature > 25 ? 'medium' : 'low',
      };
    }

    return {
      recommended: false,
      reason:
        weather.rain.previous24hMm > 0
          ? `Recent rain (${weather.rain.previous24hMm.toFixed(1)} mm)`
          : `Adequate humidity (${Math.round(humidity)}%)`,
      urgency: 'low',
    };
  },

  isWorkable(weather: WeatherData): boolean {
    return weather.precipitation < 10 && weather.condition !== 'stormy' && weather.windSpeed < 30;
  },
};
