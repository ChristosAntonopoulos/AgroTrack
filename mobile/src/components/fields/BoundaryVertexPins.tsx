import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PointAnnotation } from '@maplibre/maplibre-react-native';
import type { LatLng } from '../../utils/fieldGeo';

type Props = {
  points: LatLng[];
  onMove: (index: number, point: LatLng) => void;
  onDragActiveChange?: (active: boolean) => void;
  /** Timestamp until which map taps should not add a new point. */
  suppressMapTapUntilRef?: React.MutableRefObject<number>;
};

/**
 * Draggable numbered corner pins for field boundary drawing.
 */
const BoundaryVertexPins: React.FC<Props> = ({
  points,
  onMove,
  onDragActiveChange,
  suppressMapTapUntilRef,
}) => {
  const pins = useMemo(
    () =>
      points.map((coordinate, index) => ({
        id: `boundary-vertex-${index}`,
        index,
        coordinate,
      })),
    [points]
  );

  if (pins.length === 0) return null;

  const bumpSuppress = (ms: number) => {
    if (suppressMapTapUntilRef) {
      suppressMapTapUntilRef.current = Date.now() + ms;
    }
  };

  return (
    <>
      {pins.map((pin) => (
        <PointAnnotation
          key={pin.id}
          id={pin.id}
          coordinate={[pin.coordinate.longitude, pin.coordinate.latitude]}
          anchor={{ x: 0.5, y: 0.5 }}
          draggable
          onDragStart={() => {
            bumpSuppress(800);
            onDragActiveChange?.(true);
          }}
          onDragEnd={(payload) => {
            bumpSuppress(500);
            onDragActiveChange?.(false);
            const [longitude, latitude] = payload.geometry.coordinates;
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
            onMove(pin.index, { latitude, longitude });
          }}
          onSelected={() => {
            bumpSuppress(400);
          }}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor: '#F5C842',
                borderColor: '#1C1A14',
              },
            ]}
            collapsable={false}
          >
            <Text style={[styles.label, { color: '#1C1A14' }]}>{pin.index + 1}</Text>
          </View>
        </PointAnnotation>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default BoundaryVertexPins;
