import {
  MapLayerType,
  SATELLITE_LABELS_TILE_URL,
  SATELLITE_PLACES_TILE_URL,
  SATELLITE_TILE_URL,
  STREET_TILE_URL,
} from './mapLayers';

const rasterStyle = (sourceId: string, tileUrl: string, attribution: string) => ({
  version: 8 as const,
  name: sourceId,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    [sourceId]: {
      type: 'raster' as const,
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: 19,
      attribution,
    },
  },
  layers: [
    {
      id: `${sourceId}-layer`,
      type: 'raster' as const,
      source: sourceId,
    },
  ],
});

/** Satellite imagery with Esri place names and road labels stacked on top. */
const satelliteWithLabelsStyle = () => ({
  version: 8 as const,
  name: 'esri-satellite-labels',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'esri-satellite': {
      type: 'raster' as const,
      tiles: [SATELLITE_TILE_URL],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© Esri',
    },
    'esri-places': {
      type: 'raster' as const,
      tiles: [SATELLITE_PLACES_TILE_URL],
      tileSize: 256,
      maxzoom: 19,
    },
    'esri-transportation': {
      type: 'raster' as const,
      tiles: [SATELLITE_LABELS_TILE_URL],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster' as const,
      source: 'esri-satellite',
    },
    {
      id: 'esri-places-layer',
      type: 'raster' as const,
      source: 'esri-places',
      paint: { 'raster-opacity': 0.92 },
    },
    {
      id: 'esri-transportation-layer',
      type: 'raster' as const,
      source: 'esri-transportation',
      paint: { 'raster-opacity': 0.6 },
    },
  ],
});

export const getMapLibreStyle = (layer: MapLayerType): object => {
  if (layer === 'standard') {
    return rasterStyle('osm-street', STREET_TILE_URL, '© OpenStreetMap contributors');
  }
  return satelliteWithLabelsStyle();
};
