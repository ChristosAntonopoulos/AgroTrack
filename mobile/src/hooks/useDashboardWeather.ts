import { useState, useEffect, useCallback } from 'react';
import { Field } from '../services/fieldService';
import { weatherService, WeatherData } from '../services/weatherService';

export interface UseDashboardWeatherResult {
  weather: WeatherData | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Dashboard weather uses the first field the user has, so the reading always
 * comes from Oleachron's cache for a field they can actually access.
 */
export const useDashboardWeather = (fields: Field[]): UseDashboardWeatherResult => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  const primaryFieldId = fields.find(
    f => f.centerPoint != null || (f.latitude != null && f.longitude != null)
  )?.id;

  const load = useCallback(async () => {
    if (!primaryFieldId) {
      setWeather(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await weatherService.getFieldWeatherData(primaryFieldId);
      setWeather(data);
    } catch {
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [primaryFieldId]);

  useEffect(() => {
    load();
  }, [load]);

  return { weather, loading, refresh: load };
};
