import React from 'react';
import { isMapLibreNativeAvailable } from '../../utils/maplibreNative';
import type { MapFieldPin } from './MapFieldPinsNative';

export type { MapFieldPin };

interface MapFieldPinsProps {
  pins: MapFieldPin[];
  compact?: boolean;
  onPress?: (id: string) => void;
}

const MapFieldPinsNative = isMapLibreNativeAvailable()
  ? require('./MapFieldPinsNative').default
  : null;

const MapFieldPins: React.FC<MapFieldPinsProps> = (props) => {
  if (!MapFieldPinsNative) return null;
  return <MapFieldPinsNative {...props} />;
};

export default MapFieldPins;
