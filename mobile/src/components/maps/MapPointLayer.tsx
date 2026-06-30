import React from 'react';
import { LatLng } from '../../utils/fieldGeo';
import { isMapLibreNativeAvailable } from '../../utils/maplibreNative';

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

const MapPointLayerNative = isMapLibreNativeAvailable()
  ? require('./MapPointLayerNative').default
  : null;

const MapPointLayer: React.FC<MapPointLayerProps> = (props) => {
  if (!MapPointLayerNative) return null;
  return <MapPointLayerNative {...props} />;
};

export default MapPointLayer;
