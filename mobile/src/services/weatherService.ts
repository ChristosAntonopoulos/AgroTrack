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
}

export interface ForecastData {
  date: Date;
  high: number;
  low: number;
  condition: string;
  precipitation: number;
  icon: string;
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

const weatherCodeLabel = (code: number): { condition: string; icon: string; description: string } => {
  if (code === 0) return { condition: 'clear', icon: '☀️', description: 'Clear sky' };
  if (code <= 3) return { condition: 'partly_cloudy', icon: '⛅', description: 'Partly cloudy' };
  if (code <= 48) return { condition: 'cloudy', icon: '☁️', description: 'Cloudy' };
  if (code <= 67) return { condition: 'rainy', icon: '🌧️', description: 'Rain' };
  if (code <= 77) return { condition: 'snowy', icon: '❄️', description: 'Snow' };
  if (code <= 82) return { condition: 'rainy', icon: '🌦️', description: 'Rain showers' };
  if (code <= 86) return { condition: 'snowy', icon: '🌨️', description: 'Snow showers' };
  if (code >= 95) return { condition: 'stormy', icon: '⛈️', description: 'Thunderstorm' };
  return { condition: 'cloudy', icon: '☁️', description: 'Cloudy' };
};

const deriveAlerts = (weather: WeatherData): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (weather.low <= 2) {
    alerts.push({
      type: 'frost',
      severity: weather.low <= 0 ? 'high' : 'medium',
      message: 'Frost risk: overnight temperatures may drop near freezing.',
      startDate: now,
      endDate: tomorrow,
    });
  }

  if (weather.condition === 'stormy' || weather.windSpeed >= 40) {
    alerts.push({
      type: 'storm',
      severity: weather.windSpeed >= 50 ? 'high' : 'medium',
      message: 'Strong wind or storm conditions — field work may be unsafe.',
      startDate: now,
      endDate: tomorrow,
    });
  }

  if (weather.temperature >= 35) {
    alerts.push({
      type: 'heat',
      severity: weather.temperature >= 38 ? 'high' : 'medium',
      message: 'High heat — plan irrigation and avoid midday field work.',
      startDate: now,
      endDate: tomorrow,
    });
  }

  return alerts;
};

export interface WeatherService {
  getCurrentWeather(lat: number, lng: number): Promise<WeatherData>;
  getForecast(lat: number, lng: number, days?: number): Promise<ForecastData[]>;
  getWeatherAlerts(lat: number, lng: number): Promise<WeatherAlert[]>;
  getIrrigationRecommendation(
    field: { irrigationStatus: boolean; currentLifecycleYear: string },
    weather: WeatherData
  ): IrrigationRecommendation;
  isWorkable(weather: WeatherData): boolean;
}

class WeatherServiceImpl implements WeatherService {
  private cache = new Map<string, { data: WeatherData; timestamp: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000;

  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code'
    );
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '7');

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error('Weather unavailable');
    }

    const data = await res.json();
    const code = data.current?.weather_code ?? 0;
    const meta = weatherCodeLabel(code);

    const weather: WeatherData = {
      temperature: Math.round(data.current.temperature_2m),
      condition: meta.condition,
      humidity: Math.round(data.current.relative_humidity_2m),
      windSpeed: Math.round(data.current.wind_speed_10m),
      precipitation: data.current.precipitation ?? 0,
      icon: meta.icon,
      description: meta.description,
      high: Math.round(data.daily?.temperature_2m_max?.[0] ?? data.current.temperature_2m),
      low: Math.round(data.daily?.temperature_2m_min?.[0] ?? data.current.temperature_2m),
      timestamp: new Date(),
    };

    this.cache.set(cacheKey, { data: weather, timestamp: Date.now() });
    return weather;
  }

  async getForecast(lat: number, lng: number, days = 7): Promise<ForecastData[]> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', String(days));

    const res = await fetch(url.toString());
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const times: string[] = data.daily?.time ?? [];
    return times.map((time, i) => {
      const code = data.daily?.weather_code?.[i] ?? 0;
      const meta = weatherCodeLabel(code);
      return {
        date: new Date(time),
        high: Math.round(data.daily.temperature_2m_max[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        condition: meta.condition,
        precipitation: data.daily.precipitation_sum?.[i] ?? 0,
        icon: meta.icon,
      };
    });
  }

  async getWeatherAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
    try {
      const weather = await this.getCurrentWeather(lat, lng);
      return deriveAlerts(weather);
    } catch {
      return [];
    }
  }

  getIrrigationRecommendation(
    field: { irrigationStatus: boolean; currentLifecycleYear: string },
    weather: WeatherData
  ): IrrigationRecommendation {
    const needsWater =
      weather.precipitation === 0 &&
      weather.humidity < 50 &&
      (field.currentLifecycleYear === 'high' || weather.temperature > 25);

    if (needsWater) {
      const amount = field.currentLifecycleYear === 'high' ? 15 : 10;
      const urgency =
        weather.temperature > 30 || weather.humidity < 30
          ? 'high'
          : weather.temperature > 25
            ? 'medium'
            : 'low';

      return {
        recommended: true,
        reason: `Low humidity (${weather.humidity}%) and no precipitation.`,
        amount,
        urgency,
      };
    }

    return {
      recommended: false,
      reason:
        weather.precipitation > 0
          ? `Recent precipitation (${weather.precipitation}mm)`
          : `Adequate humidity (${weather.humidity}%)`,
      urgency: 'low',
    };
  }

  isWorkable(weather: WeatherData): boolean {
    return weather.precipitation < 10 && weather.condition !== 'stormy' && weather.windSpeed < 30;
  }
}

export const weatherService: WeatherService = new WeatherServiceImpl();
