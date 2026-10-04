import React from 'react';
import { isMapLibreNativeAvailable } from '../../utils/maplibreNative';
import type { LatLng } from '../../utils/fieldGeo';

type Props = {
  id: string;
  points: LatLng[];
  dashed?: boolean;
  color?: string;
  width?: number;
};

const MapDraftPathLayerNative = isMapLibreNativeAvailable()
  ? require('./MapDraftPathLayerNative').default
  : null;

/** Safe wrapper — no-op when MapLibre native is unavailable. */
const MapDraftPathLayer: React.FC<Props> = (props) => {
  if (!MapDraftPathLayerNative) return null;
  return <MapDraftPathLayerNative {...props} />;
};

export default MapDraftPathLayer;
