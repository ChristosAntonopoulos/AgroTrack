import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Marker, Polygon, MapPressEvent, Region } from 'react-native-maps';
import AppMapView from '../maps/AppMapView';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import MapLayerToggle from '../domain/MapLayerToggle';
import {
  DEFAULT_MAP_LAYER,
  MapLayerType,
  FIELD_POLYGON_FILL,
  FIELD_POLYGON_STROKE,
} from '../../utils/mapLayers';
import { regionForCenter, regionForPolygon } from '../../utils/fieldGeo';
import { estimatePolygonAreaSqm } from '../../utils/polygonArea';
import { locationService } from '../../services/locationService';
import { typography, spacing } from '../../theme';

export type BoundaryPoint = { latitude: number; longitude: number };

interface Props {
  points: BoundaryPoint[];
  onPointsChange: (points: BoundaryPoint[]) => void;
  onMeasuredAreaChange?: (sqm: number) => void;
  onGestureActiveChange?: (active: boolean) => void;
  height?: number;
}

const FieldBoundaryDrawMap: React.FC<Props> = ({
  points,
  onPointsChange,
  onMeasuredAreaChange,
  onGestureActiveChange,
  height = 320,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);
  const [region, setRegion] = useState<Region>({
    latitude: 37.05,
    longitude: 21.85,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setGestureActive = useCallback(
    (active: boolean) => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      if (active) {
        onGestureActiveChange?.(true);
        return;
      }
      releaseTimer.current = setTimeout(() => onGestureActiveChange?.(false), 150);
    },
    [onGestureActiveChange]
  );

  useEffect(() => {
    if (points.length >= 3) {
      const ring = [...points, points[0]].map((p) => [p.longitude, p.latitude]);
      onMeasuredAreaChange?.(Math.round(estimatePolygonAreaSqm(ring)));
      setRegion(regionForPolygon(points, 1.15, 0.001));
    } else if (points.length === 1) {
      setRegion(regionForCenter(points[0], 0.002));
    }
  }, [points, onMeasuredAreaChange]);

  const measuredSqm = useMemo(() => {
    if (points.length < 3) return 0;
    const ring = [...points, points[0]].map((p) => [p.longitude, p.latitude]);
    return Math.round(estimatePolygonAreaSqm(ring));
  }, [points]);

  const onMapPress = (e: MapPressEvent) => {
    onPointsChange([...points, e.nativeEvent.coordinate]);
  };

  const undoLast = () => onPointsChange(points.slice(0, -1));
  const clearAll = () => onPointsChange([]);

  const centerOnUser = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      const center = { latitude: loc.latitude, longitude: loc.longitude };
      setRegion(regionForCenter(center, 0.002));
      if (points.length === 0) {
        onPointsChange([center]);
      }
    } catch {
      /* location unavailable */
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>
        {t('addFieldWizard.boundaryDesc')}
      </Text>
      <View
        style={[styles.mapWrap, { height, borderColor: colors.borderLight }]}
        onTouchStart={() => setGestureActive(true)}
        onTouchEnd={() => setGestureActive(false)}
        onTouchCancel={() => setGestureActive(false)}
      >
        <AppMapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={onMapPress}
          mapLayer={mapLayer}
          scrollEnabled
          zoomEnabled
          zoomTapEnabled
          zoomControlEnabled={Platform.OS === 'android'}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {points.map((p, i) => (
            <Marker key={`${p.latitude}-${p.longitude}-${i}`} coordinate={p} />
          ))}
          {points.length >= 3 ? (
            <Polygon
              coordinates={points}
              strokeColor={FIELD_POLYGON_STROKE}
              fillColor={FIELD_POLYGON_FILL}
              strokeWidth={2}
            />
          ) : null}
        </AppMapView>
        <View style={styles.toggle} pointerEvents="box-none">
          <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
        </View>
      </View>

      <View style={styles.toolbar}>
        <Pressable style={[styles.toolBtn, { borderColor: colors.borderLight }]} onPress={undoLast}>
          <Text style={{ color: colors.textPrimary }}>{t('addFieldWizard.undoPoint')}</Text>
        </Pressable>
        <Pressable style={[styles.toolBtn, { borderColor: colors.borderLight }]} onPress={clearAll}>
          <Text style={{ color: colors.textPrimary }}>{t('addFieldWizard.clearBoundary')}</Text>
        </Pressable>
        <Pressable
          style={[styles.toolBtn, { borderColor: colors.primaryDark, backgroundColor: colors.primaryDark + '12' }]}
          onPress={centerOnUser}
        >
          <Text style={{ color: colors.primaryDark }}>{t('addField.useCurrentLocation')}</Text>
        </Pressable>
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {t('addFieldWizard.tapToAddPoint')}
        {measuredSqm > 0 ? ` · ${measuredSqm} m²` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  desc: { ...typography.styles.bodySmall },
  mapWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: { flex: 1 },
  toggle: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  toolBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
  },
  hint: { ...typography.styles.caption },
});

export default FieldBoundaryDrawMap;
