import type { Position } from 'geojson';
import { LatLng } from './fieldGeo';

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export const latLngToPosition = (point: LatLng): Position => [point.longitude, point.latitude];

export const positionToLatLng = (position: Position): LatLng => ({
  latitude: position[1],
  longitude: position[0],
});

export const boundsFromPoints = (
  points: LatLng[]
): { ne: Position; sw: Position } | null => {
  if (points.length === 0) return null;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  return {
    ne: [Math.max(...lngs), Math.max(...lats)],
    sw: [Math.min(...lngs), Math.min(...lats)],
  };
};

export const deltaToZoom = (latitudeDelta: number): number => {
  const delta = Math.max(latitudeDelta, 0.00008);
  return Math.min(Math.max(Math.log2(360 / delta) - 8.2, 4), 19);
};

/** Inverse of deltaToZoom — minimum lat span for a given zoom ceiling. */
export const zoomToLatitudeDelta = (zoom: number): number =>
  360 / Math.pow(2, zoom + 8.2);

export const capRegionZoom = (region: MapRegion, maxZoom: number): MapRegion => {
  const minDelta = zoomToLatitudeDelta(maxZoom);
  return {
    ...region,
    latitudeDelta: Math.max(region.latitudeDelta, minDelta),
    longitudeDelta: Math.max(region.longitudeDelta, minDelta),
  };
};

export const expandBoundsForMaxZoom = (
  bounds: { ne: Position; sw: Position },
  maxZoom: number
): { ne: Position; sw: Position } => {
  const minDelta = zoomToLatitudeDelta(maxZoom);
  const [neLng, neLat] = bounds.ne;
  const [swLng, swLat] = bounds.sw;
  const centerLat = (neLat + swLat) / 2;
  const centerLng = (neLng + swLng) / 2;
  const halfLat = Math.max((neLat - swLat) / 2, minDelta / 2);
  const halfLng = Math.max((neLng - swLng) / 2, minDelta / 2);
  return {
    ne: [centerLng + halfLng, centerLat + halfLat],
    sw: [centerLng - halfLng, centerLat - halfLat],
  };
};

export const regionToCameraStop = (region: MapRegion, maxZoom?: number) => {
  const capped = maxZoom != null ? capRegionZoom(region, maxZoom) : region;
  return {
    centerCoordinate: [capped.longitude, capped.latitude] as Position,
    zoomLevel: deltaToZoom(capped.latitudeDelta),
    animationDuration: 0,
  };
};

export const ringToPolygonFeature = (
  id: string,
  ring: LatLng[],
  properties: Record<string, unknown> = {}
): GeoJSON.Feature<GeoJSON.Polygon> => {
  const coords = ring.map(latLngToPosition);
  const closed =
    coords.length > 0 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
      ? coords
      : [...coords, coords[0]];

  return {
    type: 'Feature',
    id,
    properties,
    geometry: {
      type: 'Polygon',
      coordinates: [closed],
    },
  };
};

export const pointsToFeatureCollection = (
  points: Array<{ id: string; coordinate: LatLng; properties?: Record<string, unknown> }>
): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: points.map(({ id, coordinate, properties }) => ({
    type: 'Feature',
    id,
    properties: properties ?? {},
    geometry: {
      type: 'Point',
      coordinates: latLngToPosition(coordinate),
    },
  })),
});

const isPointGeometry = (geometry: GeoJSON.Geometry): geometry is GeoJSON.Point =>
  geometry.type === 'Point';

export const pressFeatureToLatLng = (feature: GeoJSON.Feature): LatLng | null => {
  const geometry = feature.geometry;
  if (!geometry || !isPointGeometry(geometry)) return null;
  return positionToLatLng(geometry.coordinates);
};
