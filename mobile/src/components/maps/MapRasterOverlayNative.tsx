import React, { useMemo } from 'react';
import { ImageSource, RasterSource, RasterLayer } from '@maplibre/maplibre-react-native';
import { resolvePublicAssetUrl } from '../../config/env';

export interface MapRasterOverlayProps {
  id: string;
  /** Georeferenced PNG produced by the backend for this field. */
  imageUrl?: string;
  /** [minLng, minLat, maxLng, maxLat] the image covers. */
  bounds?: number[];
  /** XYZ template for externally tiled overlays such as land cover. */
  tileUrlTemplate?: string;
  opacity?: number;
  /** Drawn above the base map but below the field boundary outline. */
  belowLayerId?: string;
}

/**
 * Draws a backend overlay on the map, either as a georeferenced image pinned to the
 * field bounds or as an external tile source. Image overlays are preferred because
 * they are already clipped to the field and carry no extra network cost per tile.
 */
const MapRasterOverlayNative: React.FC<MapRasterOverlayProps> = ({
  id,
  imageUrl,
  bounds,
  tileUrlTemplate,
  opacity = 0.75,
  belowLayerId,
}) => {
  const coordinates = useMemo<
    [GeoJSON.Position, GeoJSON.Position, GeoJSON.Position, GeoJSON.Position] | undefined
  >(() => {
    if (!bounds || bounds.length < 4) return undefined;
    const [minLng, minLat, maxLng, maxLat] = bounds;
    // Top-left, top-right, bottom-right, bottom-left, as MapLibre expects.
    return [
      [minLng, maxLat],
      [maxLng, maxLat],
      [maxLng, minLat],
      [minLng, minLat],
    ];
  }, [bounds]);

  const resolvedImageUrl = resolvePublicAssetUrl(imageUrl) ?? imageUrl;

  if (resolvedImageUrl && coordinates) {
    return (
      <ImageSource id={`overlay-src-${id}`} url={resolvedImageUrl} coordinates={coordinates}>
        <RasterLayer
          id={`overlay-layer-${id}`}
          style={{ rasterOpacity: opacity }}
          belowLayerID={belowLayerId}
        />
      </ImageSource>
    );
  }

  if (tileUrlTemplate) {
    return (
      <RasterSource id={`overlay-src-${id}`} tileUrlTemplates={[tileUrlTemplate]} tileSize={256}>
        <RasterLayer
          id={`overlay-layer-${id}`}
          style={{ rasterOpacity: opacity }}
          belowLayerID={belowLayerId}
        />
      </RasterSource>
    );
  }

  return null;
};

export default MapRasterOverlayNative;
