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
import { DEFAULT_MAP_LAYER, MapLayerType } from '../../utils/mapLayers';
import AppMapView, { AppMapViewRef } from '../maps/AppMapView';
import MapPolygonLayer from '../maps/MapPolygonLayer';
import MapPointLayer from '../maps/MapPointLayer';
import MapLayerToggle from './MapLayerToggle';
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
    if (polygon?.length) return regionForPolygon(polygon, 1.02, 0.00022);
    if (center) return regionForCenter(center, 0.00028);
    return null;
  }, [polygon, center]);

  useEffect(() => {
    if (!center) return;
    if (polygon && polygon.length >= 3) {
      mapRef.current?.fitCoordinates(polygon, 16);
    } else {
      mapRef.current?.animateToRegion(regionForCenter(center, 0.00028));
    }
  }, [field.id, polygon, center]);

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
        mapLayer={mapLayer}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
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
