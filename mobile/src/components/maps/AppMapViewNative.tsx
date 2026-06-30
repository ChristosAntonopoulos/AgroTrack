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
  expandBoundsForMaxZoom,
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

const MIN_ZOOM = 8;
const MAX_ZOOM = 19;

type RegionPayload = {
  zoomLevel?: number;
};

const readZoomFromRegionEvent = (feature: GeoJSON.Feature): number | null => {
  const zoom = (feature.properties as RegionPayload | undefined)?.zoomLevel;
  return typeof zoom === 'number' && Number.isFinite(zoom) ? zoom : null;
};

const AppMapViewNative = React.forwardRef<AppMapViewRef, AppMapViewProps>(
  (
    {
      style,
      mapLayer = DEFAULT_MAP_LAYER,
      initialRegion,
      region,
      maxZoom,
      showUserLocation = false,
      scrollEnabled = true,
      zoomEnabled = true,
      rotateEnabled = false,
      pitchEnabled = false,
      onPress,
      onMapReady,
      children,
    },
    ref
  ) => {
    const cameraRef = useRef<CameraRef>(null);
    const mapRef = useRef<MapViewRef>(null);
    const zoomRef = useRef<number>(13);

    const mapStyle = useMemo(() => getMapLibreStyle(mapLayer), [mapLayer]);

    const defaultCamera = useMemo(() => {
      const stop = regionToCameraStop(initialRegion ?? region ?? GREECE_DEFAULT, maxZoom);
      zoomRef.current = stop.zoomLevel ?? 13;
      return stop;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyZoom = (nextZoom: number, animationDuration = 200) => {
      if (!cameraRef.current) return;
      const zoomLevel = Math.min(Math.max(nextZoom, MIN_ZOOM), MAX_ZOOM);
      zoomRef.current = zoomLevel;
      cameraRef.current.setCamera({ zoomLevel, animationDuration });
    };

    useEffect(() => {
      if (!region || !cameraRef.current) return;
      const stop = regionToCameraStop(region, maxZoom);
      if (stop.zoomLevel != null) zoomRef.current = stop.zoomLevel;
      cameraRef.current.setCamera(stop);
    }, [region?.latitude, region?.longitude, region?.latitudeDelta, region?.longitudeDelta, maxZoom]);

    useImperativeHandle(ref, () => ({
      fitCoordinates: (points: LatLng[], padding = 48, singlePointZoom = 16, fitMaxZoom?: number) => {
        const bounds = boundsFromPoints(points);
        if (!bounds || !cameraRef.current) return;
        const ceiling = fitMaxZoom ?? maxZoom ?? MAX_ZOOM;
        if (points.length === 1) {
          const zoomLevel = Math.min(singlePointZoom, ceiling);
          zoomRef.current = zoomLevel;
          cameraRef.current.setCamera({
            centerCoordinate: [points[0].longitude, points[0].latitude],
            zoomLevel,
            animationDuration: 0,
          });
          return;
        }
        const expanded = expandBoundsForMaxZoom(bounds, ceiling);
        cameraRef.current.fitBounds(expanded.ne, expanded.sw, padding, 0);
      },
      animateToRegion: (nextRegion: MapRegion, animateMaxZoom?: number) => {
        if (!cameraRef.current) return;
        const stop = regionToCameraStop(nextRegion, animateMaxZoom ?? maxZoom);
        if (stop.zoomLevel != null) zoomRef.current = stop.zoomLevel;
        cameraRef.current.setCamera({ ...stop, animationDuration: 0 });
      },
      zoomIn: () => {
        applyZoom(zoomRef.current + 1);
      },
      zoomOut: () => {
        applyZoom(zoomRef.current - 1);
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
        onDidFinishLoadingMap={onMapReady}
        onRegionDidChange={(feature) => {
          const zoom = readZoomFromRegionEvent(feature);
          if (zoom != null) zoomRef.current = zoom;
        }}
        onPress={
          onPress
            ? (feature) => {
                const coordinate = pressFeatureToLatLng(feature);
                if (coordinate) onPress({ coordinate });
              }
            : undefined
        }
      >
        <Camera
          ref={cameraRef}
          defaultSettings={defaultCamera}
          minZoomLevel={MIN_ZOOM}
          maxZoomLevel={MAX_ZOOM}
        />
        {showUserLocation ? <UserLocation visible /> : null}
        {children}
      </MapView>
    );
  }
);

AppMapViewNative.displayName = 'AppMapViewNative';

export default AppMapViewNative;
