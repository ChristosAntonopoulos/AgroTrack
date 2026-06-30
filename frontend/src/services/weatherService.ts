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

export const weatherService = {
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code'
    );
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,weather_code');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error('Weather unavailable');
    }

    const data = await res.json();
    const code = data.current?.weather_code ?? 0;
    const meta = weatherCodeLabel(code);

    return {
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
  },
};
