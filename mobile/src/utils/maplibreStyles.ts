import {
  MapLayerType,
  MAP_MAX_NATIVE_ZOOM,
  SATELLITE_LABELS_TILE_URL,
  SATELLITE_PLACES_TILE_URL,
  SATELLITE_TILE_URL,
  STREET_TILE_URL,
} from './mapLayers';

/** Hide road/place overlays before grove zoom so soft reference lines don't cover imagery. */
const LABEL_LAYER_MAX_ZOOM = 15;

const rasterStyle = (sourceId: string, tileUrl: string, attribution: string) => ({
  version: 8 as const,
  name: sourceId,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    [sourceId]: {
      type: 'raster' as const,
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: MAP_MAX_NATIVE_ZOOM,
      attribution,
    },
  },
  layers: [
    {
      id: `${sourceId}-layer`,
      type: 'raster' as const,
      source: sourceId,
      paint: { 'raster-resampling': 'linear' },
    },
  ],
});

/** Satellite imagery with Esri place names and road labels for context at mid zoom only. */
const satelliteWithLabelsStyle = () => ({
  version: 8 as const,
  name: 'esri-satellite-labels',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'esri-satellite': {
      type: 'raster' as const,
      tiles: [SATELLITE_TILE_URL],
      tileSize: 256,
      maxzoom: MAP_MAX_NATIVE_ZOOM,
      attribution: '© Esri',
    },
    'esri-places': {
      type: 'raster' as const,
      tiles: [SATELLITE_PLACES_TILE_URL],
      tileSize: 256,
      maxzoom: LABEL_LAYER_MAX_ZOOM,
    },
    'esri-transportation': {
      type: 'raster' as const,
      tiles: [SATELLITE_LABELS_TILE_URL],
      tileSize: 256,
      maxzoom: LABEL_LAYER_MAX_ZOOM,
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster' as const,
      source: 'esri-satellite',
      paint: { 'raster-resampling': 'linear' },
    },
    {
      id: 'esri-places-layer',
      type: 'raster' as const,
      source: 'esri-places',
      maxzoom: LABEL_LAYER_MAX_ZOOM,
      paint: { 'raster-opacity': 0.85 },
    },
    {
      id: 'esri-transportation-layer',
      type: 'raster' as const,
      source: 'esri-transportation',
      maxzoom: LABEL_LAYER_MAX_ZOOM,
      paint: { 'raster-opacity': 0.45 },
    },
  ],
});

export const getMapLibreStyle = (layer: MapLayerType): object => {
  if (layer === 'standard') {
    return rasterStyle('osm-street', STREET_TILE_URL, '© OpenStreetMap contributors');
  }
  return satelliteWithLabelsStyle();
};
