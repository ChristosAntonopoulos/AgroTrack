import { useState, useEffect, useCallback } from 'react';
import { Field } from '../services/fieldService';
import { weatherService, WeatherData } from '../services/weatherService';

export interface UseDashboardWeatherResult {
  weather: WeatherData | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useDashboardWeather = (fields: Field[]): UseDashboardWeatherResult => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const withCoords = fields.find(f => f.latitude != null && f.longitude != null);
    const lat = withCoords?.latitude ?? 37.9838;
    const lng = withCoords?.longitude ?? 23.7275;

    try {
      setLoading(true);
      const data = await weatherService.getCurrentWeather(lat, lng);
      setWeather(data);
    } catch {
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [fields]);

  useEffect(() => {
    load();
  }, [load]);

  return { weather, loading, refresh: load };
};
