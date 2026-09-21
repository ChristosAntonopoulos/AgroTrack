import type { Field } from '../services/fieldService';
import { calculateDistance } from '../services/locationService';
import { resolveFieldCenter, resolveFieldPolygon, type LatLng } from './fieldGeo';

/** Client prefilter radius around field center when not inside a boundary (metres). */
export const FIELD_NEAR_RADIUS_METRES = 400;

/**
 * Ray-casting point-in-polygon. Ring may be open or closed.
 * Coordinates are { latitude, longitude }.
 */
export const isPointInPolygon = (point: LatLng, ring: LatLng[]): boolean => {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].longitude;
    const yi = ring[i].latitude;
    const xj = ring[j].longitude;
    const yj = ring[j].latitude;
    const intersects =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

/** True when lat/lng is inside a field boundary or within radius of its center. */
export const isNearField = (
  latitude: number,
  longitude: number,
  field: Field,
  radiusMetres = FIELD_NEAR_RADIUS_METRES
): boolean => {
  const point = { latitude, longitude };
  const polygon = resolveFieldPolygon(field);
  if (polygon && polygon.length >= 3 && isPointInPolygon(point, polygon)) {
    return true;
  }
  const center = resolveFieldCenter(field);
  if (!center) return false;
  const distanceKm = calculateDistance(latitude, longitude, center.latitude, center.longitude);
  return distanceKm * 1000 <= radiusMetres;
};

export const isNearAnyField = (
  latitude: number,
  longitude: number,
  fields: Field[],
  radiusMetres = FIELD_NEAR_RADIUS_METRES
): boolean => fields.some((field) => isNearField(latitude, longitude, field, radiusMetres));
