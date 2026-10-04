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
  /** Move to a point at an exact zoom. Region deltas cannot express a close village view. */
  flyTo: (latitude: number, longitude: number, zoomLevel: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Screen position of a coordinate, in density-independent pixels. */
  getPointInView: (point: LatLng) => Promise<{ x: number; y: number } | null>;
  /** Map coordinate under a screen position, in density-independent pixels. */
  getCoordinateFromView: (x: number, y: number) => Promise<LatLng | null>;
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
  /** Fires after the camera finishes a pan or zoom. */
  onCameraIdle?: () => void;
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
