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

export const STREET_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const TERRAIN_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}';

export const TERRAIN_LABELS_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}';

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
