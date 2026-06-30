import React from 'react';
import { isMapLibreNativeAvailable } from '../../utils/maplibreNative';

interface MapPolygonLayerProps {
  id: string;
  ring: import('../../utils/fieldGeo').LatLng[];
  fillColor?: string;
  strokeColor?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  onPress?: (featureId: string) => void;
}

const MapPolygonLayerNative = isMapLibreNativeAvailable()
  ? require('./MapPolygonLayerNative').default
  : null;

const MapPolygonLayer: React.FC<MapPolygonLayerProps> = (props) => {
  if (!MapPolygonLayerNative) return null;
  return <MapPolygonLayerNative {...props} />;
};

export default MapPolygonLayer;
