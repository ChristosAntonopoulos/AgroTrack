import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LatLng } from '../../utils/fieldGeo';
import { MapLayerType } from '../../utils/mapLayers';
import { type MapRegion } from '../../utils/maplibreGeo';
import { isMapLibreNativeAvailable } from '../../utils/maplibreNative';
import MapUnavailableView from './MapUnavailableView';

export type AppMapViewRef = {
  fitCoordinates: (
    points: LatLng[],
    padding?: number,
    singlePointZoom?: number,
    maxZoom?: number
  ) => void;
  animateToRegion: (region: MapRegion, maxZoom?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

export type AppMapPressEvent = {
  coordinate: LatLng;
};

export type AppMapViewProps = {
  style?: StyleProp<ViewStyle>;
  mapLayer?: MapLayerType;
  initialRegion?: MapRegion | null;
  region?: MapRegion;
  /** Hard stop for pinch / zoom controls so raster tiles stay visible. */
  maxZoom?: number;
  showUserLocation?: boolean;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
  onPress?: (event: AppMapPressEvent) => void;
  onMapReady?: () => void;
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
