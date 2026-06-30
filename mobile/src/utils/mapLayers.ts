/** Esri World Imagery (same source as web frontend). */
export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** OpenStreetMap raster tiles for street view. */
export const STREET_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export type MapLayerType = 'satellite' | 'standard' | 'hybrid';

/** Default matches web Fields map — Esri satellite imagery. */
export const DEFAULT_MAP_LAYER: MapLayerType = 'satellite';

export const FIELD_POLYGON_STROKE = '#a3e635';
export const FIELD_POLYGON_FILL = '#84cc16';
