import { Field } from '../services/fieldService';

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

export const formatFieldArea = (field: Field): string => {
  const sqm =
    field.appMeasuredAreaSqm ??
    (field.area > 0 && field.area < 500 ? field.area : field.area > 0 ? field.area * 10000 : undefined);

  if (sqm != null && sqm > 0) {
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha`;
    }
    return `${Math.round(sqm)} m²`;
  }

  return '—';
};

export const formatFieldAreaSqm = (field: Field): number | undefined => {
  if (field.appMeasuredAreaSqm != null && field.appMeasuredAreaSqm > 0) {
    return field.appMeasuredAreaSqm;
  }
  if (field.area > 0 && field.area < 500) {
    return field.area;
  }
  if (field.area > 0) {
    return field.area * 10000;
  }
  return undefined;
};
