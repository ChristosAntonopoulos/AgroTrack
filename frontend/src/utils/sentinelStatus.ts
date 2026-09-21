import type { SatelliteDate } from '../services/geospatialService';

export type SentinelStatusKind =
  | 'Processing'
  | 'Ready'
  | 'NoClearAcquisition'
  | 'Failed'
  | 'Outdated';

export type SentinelStatus = {
  kind: SentinelStatusKind;
  latestUsable: SatelliteDate | null;
  latestAny: SatelliteDate | null;
  ageDays: number | null;
  cloudPercent: number | null;
  ndviMean: number | null;
  /** True when the latest usable scene is older than the freshness window (still Ready, not "none"). */
  isStale: boolean;
};

/** Soft freshness for "current" greenness copy — does not mean "no data". */
export const SENTINEL_FRESH_DAYS = 75;

const daysSince = (iso?: string): number | null => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.round((Date.now() - then) / 86_400_000);
};

export const pickLatestUsableSatellite = (dates: SatelliteDate[]): SatelliteDate | null => {
  const usable = dates
    .filter((d) => d.isUsable && d.ndviMean != null)
    .sort((a, b) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime());
  return usable[0] ?? null;
};

export const resolveSentinelStatus = (
  dates: SatelliteDate[],
  options?: { processing?: boolean; failed?: boolean }
): SentinelStatus => {
  if (options?.failed) {
    return {
      kind: 'Failed',
      latestUsable: null,
      latestAny: dates[0] ?? null,
      ageDays: null,
      cloudPercent: null,
      ndviMean: null,
      isStale: false,
    };
  }
  if (options?.processing && dates.length === 0) {
    return {
      kind: 'Processing',
      latestUsable: null,
      latestAny: null,
      ageDays: null,
      cloudPercent: null,
      ndviMean: null,
      isStale: false,
    };
  }

  const latestUsable = pickLatestUsableSatellite(dates);
  const latestAny =
    [...dates].sort(
      (a, b) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime()
    )[0] ?? null;

  if (!latestUsable) {
    return {
      kind: dates.length > 0 ? 'NoClearAcquisition' : 'NoClearAcquisition',
      latestUsable: null,
      latestAny,
      ageDays: daysSince(latestAny?.observationDate),
      cloudPercent: latestAny
        ? Math.round(latestAny.fieldCloudCoverPercent ?? latestAny.cloudCoverPercent ?? 0)
        : null,
      ndviMean: null,
      isStale: false,
    };
  }

  const ageDays = daysSince(latestUsable.observationDate);
  const isStale = ageDays != null && ageDays > SENTINEL_FRESH_DAYS;

  return {
    kind: isStale ? 'Outdated' : 'Ready',
    latestUsable,
    latestAny,
    ageDays,
    cloudPercent: Math.round(
      latestUsable.fieldCloudCoverPercent ?? latestUsable.cloudCoverPercent ?? 0
    ),
    ndviMean: latestUsable.ndviMean ?? null,
    isStale,
  };
};

export const formatSatellitePassLabel = (
  date: SatelliteDate,
  locale: string,
  options?: { includeNdvi?: boolean; includeCloud?: boolean }
): string => {
  const when = new Date(date.observationDate).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const parts = [when];
  if (options?.includeNdvi !== false && date.ndviMean != null) {
    parts.push(
      `NDVI ${date.ndviMean.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  } else if (date.ndviMean == null && options?.includeNdvi !== false) {
    parts.push('NDVI —');
  }
  if (options?.includeCloud !== false) {
    const cloud = date.fieldCloudCoverPercent ?? date.cloudCoverPercent;
    if (cloud != null && Number.isFinite(cloud)) {
      parts.push(`${Math.round(cloud)}%`);
    }
  }
  return parts.join(' · ');
};

export const groupSatelliteDatesByYear = (
  dates: SatelliteDate[]
): Array<{ year: number; dates: SatelliteDate[] }> => {
  const map = new Map<number, SatelliteDate[]>();
  for (const d of dates) {
    const year = new Date(d.observationDate).getFullYear();
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(d);
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({
      year,
      dates: list.sort(
        (a, b) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime()
      ),
    }));
};
