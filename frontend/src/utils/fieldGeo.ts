import { Field } from '../services/fieldService';
import { formatFieldArea as formatFieldAreaCanonical, formatFieldAreaSqm as resolveAreaSqm, resolveFieldAreaSqm } from './area';

export const polygonCentroid = (ring: [number, number][]): [number, number] => {
  let latSum = 0;
  let lngSum = 0;
  ring.forEach(([lat, lng]) => {
    latSum += lat;
    lngSum += lng;
  });
  return [latSum / ring.length, lngSum / ring.length];
};

export const resolveFieldCenter = (field: Field): [number, number] | null => {
  const ring = field.boundary?.coordinates?.[0];
  if (ring?.length) {
    const polygon = ring.map(([lng, lat]) => [lat, lng] as [number, number]);
    if (field.centerPoint?.coordinates?.length === 2) {
      return [field.centerPoint.coordinates[1], field.centerPoint.coordinates[0]];
    }
    return polygonCentroid(polygon);
  }

  if (field.centerPoint?.coordinates?.length === 2) {
    return [field.centerPoint.coordinates[1], field.centerPoint.coordinates[0]];
  }

  if (typeof field.latitude === 'number' && typeof field.longitude === 'number') {
    return [field.latitude, field.longitude];
  }

  return null;
};

export const resolveFieldPolygon = (field: Field): [number, number][] | undefined => {
  const ring = field.boundary?.coordinates?.[0];
  if (!ring?.length) return undefined;
  return ring.map(([lng, lat]) => [lat, lng] as [number, number]);
};

export { resolveFieldAreaSqm };

export const formatFieldArea = (
  field: Field,
  locale: 'el' | 'en' | 'it' = 'el'
): string => formatFieldAreaCanonical(field, { locale });

export const formatFieldAreaSqm = (field: Field): number | undefined => resolveAreaSqm(field);
