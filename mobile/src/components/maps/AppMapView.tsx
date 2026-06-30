import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import MapView, { MapViewProps, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import Constants from 'expo-constants';
import {
  DEFAULT_MAP_LAYER,
  MapLayerType,
  mapLayerToMapType,
  tileLayerProps,
  useCustomMapTiles,
} from '../../utils/mapLayers';

export type AppMapViewProps = MapViewProps & {
  mapLayer?: MapLayerType;
  style?: StyleProp<ViewStyle>;
};

const AppMapView = React.forwardRef<MapView, AppMapViewProps>(
  ({ mapLayer = DEFAULT_MAP_LAYER, children, mapType, ...rest }, ref) => {
    const useTiles = useCustomMapTiles();
    const resolvedMapType = mapType ?? mapLayerToMapType(mapLayer);

    return (
      <MapView
        ref={ref}
        provider={PROVIDER_DEFAULT}
        mapType={resolvedMapType}
        {...rest}
      >
        {useTiles ? <UrlTile {...tileLayerProps(mapLayer)} /> : null}
        {children}
      </MapView>
    );
  }
);

AppMapView.displayName = 'AppMapView';

export const isGoogleMapsConfigured = (): boolean => {
  const extra = Constants.expoConfig?.extra as { googleMapsConfigured?: boolean } | undefined;
  if (typeof extra?.googleMapsConfigured === 'boolean') {
    return extra.googleMapsConfigured;
  }
  const key =
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ??
    (extra as { googleMapsApiKey?: string } | undefined)?.googleMapsApiKey;
  return Boolean(key && !String(key).includes('YOUR_GOOGLE_MAPS_API_KEY'));
};

export const mapsNeedGoogleKeyOnAndroid = (): boolean =>
  Platform.OS === 'android' && !isGoogleMapsConfigured();

export default AppMapView;
