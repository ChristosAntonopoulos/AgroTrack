import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import {
  resolveFieldCenter,
  resolveFieldPolygon,
  regionForCenter,
  regionForPolygon,
} from '../../utils/fieldGeo';
import { capRegionZoom } from '../../utils/maplibreGeo';
import {
  FIELD_HERO_MAX_ZOOM,
  FIELD_HERO_MIN_DELTA,
  FIELD_HERO_POLYGON_FACTOR,
  FIELD_HERO_POLYGON_PADDING,
} from '../../utils/fieldMapFraming';
import { DEFAULT_MAP_LAYER, MapLayerType } from '../../utils/mapLayers';
import AppMapView, { AppMapViewRef } from '../maps/AppMapView';
import MapPolygonLayer from '../maps/MapPolygonLayer';
import MapPointLayer from '../maps/MapPointLayer';
import MapLayerToggle from './MapLayerToggle';
import MapZoomControls from '../maps/MapZoomControls';
import { typography, spacing } from '../../theme';

export interface FieldDetailMapProps {
  field: Field;
  height?: number;
  onGestureActiveChange?: (active: boolean) => void;
}

const FieldDetailMap: React.FC<FieldDetailMapProps> = ({
  field,
  height = 210,
  onGestureActiveChange,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<AppMapViewRef>(null);
  const mapReadyRef = useRef(false);

  const setGestureActive = useCallback(
    (active: boolean) => {
      if (releaseTimer.current) {
        clearTimeout(releaseTimer.current);
        releaseTimer.current = null;
      }
      if (active) {
        onGestureActiveChange?.(true);
        return;
      }
      releaseTimer.current = setTimeout(() => {
        onGestureActiveChange?.(false);
        releaseTimer.current = null;
      }, 150);
    },
    [onGestureActiveChange]
  );

  const center = useMemo(() => resolveFieldCenter(field), [field]);
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);

  const region = useMemo(() => {
    const raw = polygon?.length
      ? regionForPolygon(polygon, FIELD_HERO_POLYGON_FACTOR, FIELD_HERO_MIN_DELTA)
      : center
        ? regionForCenter(center, FIELD_HERO_MIN_DELTA)
        : null;
    return raw ? capRegionZoom(raw, FIELD_HERO_MAX_ZOOM) : null;
  }, [polygon, center]);

  const focusMap = useCallback(() => {
    if (!center || !region) return;
    if (polygon && polygon.length >= 3) {
      mapRef.current?.fitCoordinates(
        polygon,
        FIELD_HERO_POLYGON_PADDING,
        FIELD_HERO_MAX_ZOOM,
        FIELD_HERO_MAX_ZOOM
      );
      return;
    }
    mapRef.current?.animateToRegion(region, FIELD_HERO_MAX_ZOOM);
  }, [center, polygon, region]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleMapReady = useCallback(() => {
    mapReadyRef.current = true;
    focusMap();
  }, [focusMap]);

  useEffect(() => {
    mapReadyRef.current = false;
  }, [field.id, mapLayer]);

  useEffect(() => {
    if (!mapReadyRef.current) return;
    focusMap();
  }, [field.id, field.boundary, field.centerPoint, field.latitude, field.longitude, mapLayer, focusMap]);

  if (!center || !region) {
    return (
      <View
        style={[
          styles.empty,
          { height, backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('mapEmptyDescription')}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.wrap, { height, borderColor: colors.borderLight }]}
      onTouchStart={() => setGestureActive(true)}
      onTouchEnd={() => setGestureActive(false)}
      onTouchCancel={() => setGestureActive(false)}
    >
      <AppMapView
        ref={mapRef}
        key={`field-map-${field.id}-${mapLayer}`}
        style={styles.map}
        initialRegion={region}
        maxZoom={FIELD_HERO_MAX_ZOOM}
        mapLayer={mapLayer}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        onMapReady={handleMapReady}
      >
        {polygon && polygon.length >= 3 ? (
          <MapPolygonLayer id={field.id} ring={polygon} />
        ) : (
          <MapPointLayer
            sourceId="field-center"
            points={[{ id: field.id, coordinate: center, color: colors.primaryDark }]}
            radius={10}
          />
        )}
      </AppMapView>
      <View style={styles.toggle} pointerEvents="box-none">
        <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
      </View>
      <View style={styles.zoom} pointerEvents="box-none">
        <MapZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: { flex: 1 },
  toggle: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  zoom: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
  },
  empty: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  emptyText: {
    ...typography.styles.bodySmall,
    textAlign: 'center',
  },
});

export default FieldDetailMap;
