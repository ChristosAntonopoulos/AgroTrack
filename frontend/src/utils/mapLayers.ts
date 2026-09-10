import type { PathOptions } from 'leaflet';
import { resolveFieldColor } from './fieldColors';

export type MapLayerType = 'satellite' | 'street' | 'terrain';

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

export type FieldPolygonMode = 'default' | 'hover' | 'selected' | 'outline';

/** Boundary fill/stroke from the field's own color (not a fixed green). */
export const fieldPolygonStyle = (
  color?: string | null,
  fieldId?: string | null,
  mode: FieldPolygonMode = 'default'
): PathOptions => {
  const accent = resolveFieldColor(color, fieldId);
  switch (mode) {
    case 'hover':
      return { color: accent, weight: 3, fillColor: accent, fillOpacity: 0.34 };
    case 'selected':
      return { color: accent, weight: 3.5, fillColor: accent, fillOpacity: 0.4 };
    case 'outline':
      return { color: accent, weight: 3, fillColor: accent, fillOpacity: 0 };
    default:
      return { color: accent, weight: 2.5, fillColor: accent, fillOpacity: 0.28 };
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
