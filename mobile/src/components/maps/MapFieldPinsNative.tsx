import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MarkerView } from '@maplibre/maplibre-react-native';
import { LatLng } from '../../utils/fieldGeo';
import FieldPinMark from './FieldPinMark';

export type MapFieldPin = {
  id: string;
  coordinate: LatLng;
  color: string;
  label?: string;
  selected?: boolean;
};

type Props = {
  pins: MapFieldPin[];
  compact?: boolean;
  onPress?: (id: string) => void;
};

const MapFieldPinsNative: React.FC<Props> = ({ pins, compact, onPress }) => {
  if (pins.length === 0) return null;

  const ordered = [...pins].sort((a, b) => Number(Boolean(a.selected)) - Number(Boolean(b.selected)));

  return (
    <>
      {ordered.map((pin) => (
        <MarkerView
          key={pin.id}
          coordinate={[pin.coordinate.longitude, pin.coordinate.latitude]}
          anchor={{ x: 0.5, y: 1 }}
          allowOverlap
          isSelected={Boolean(pin.selected)}
        >
          <Pressable
            onPress={() => onPress?.(pin.id)}
            accessibilityRole="button"
            accessibilityLabel={pin.label || pin.id}
            hitSlop={8}
          >
            <View style={styles.hit} collapsable={false}>
              <FieldPinMark
                color={pin.color}
                label={pin.label}
                selected={pin.selected}
                compact={compact}
              />
            </View>
          </Pressable>
        </MarkerView>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  hit: { alignItems: 'center' },
});

export default MapFieldPinsNative;
