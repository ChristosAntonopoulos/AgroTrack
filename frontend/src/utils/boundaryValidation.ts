import type { GeoJsonPolygon } from '../services/fieldService';
import { SQM_PER_STREMMA } from './area';

/** Minimum plausible grove area (rejects accidental tiny clicks). */
export const MIN_BOUNDARY_AREA_SQM = 50;

/** Soft warning threshold — olive grove typically far below this. */
export const WARN_BOUNDARY_AREA_SQM = 100 * SQM_PER_STREMMA;

/** Hard max for a single olive grove (Greece-first). */
export const MAX_BOUNDARY_AREA_SQM = 2_000 * SQM_PER_STREMMA;

/** Reject polygons whose vertices span more than this (metres). */
export const MAX_VERTEX_SPAN_METERS = 50_000;

/** Zoom must be at least this to place corners (grove scale, not country). */
export const MIN_DRAW_ZOOM = 14;

/** Reject vertices within this distance of (0,0) — common geocode / swap failure. */
export const NULL_ISLAND_EPSILON_DEG = 0.05;

const EARTH_RADIUS_M = 6_378_137;

export type BoundaryValidationCode =
  | 'tooFewPoints'
  | 'selfIntersect'
  | 'tooSmall'
  | 'tooLarge'
  | 'excessiveSpan'
  | 'zoomTooLow'
  | 'invalidCoordinates'
  | 'nullIsland'
  | 'swappedLatLng';

export type BoundaryValidationResult =
  | { ok: true; areaSqm: number; warnLarge?: boolean }
  | { ok: false; code: BoundaryValidationCode; areaSqm?: number };

const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const estimateGeodesicAreaSqm = (ring: number[][]): number => {
  const rad = Math.PI / 180;
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    total += (lon2 * rad - lon1 * rad) * (2 + Math.sin(lat1 * rad) + Math.sin(lat2 * rad));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
};

/** Open ring (no closing duplicate) as [lng, lat] pairs. */
const openRingFromPolygon = (boundary: GeoJsonPolygon): number[][] | null => {
  const ring = boundary.coordinates?.[0];
  if (!ring || ring.length < 3) return null;
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  return closed ? ring.slice(0, -1) : ring;
};

const segmentsIntersect = (
  a1: number[],
  a2: number[],
  b1: number[],
  b2: number[]
): boolean => {
  const orient = (p: number[], q: number[], r: number[]) => {
    const v = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
    if (Math.abs(v) < 1e-12) return 0;
    return v > 0 ? 1 : 2;
  };
  const onSegment = (p: number[], q: number[], r: number[]) =>
    q[0] <= Math.max(p[0], r[0]) + 1e-12 &&
    q[0] >= Math.min(p[0], r[0]) - 1e-12 &&
    q[1] <= Math.max(p[1], r[1]) + 1e-12 &&
    q[1] >= Math.min(p[1], r[1]) - 1e-12;

  const o1 = orient(a1, a2, b1);
  const o2 = orient(a1, a2, b2);
  const o3 = orient(b1, b2, a1);
  const o4 = orient(b1, b2, a2);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(a1, b1, a2)) return true;
  if (o2 === 0 && onSegment(a1, b2, a2)) return true;
  if (o3 === 0 && onSegment(b1, a1, b2)) return true;
  if (o4 === 0 && onSegment(b1, a2, b2)) return true;
  return false;
};

export const ringSelfIntersects = (openRing: number[][]): boolean => {
  const n = openRing.length;
  if (n < 4) return false;
  const closed = [...openRing, openRing[0]];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
      if (
        segmentsIntersect(closed[i], closed[i + 1], closed[j], closed[j + 1])
      ) {
        return true;
      }
    }
  }
  return false;
};

export const maxVertexSpanMeters = (openRing: number[][]): number => {
  let max = 0;
  for (let i = 0; i < openRing.length; i++) {
    for (let j = i + 1; j < openRing.length; j++) {
      const d = haversineMeters(
        openRing[i][1],
        openRing[i][0],
        openRing[j][1],
        openRing[j][0]
      );
      if (d > max) max = d;
    }
  }
  return max;
};

/** Geographic sanity for GeoJSON [lng, lat] vertices. */
export const validateRingCoordinates = (
  openRing: number[][]
): BoundaryValidationCode | null => {
  let nearNullIsland = 0;
  let suggestiveSwap = 0;

  for (const pair of openRing) {
    if (!pair || pair.length < 2) return 'invalidCoordinates';
    const [lng, lat] = pair;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return 'invalidCoordinates';
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      // Classic swap: "lat" stored in lng slot beyond ±90.
      if (Math.abs(lng) <= 90 && Math.abs(lat) <= 180) return 'swappedLatLng';
      return 'invalidCoordinates';
    }
    if (Math.abs(lat) < NULL_ISLAND_EPSILON_DEG && Math.abs(lng) < NULL_ISLAND_EPSILON_DEG) {
      nearNullIsland += 1;
    }
    // Greece-first olive product: latitudes are ~34–42, longitudes ~19–29.
    // If the "latitude" looks like a Greek longitude and vice versa, flag swap.
    if (lat >= 19 && lat <= 30 && Math.abs(lng) >= 34 && Math.abs(lng) <= 43) {
      suggestiveSwap += 1;
    }
  }

  if (nearNullIsland === openRing.length) return 'nullIsland';
  if (suggestiveSwap === openRing.length) return 'swappedLatLng';
  return null;
};

export const validateBoundaryPolygon = (
  boundary: GeoJsonPolygon | undefined,
  options?: { mapZoom?: number }
): BoundaryValidationResult => {
  if (options?.mapZoom != null && options.mapZoom < MIN_DRAW_ZOOM) {
    return { ok: false, code: 'zoomTooLow' };
  }

  const open = boundary ? openRingFromPolygon(boundary) : null;
  if (!open || open.length < 3) {
    return { ok: false, code: 'tooFewPoints' };
  }

  const coordIssue = validateRingCoordinates(open);
  if (coordIssue) {
    return { ok: false, code: coordIssue };
  }

  if (ringSelfIntersects(open)) {
    return { ok: false, code: 'selfIntersect' };
  }

  if (maxVertexSpanMeters(open) > MAX_VERTEX_SPAN_METERS) {
    return { ok: false, code: 'excessiveSpan' };
  }

  const closed = [...open, open[0]];
  const areaSqm = estimateGeodesicAreaSqm(closed);

  if (areaSqm < MIN_BOUNDARY_AREA_SQM) {
    return { ok: false, code: 'tooSmall', areaSqm };
  }
  if (areaSqm > MAX_BOUNDARY_AREA_SQM) {
    return { ok: false, code: 'tooLarge', areaSqm };
  }

  return {
    ok: true,
    areaSqm,
    warnLarge: areaSqm > WARN_BOUNDARY_AREA_SQM,
  };
};
