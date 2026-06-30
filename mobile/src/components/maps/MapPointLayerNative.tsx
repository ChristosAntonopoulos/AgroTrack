import React, { useMemo } from 'react';
import { ShapeSource, CircleLayer } from '@maplibre/maplibre-react-native';
import { LatLng } from '../../utils/fieldGeo';
import { pointsToFeatureCollection } from '../../utils/maplibreGeo';

export interface MapPointLayerItem {
  id: string;
  coordinate: LatLng;
  color: string;
}

interface MapPointLayerProps {
  sourceId: string;
  points: MapPointLayerItem[];
  radius?: number;
  strokeColor?: string;
  strokeWidth?: number;
  onPress?: (id: string) => void;
}

const MapPointLayerNative: React.FC<MapPointLayerProps> = ({
  sourceId,
  points,
  radius = 10,
  strokeColor = '#ffffff',
  strokeWidth = 2,
  onPress,
}) => {
  const shape = useMemo(
    () =>
      pointsToFeatureCollection(
        points.map((p) => ({
          id: p.id,
          coordinate: p.coordinate,
          properties: { color: p.color },
        }))
      ),
    [points]
  );

  if (points.length === 0) return null;

  return (
    <ShapeSource
      id={sourceId}
      shape={shape}
      onPress={
        onPress
          ? (event) => {
              const feature = event.features?.[0];
              const id = feature?.id ?? feature?.properties?.id;
              if (id != null) onPress(String(id));
            }
          : undefined
      }
    >
      <CircleLayer
        id={`${sourceId}-circles`}
        style={{
          circleRadius: radius,
          circleColor: ['get', 'color'],
          circleStrokeColor: strokeColor,
          circleStrokeWidth: strokeWidth,
        }}
      />
    </ShapeSource>
  );
};

export default MapPointLayerNative;
