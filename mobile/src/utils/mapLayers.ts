/** Esri World Imagery (same source as web frontend). */
export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** Place names and boundaries (villages, towns, cities). */
export const SATELLITE_PLACES_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

/** Roads and transport labels over satellite imagery. */
export const SATELLITE_LABELS_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';

/** OpenStreetMap raster tiles for street view. */
export const STREET_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export type MapLayerType = 'satellite' | 'standard' | 'hybrid';

/** Default matches web Fields map — Esri satellite imagery. */
export const DEFAULT_MAP_LAYER: MapLayerType = 'satellite';

/** Fallback only — prefer resolveFieldColor for real fields. */
export const FIELD_POLYGON_STROKE = '#2F6B4F';
export const FIELD_POLYGON_FILL = '#2F6B4F';
