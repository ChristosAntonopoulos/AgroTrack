import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Field } from '../../services/fieldService';
import { useTheme } from '../../context/ThemeContext';
import {
  resolveFieldCenter,
  resolveFieldPolygon,
  regionForCenter,
  regionForPolygon,
} from '../../utils/fieldGeo';
import {
  DEFAULT_MAP_LAYER,
  MapLayerType,
  FIELD_POLYGON_FILL,
  FIELD_POLYGON_STROKE,
} from '../../utils/mapLayers';
import AppMapView from '../maps/AppMapView';
import MapLayerToggle from './MapLayerToggle';
import { typography, spacing } from '../../theme';

let MapView: any = null;
let Polygon: any = null;
let Marker: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Polygon = maps.Polygon;
  Marker = maps.Marker;
} catch {
  // react-native-maps unavailable in this environment
}

export interface FieldDetailMapProps {
  field: Field;
  height?: number;
  /** Pause parent ScrollView while the user pans/zooms the map. */
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
      // Brief delay so pinch gestures aren't interrupted by parent scroll re-enabling.
      releaseTimer.current = setTimeout(() => {
        onGestureActiveChange?.(false);
        releaseTimer.current = null;
      }, 150);
    },
    [onGestureActiveChange]
  );

  const center = useMemo(() => resolveFieldCenter(field), [field]);
  const polygon = useMemo(() => resolveFieldPolygon(field), [field]);
  const mapRef = useRef<any>(null);

  const region = useMemo(() => {
    if (polygon?.length) return regionForPolygon(polygon, 1.02, 0.00022);
    if (center) return regionForCenter(center, 0.00028);
    return null;
  }, [polygon, center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (polygon && polygon.length >= 3) {
      map.fitToCoordinates(polygon, {
        edgePadding: { top: 16, right: 16, bottom: 16, left: 16 },
        animated: false,
      });
    } else if (center) {
      map.animateToRegion(regionForCenter(center, 0.00028), 0);
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

  if (!MapView) {
    return (
      <View
        style={[
          styles.empty,
          { height, backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('mapUnavailable')}
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
        key={`field-map-${field.id}`}
        style={styles.map}
        initialRegion={region}
        mapLayer={mapLayer}
        scrollEnabled
        zoomEnabled
        zoomTapEnabled
        zoomControlEnabled={Platform.OS === 'android'}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
      >
        {polygon && polygon.length >= 3 ? (
          <Polygon
            coordinates={polygon}
            strokeColor={FIELD_POLYGON_STROKE}
            fillColor={FIELD_POLYGON_FILL}
            strokeWidth={2}
          />
        ) : (
          <Marker coordinate={center} />
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
