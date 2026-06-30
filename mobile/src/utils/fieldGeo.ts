import { Field } from '../services/fieldService';

export type LatLng = { latitude: number; longitude: number };

export const polygonCentroid = (points: LatLng[]): LatLng => {
  let latSum = 0;
  let lngSum = 0;
  points.forEach((p) => {
    latSum += p.latitude;
    lngSum += p.longitude;
  });
  return { latitude: latSum / points.length, longitude: lngSum / points.length };
};

export const resolveFieldCenter = (field: Field): LatLng | null => {
  const ring = field.boundary?.coordinates?.[0];
  if (ring?.length) {
    if (field.centerPoint?.coordinates?.length === 2) {
      return {
        latitude: field.centerPoint.coordinates[1],
        longitude: field.centerPoint.coordinates[0],
      };
    }
    const polygon = ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    return polygonCentroid(polygon);
  }

  if (field.centerPoint?.coordinates?.length === 2) {
    return {
      latitude: field.centerPoint.coordinates[1],
      longitude: field.centerPoint.coordinates[0],
    };
  }

  if (typeof field.latitude === 'number' && typeof field.longitude === 'number') {
    return { latitude: field.latitude, longitude: field.longitude };
  }

  return null;
};

export const resolveFieldPolygon = (field: Field): LatLng[] | undefined => {
  const ring = field.boundary?.coordinates?.[0];
  if (!ring?.length) return undefined;
  return ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
};

export const formatFieldArea = (field: Field): string => {
  const sqm = formatFieldAreaSqm(field);
  if (sqm != null && sqm > 0) {
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha`;
    }
    return `${Math.round(sqm)} m²`;
  }
  return '—';
};

export const formatFieldAreaSqm = (field: Field): number | undefined => {
  if (field.appMeasuredAreaSqm != null && field.appMeasuredAreaSqm > 0 && field.boundary) {
    return field.appMeasuredAreaSqm;
  }

  const raw = field.appMeasuredAreaSqm ?? field.area;
  if (raw == null || raw <= 0) return undefined;

  if (field.boundary || raw >= 10000) {
    return raw;
  }

  // Legacy fields without boundary store area in hectares (e.g. mock 12.5 ha).
  // Whole numbers from 100–999 may be sqm; decimals and small whole values are hectares.
  if (raw < 1000) {
    if (!Number.isInteger(raw) || raw < 100) {
      return raw * 10000;
    }
    return raw;
  }

  return raw;
};

export const fieldHasGeo = (field: Field): boolean => resolveFieldCenter(field) != null;

export const regionForPolygon = (
  polygon: LatLng[],
  paddingFactor = 1.4,
  minDelta = 0.005
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } => {
  const lats = polygon.map((p) => p.latitude);
  const lngs = polygon.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * paddingFactor, minDelta),
    longitudeDelta: Math.max((maxLng - minLng) * paddingFactor, minDelta),
  };
};

export const regionForCenter = (
  center: LatLng,
  delta = 0.01
): { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } => ({
  latitude: center.latitude,
  longitude: center.longitude,
  latitudeDelta: delta,
  longitudeDelta: delta,
});
