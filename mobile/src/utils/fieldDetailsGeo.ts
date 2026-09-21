import type {
  EnvironmentalSummary,
  FieldSatelliteObservation,
  SatelliteDate,
  SatelliteSummary,
  SoilSummary,
} from '../services/geospatialService';

export const GREENNESS_FRESH_DAYS = 75;
export const FIRE_NEAR_KM = 25;

export type Greenness = {
  date?: string;
  ndvi?: number;
  ndmi?: number;
  cloud?: number;
  fresh: boolean;
  stale: boolean;
  ageDays: number | null;
  source?: string;
  metadata?: FieldSatelliteObservation['metadata'];
};

export const textureFromFractions = (soil: SoilSummary): string | null => {
  const clay = soil.clayPercent;
  const sand = soil.sandPercent;
  const silt = soil.siltPercent;
  if (clay == null && sand == null && silt == null) return null;
  const c = clay ?? 0;
  const sa = sand ?? 0;
  const si = silt ?? 0;
  if (c >= 40) return 'clay';
  if (sa >= 70 && c < 20) return 'sand';
  if (si >= 50 && c < 27) return 'silt';
  if (c >= 27) return 'clayLoam';
  return 'loam';
};

export const ndviBand = (value?: number): 'high' | 'medium' | 'low' | null => {
  if (value == null) return null;
  if (value >= 0.6) return 'high';
  if (value >= 0.35) return 'medium';
  return 'low';
};

export const daysSince = (iso?: string): number | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.round((Date.now() - then) / 86_400_000);
};

export const sameUtcDay = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;
  return a.slice(0, 10) === b.slice(0, 10);
};

export const pickLatestGreenPass = (dates: SatelliteDate[]): SatelliteDate | null => {
  const usable = dates
    .filter((d) => d.isUsable && d.ndviMean != null)
    .sort((a, b) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime());
  return usable[0] ?? null;
};

export const formatPassDay = (iso: string, locale: string): string =>
  new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

export const nearbyFire = (environment?: EnvironmentalSummary) => {
  if (!environment?.closestFire || environment.closestFire.distanceKm > FIRE_NEAR_KM) return null;
  return environment.closestFire;
};

export const deriveGreenness = (
  dates: SatelliteDate[],
  satellite?: SatelliteSummary,
  latest?: FieldSatelliteObservation | null
): Greenness => {
  const pass = pickLatestGreenPass(dates);
  const date = latest?.observationDate ?? pass?.observationDate ?? satellite?.observationDate;
  const ageDays = daysSince(date);
  const fresh = ageDays != null && ageDays <= GREENNESS_FRESH_DAYS;
  const ndvi = latest?.ndvi?.mean ?? pass?.ndviMean ?? (fresh ? satellite?.ndviMean : undefined);
  const ndmi = fresh
    ? latest?.ndmi?.mean ??
      (sameUtcDay(satellite?.observationDate, date) ? satellite?.ndmiMean : undefined)
    : undefined;
  const cloud =
    latest?.fieldCloudCoverPercent ??
    latest?.cloudCoverPercent ??
    pass?.fieldCloudCoverPercent ??
    pass?.cloudCoverPercent ??
    (fresh ? satellite?.fieldCloudCoverPercent ?? satellite?.cloudCoverPercent : undefined);
  const metadata =
    latest?.metadata ?? (sameUtcDay(satellite?.observationDate, date) ? satellite?.metadata : undefined);

  return {
    date,
    ndvi,
    ndmi,
    cloud,
    fresh,
    stale: Boolean(date && !fresh),
    ageDays,
    source: metadata?.source ?? latest?.source,
    metadata,
  };
};
