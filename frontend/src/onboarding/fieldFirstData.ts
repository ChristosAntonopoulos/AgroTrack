import { geospatialService } from '../services/geospatialService';
import { spatialStatusFromProfiles } from './evaluate';

export type FirstDataFlags = {
  weather: boolean;
  satellite: boolean;
  personalized: boolean;
  failed: boolean;
};

/** Kick backend jobs so the first grove pack can fill in. */
export const kickoffFieldFirstData = async (fieldId: string): Promise<void> => {
  await Promise.all([
    geospatialService.refreshIntelligence(fieldId).catch(() => undefined),
    geospatialService.requestHistoryBackfill(fieldId).catch(() => undefined),
    geospatialService.refreshSatellite(fieldId).catch(() => undefined),
  ]);
};

/** One poll of weather + satellite + terrain/profile for the post-όρια sequence. */
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

/** How many leading stages are complete (weather → satellite → personalized). */
export const leadingReadyCount = (flags: FirstDataFlags): number => {
  if (!flags.weather) return 0;
  if (!flags.satellite) return 1;
  if (!flags.personalized) return 2;
  return 3;
};

/** Core pack for welcome: weather + grove profile. Satellite may still be filling. */
export const coreFirstDataReady = (flags: FirstDataFlags): boolean =>
  flags.weather && flags.personalized;
