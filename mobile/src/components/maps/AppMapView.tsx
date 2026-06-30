import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LatLng } from '../../utils/fieldGeo';
import { MapLayerType } from '../../utils/mapLayers';
import { type MapRegion } from '../../utils/maplibreGeo';
import { isMapLibreNativeAvailable } from '../../utils/maplibreNative';
import MapUnavailableView from './MapUnavailableView';

export type AppMapViewRef = {
  fitCoordinates: (points: LatLng[], padding?: number) => void;
  animateToRegion: (region: MapRegion, padding?: number) => void;
};

export type AppMapPressEvent = {
  coordinate: LatLng;
};

export type AppMapViewProps = {
  style?: StyleProp<ViewStyle>;
  mapLayer?: MapLayerType;
  initialRegion?: MapRegion | null;
  region?: MapRegion;
  showUserLocation?: boolean;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
  onPress?: (event: AppMapPressEvent) => void;
  children?: React.ReactNode;
};

const AppMapViewNative = isMapLibreNativeAvailable()
  ? require('./AppMapViewNative').default
  : null;

const AppMapView = React.forwardRef<AppMapViewRef, AppMapViewProps>((props, ref) => {
  if (!AppMapViewNative) {
    return <MapUnavailableView style={props.style} />;
  }

  return <AppMapViewNative {...props} ref={ref} />;
});

AppMapView.displayName = 'AppMapView';

export default AppMapView;
