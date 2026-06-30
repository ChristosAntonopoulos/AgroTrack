import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  MapView,
  Camera,
  UserLocation,
  type CameraRef,
  type MapViewRef,
} from '@maplibre/maplibre-react-native';
import { LatLng } from '../../utils/fieldGeo';
import { DEFAULT_MAP_LAYER, MapLayerType } from '../../utils/mapLayers';
import { getMapLibreStyle } from '../../utils/maplibreStyles';
import {
  boundsFromPoints,
  pressFeatureToLatLng,
  regionToCameraStop,
  type MapRegion,
} from '../../utils/maplibreGeo';
import type { AppMapPressEvent, AppMapViewProps, AppMapViewRef } from './AppMapView';

const GREECE_DEFAULT: MapRegion = {
  latitude: 37.05,
  longitude: 21.85,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const AppMapViewNative = React.forwardRef<AppMapViewRef, AppMapViewProps>(
  (
    {
      style,
      mapLayer = DEFAULT_MAP_LAYER,
      initialRegion,
      region,
      showUserLocation = false,
      scrollEnabled = true,
      zoomEnabled = true,
      rotateEnabled = false,
      pitchEnabled = false,
      onPress,
      children,
    },
    ref
  ) => {
    const cameraRef = useRef<CameraRef>(null);
    const mapRef = useRef<MapViewRef>(null);

    const mapStyle = useMemo(() => getMapLibreStyle(mapLayer), [mapLayer]);

    const defaultCamera = useMemo(
      () => regionToCameraStop(initialRegion ?? region ?? GREECE_DEFAULT),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    useEffect(() => {
      if (!region || !cameraRef.current) return;
      cameraRef.current.setCamera(regionToCameraStop(region));
    }, [region?.latitude, region?.longitude, region?.latitudeDelta, region?.longitudeDelta]);

    useImperativeHandle(ref, () => ({
      fitCoordinates: (points: LatLng[], padding = 48) => {
        const bounds = boundsFromPoints(points);
        if (!bounds || !cameraRef.current) return;
        if (points.length === 1) {
          cameraRef.current.setCamera({
            centerCoordinate: [points[0].longitude, points[0].latitude],
            zoomLevel: 16,
            animationDuration: 0,
          });
          return;
        }
        cameraRef.current.fitBounds(bounds.ne, bounds.sw, padding, 0);
      },
      animateToRegion: (nextRegion: MapRegion) => {
        if (!cameraRef.current) return;
        cameraRef.current.setCamera(regionToCameraStop(nextRegion));
      },
    }));

    return (
      <MapView
        ref={mapRef}
        style={style}
        mapStyle={mapStyle}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        rotateEnabled={rotateEnabled}
        pitchEnabled={pitchEnabled}
        logoEnabled={false}
        attributionEnabled
        attributionPosition={{ bottom: 4, right: 4 }}
        onPress={
          onPress
            ? (feature) => {
                const coordinate = pressFeatureToLatLng(feature);
                if (coordinate) onPress({ coordinate });
              }
            : undefined
        }
      >
        <Camera ref={cameraRef} defaultSettings={defaultCamera} />
        {showUserLocation ? <UserLocation visible /> : null}
        {children}
      </MapView>
    );
  }
);

AppMapViewNative.displayName = 'AppMapViewNative';

export default AppMapViewNative;
