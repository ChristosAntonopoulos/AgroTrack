import React, { useMemo } from 'react';
import { ShapeSource, LineLayer } from '@maplibre/maplibre-react-native';
import type { LatLng } from '../../utils/fieldGeo';
import { latLngToPosition } from '../../utils/maplibreGeo';
import { FIELD_POLYGON_STROKE } from '../../utils/mapLayers';

type Props = {
  id: string;
  points: LatLng[];
  /** Open path while marking corners (dashed). */
  dashed?: boolean;
  color?: string;
  width?: number;
};

/** Open draft outline while the grower is still placing corners. */
const MapDraftPathLayer: React.FC<Props> = ({
  id,
  points,
  dashed = true,
  color = FIELD_POLYGON_STROKE,
  width = 2.5,
}) => {
  const feature = useMemo((): GeoJSON.Feature<GeoJSON.LineString> | null => {
    if (points.length < 2) return null;
    return {
      type: 'Feature',
      id,
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: points.map(latLngToPosition),
      },
    };
  }, [id, points]);

  if (!feature) return null;

  return (
    <ShapeSource id={`draft-path-${id}`} shape={feature}>
      <LineLayer
        id={`draft-path-line-${id}`}
        style={{
          lineColor: color,
          lineWidth: width,
          lineOpacity: 0.95,
          lineJoin: 'round',
          lineCap: 'round',
          ...(dashed
            ? {
                lineDasharray: [1.6, 1.4],
              }
            : null),
        }}
      />
    </ShapeSource>
  );
};

export default MapDraftPathLayer;
