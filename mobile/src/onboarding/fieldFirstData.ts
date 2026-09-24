import { geospatialService } from '../services/geospatialService';
import { spatialStatusFromProfiles } from './evaluate';

export type FirstDataFlags = {
  weather: boolean;
  satellite: boolean;
  personalized: boolean;
  failed: boolean;
};

export const kickoffFieldFirstData = async (fieldId: string): Promise<void> => {
  await Promise.all([
    geospatialService.refreshIntelligence(fieldId).catch(() => undefined),
    geospatialService.requestHistoryBackfill(fieldId).catch(() => undefined),
    geospatialService.refreshSatellite(fieldId).catch(() => undefined),
  ]);
};

export const pollFieldFirstData = async (fieldId: string): Promise<FirstDataFlags> => {
  const [weather, profile, summary, observations, dates] = await Promise.all([
    geospatialService.getFieldWeather(fieldId).catch(() => null),
    geospatialService.getSpatialProfile(fieldId).catch(() => null),
    geospatialService.getIntelligence(fieldId).catch(() => null),
    geospatialService.getSatelliteObservations(fieldId).catch(() => [] as Awaited<
      ReturnType<typeof geospatialService.getSatelliteObservations>
    >),
    geospatialService.getSatelliteDates(fieldId).catch(() => [] as Awaited<
      ReturnType<typeof geospatialService.getSatelliteDates>
    >),
  ]);

  const weatherReady = Boolean(weather?.current && Number.isFinite(weather.current.temperatureC));
  const satelliteReady =
    observations.some((o) => o.isUsable) || (Array.isArray(dates) && dates.length > 0);
  const spatial = spatialStatusFromProfiles(profile, summary);
  const personalizedReady = spatial === 'ready';
  const failed = spatial === 'failed' && !weatherReady && !personalizedReady;

  return {
    weather: weatherReady,
    satellite: satelliteReady,
    personalized: personalizedReady,
    failed,
  };
};

export const leadingReadyCount = (flags: FirstDataFlags): number => {
  if (!flags.weather) return 0;
  if (!flags.satellite) return 1;
  if (!flags.personalized) return 2;
  return 3;
};

export const coreFirstDataReady = (flags: FirstDataFlags): boolean =>
  flags.weather && flags.personalized;
