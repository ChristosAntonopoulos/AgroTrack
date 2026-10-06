import type { PathOptions } from 'leaflet';
import { resolveFieldColor } from './fieldColors';
import { getMapPalette } from '../styles/colorTokens';

export type MapLayerType = 'satellite' | 'street' | 'terrain';

/** Hard stop for user zoom. Past native zoom, tiles are overscaled so the map stays visible. */
export const MAP_MAX_ZOOM = 19;
export const MAP_MAX_NATIVE_ZOOM = 18;
export const MAP_MIN_ZOOM = 5;

export const SATELLITE_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const SATELLITE_PLACES_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export const SATELLITE_LABELS_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';

const SATELLITE_EXPORT_BASE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export';

/**
 * Single static Esri World Imagery snapshot for a WGS84 bbox.
 * Prefer this over Leaflet for list-card previews (one image request, no map instance).
 */
export const buildSatellitePreviewUrl = (
  west: number,
  south: number,
  east: number,
  north: number,
  sizePx = 256
): string => {
  const w = Math.min(west, east);
  const e = Math.max(west, east);
  const s = Math.min(south, north);
  const n = Math.max(south, north);
  const params = new URLSearchParams({
    bbox: `${w},${s},${e},${n}`,
    bboxSR: '4326',
    imageSR: '4326',
    size: `${sizePx},${sizePx}`,
    format: 'jpg',
    f: 'image',
  });
  return `${SATELLITE_EXPORT_BASE}?${params.toString()}`;
};

export const STREET_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * Ανάγλυφο: OSM for roads/context + Esri hillshade for relief.
 * Pure topo/terrain caches look blank at grove zoom in rural Greece.
 */
export const TERRAIN_TILE = STREET_TILE;

export const TERRAIN_HILLSHADE_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}';

/** Hillshade LODs thin out past ~15; overscale from here instead of blank tiles. */
export const TERRAIN_MAX_NATIVE_ZOOM = 15;

/** Keep field fit from punching past useful basemap detail on small groves. */
export const MAP_FIT_MAX_ZOOM = 17;

export type FieldPolygonMode = 'default' | 'hover' | 'selected' | 'outline' | 'warning';

/** Boundary fill/stroke using map tokens + optional field accent. */
export const fieldPolygonStyle = (
  color?: string | null,
  fieldId?: string | null,
  mode: FieldPolygonMode = 'default'
): PathOptions => {
  const map = getMapPalette();
  const fieldAccent = resolveFieldColor(color, fieldId);

  switch (mode) {
    case 'hover':
      return {
        color: fieldAccent,
        weight: 3.2,
        fillColor: fieldAccent,
        fillOpacity: 0.28,
      };
    case 'selected':
      return {
        color: fieldAccent,
        weight: 3.6,
        fillColor: fieldAccent,
        fillOpacity: 0.34,
      };
    case 'warning':
      return {
        color: map.warningOutline,
        weight: 3,
        fillColor: fieldAccent,
        fillOpacity: 0.1,
      };
    case 'outline':
      return {
        color: fieldAccent,
        weight: 3,
        fillColor: fieldAccent,
        fillOpacity: 0,
      };
    default:
      return {
        color: fieldAccent,
        weight: 2.6,
        fillColor: fieldAccent,
        fillOpacity: 0.22,
      };
  }
};

/** Fallback when no field color is known yet (draw wizard). */
export const FIELD_POLYGON_STYLE: PathOptions = fieldPolygonStyle(undefined, undefined);

export const FIELD_POLYGON_HOVER_STYLE: PathOptions = fieldPolygonStyle(undefined, undefined, 'hover');

export const FIELD_POLYGON_SELECTED_STYLE: PathOptions = fieldPolygonStyle(
  undefined,
  undefined,
  'selected'
);

/** Outline only — used when a data overlay must stay visible under the boundary. */
export const FIELD_BOUNDARY_OUTLINE: PathOptions = fieldPolygonStyle(undefined, undefined, 'outline');
