import { Platform } from 'react-native';
import { MapType } from 'react-native-maps';

export type MapLayerType = 'satellite' | 'standard' | 'hybrid';

/** Default matches web Fields map — Esri satellite imagery. */
export const DEFAULT_MAP_LAYER: MapLayerType = 'satellite';

/** Esri World Imagery (same source as web frontend). */
export const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** OpenStreetMap raster tiles for street view. */
export const STREET_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const getTileUrl = (layer: MapLayerType): string =>
  layer === 'satellite' || layer === 'hybrid' ? SATELLITE_TILE_URL : STREET_TILE_URL;

/** Custom raster tiles — avoids relying on Google satellite/hybrid tile billing. */
export const useCustomMapTiles = (): boolean => true;

/** Native Google/Apple map types are not used when custom tiles are enabled. */
export const mapLayerToMapType = (_layer: MapLayerType): MapType =>
  useCustomMapTiles() ? 'none' : 'standard';

export const tileLayerProps = (layer: MapLayerType) => ({
  urlTemplate: getTileUrl(layer),
  maximumZ: 19,
  flipY: false,
  zIndex: -1,
  /** Replace default Google tiles on Android so Esri/OSM imagery is visible. */
  shouldReplaceMapContent: Platform.OS === 'android',
});

export const FIELD_POLYGON_STROKE = '#a3e635';
export const FIELD_POLYGON_FILL = 'rgba(132, 204, 22, 0.35)';
