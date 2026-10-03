import type { LatLng } from './fieldGeo';

export type GeoBBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

const MIN_HALF_SPAN = 0.0009;

/** Expand a ring/point into a square-ish geographic bbox for preview framing. */
export const bboxForPreview = (points: LatLng[], padRatio = 0.4): GeoBBox | null => {
  if (!points.length) return null;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  let halfLat = Math.max((maxLat - minLat) / 2, MIN_HALF_SPAN);
  let halfLng = Math.max((maxLng - minLng) / 2, MIN_HALF_SPAN);
  // Keep the crop roughly square in geographic degrees (good enough for thumbs).
  const half = Math.max(halfLat, halfLng) * (1 + padRatio);
  halfLat = half;
  halfLng = half;

  return {
    minLat: midLat - halfLat,
    maxLat: midLat + halfLat,
    minLng: midLng - halfLng,
    maxLng: midLng + halfLng,
  };
};

/**
 * Esri World Imagery static export — same satellite basemap as live field maps.
 * No API key required for public World Imagery tiles/export.
 */
export const buildSatellitePreviewUrl = (
  bbox: GeoBBox,
  width: number,
  height: number
): string => {
  const w = Math.max(32, Math.round(width));
  const h = Math.max(32, Math.round(height));
  const params = new URLSearchParams({
    bbox: `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    bboxSR: '4326',
    imageSR: '3857',
    size: `${w},${h}`,
    format: 'jpg',
    f: 'image',
  });
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params.toString()}`;
};
