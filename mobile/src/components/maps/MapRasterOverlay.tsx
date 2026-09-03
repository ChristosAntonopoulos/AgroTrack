import React from 'react';
import { isMapLibreNativeAvailable } from '../../utils/maplibreNative';
import type { MapRasterOverlayProps } from './MapRasterOverlayNative';

const MapRasterOverlayNative = isMapLibreNativeAvailable()
  ? require('./MapRasterOverlayNative').default
  : null;

const MapRasterOverlay: React.FC<MapRasterOverlayProps> = (props) => {
  if (!MapRasterOverlayNative) return null;
  return <MapRasterOverlayNative {...props} />;
};

export type { MapRasterOverlayProps };
export default MapRasterOverlay;
