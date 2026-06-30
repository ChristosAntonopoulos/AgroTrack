import React, { useMemo } from 'react';
import { ShapeSource, FillLayer, LineLayer } from '@maplibre/maplibre-react-native';
import { LatLng } from '../../utils/fieldGeo';
import { ringToPolygonFeature } from '../../utils/maplibreGeo';
import { FIELD_POLYGON_FILL, FIELD_POLYGON_STROKE } from '../../utils/mapLayers';

interface MapPolygonLayerProps {
  id: string;
  ring: LatLng[];
  fillColor?: string;
  strokeColor?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  onPress?: (featureId: string) => void;
}

const MapPolygonLayerNative: React.FC<MapPolygonLayerProps> = ({
  id,
  ring,
  fillColor = FIELD_POLYGON_FILL,
  strokeColor = FIELD_POLYGON_STROKE,
  fillOpacity = 0.35,
  strokeWidth = 2,
  onPress,
}) => {
  const feature = useMemo(
    () => ringToPolygonFeature(id, ring),
    [id, ring]
  );

  if (ring.length < 3) return null;

  return (
    <ShapeSource
      id={`polygon-${id}`}
      shape={feature}
      onPress={
        onPress
          ? (event) => {
              const pressedId = event.features?.[0]?.id;
              onPress(String(pressedId ?? id));
            }
          : undefined
      }
    >
      <FillLayer
        id={`polygon-fill-${id}`}
        style={{
          fillColor,
          fillOpacity,
        }}
      />
      <LineLayer
        id={`polygon-line-${id}`}
        style={{
          lineColor: strokeColor,
          lineWidth: strokeWidth,
        }}
      />
    </ShapeSource>
  );
};

export default MapPolygonLayerNative;
