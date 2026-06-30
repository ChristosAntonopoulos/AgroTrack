import { MapType } from 'react-native-maps';

export type MapLayerType = 'satellite' | 'standard' | 'hybrid';

export const DEFAULT_MAP_LAYER: MapLayerType = 'satellite';

export const mapLayerToMapType = (layer: MapLayerType): MapType => {
  switch (layer) {
    case 'satellite':
      return 'satellite';
    case 'hybrid':
      return 'hybrid';
    default:
      return 'standard';
  }
};

export const FIELD_POLYGON_STROKE = '#a3e635';
export const FIELD_POLYGON_FILL = 'rgba(132, 204, 22, 0.35)';
