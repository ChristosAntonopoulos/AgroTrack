import { MapLayerType, SATELLITE_TILE_URL, STREET_TILE_URL } from './mapLayers';

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

export const getMapLibreStyle = (layer: MapLayerType): object => {
  if (layer === 'standard') {
    return rasterStyle('osm-street', STREET_TILE_URL, '© OpenStreetMap contributors');
  }
  return rasterStyle('esri-satellite', SATELLITE_TILE_URL, '© Esri');
};
