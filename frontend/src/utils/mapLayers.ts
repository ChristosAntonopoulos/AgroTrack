import type { PathOptions } from 'leaflet';

export type MapLayerType = 'satellite' | 'street';

export const SATELLITE_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const SATELLITE_PLACES_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

export const SATELLITE_LABELS_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';

export const STREET_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

export const FIELD_POLYGON_STYLE: PathOptions = {
  color: '#a3e635',
  weight: 2,
  fillColor: '#84cc16',
  fillOpacity: 0.22,
};

/** Outline only — used when a data overlay must stay visible under the boundary. */
export const FIELD_BOUNDARY_OUTLINE: PathOptions = {
  color: '#f4ff9a',
  weight: 3,
  fillOpacity: 0,
};
