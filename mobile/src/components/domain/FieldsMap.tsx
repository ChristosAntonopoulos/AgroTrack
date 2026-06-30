import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import { Field } from '../../services/fieldService';
import { locationService } from '../../services/locationService';
import { useTheme } from '../../context/ThemeContext';
import { toBoolean } from '../../utils/booleanConverter';
import {
  resolveFieldCenter,
  resolveFieldPolygon,
  formatFieldArea,
  regionForCenter,
  LatLng,
} from '../../utils/fieldGeo';
import {
  DEFAULT_MAP_LAYER,
  MapLayerType,
  FIELD_POLYGON_FILL,
  FIELD_POLYGON_STROKE,
  mapLayerToMapType,
} from '../../utils/mapLayers';
import MapLayerToggle from './MapLayerToggle';
import EmptyState from '../EmptyState';
import { typography, spacing, spacingPatterns } from '../../theme';

let MapView: any = null;
let Marker: any = null;
let Polygon: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Polygon = maps.Polygon;
} catch {
  if (__DEV__) {
    console.log('[FieldsMap] react-native-maps not available');
  }
}

const collectFitPoints = (fields: Field[]): LatLng[] => {
  const points: LatLng[] = [];
  for (const field of fields) {
    const polygon = resolveFieldPolygon(field);
    if (polygon && polygon.length >= 3) {
      points.push(...polygon);
      continue;
    }
    const center = resolveFieldCenter(field);
    if (center) points.push(center);
  }
  return points;
};

export interface FieldsMapProps {
  fields: Field[];
  onFieldPress?: (fieldId: string) => void;
  compact?: boolean;
  height?: number;
  embedded?: boolean;
  /** Use all available vertical space (fields list map mode). */
  fillScreen?: boolean;
}

const FieldsMap: React.FC<FieldsMapProps> = ({
  fields,
  onFieldPress,
  compact = false,
  height = 250,
  embedded = false,
  fillScreen = false,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');
  const mapRef = useRef<any>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);

  useEffect(() => {
    locationService
      .getCurrentLocation()
      .then((loc) => setCurrentLocation(loc))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mappableFields = useMemo(
    () => fields.filter((f) => resolveFieldCenter(f) != null),
    [fields]
  );

  const fitPoints = useMemo(() => collectFitPoints(mappableFields), [mappableFields]);

  const initialRegion = useMemo(() => {
    if (fitPoints.length === 0) return null;
    if (fitPoints.length === 1) return regionForCenter(fitPoints[0], 0.003);
    const lats = fitPoints.map((p) => p.latitude);
    const lngs = fitPoints.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.12, 0.002),
      longitudeDelta: Math.max((maxLng - minLng) * 1.12, 0.002),
    };
  }, [fitPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitPoints.length === 0) return;
    if (fitPoints.length === 1) {
      map.animateToRegion(regionForCenter(fitPoints[0], 0.003), 0);
      return;
    }
    map.fitToCoordinates(fitPoints, {
      edgePadding: { top: 48, right: 32, bottom: 48, left: 32 },
      animated: false,
    });
  }, [fitPoints, fields.length]);

  const safeCompact = toBoolean(compact, 'FieldsMap.compact');

  const getLifecycleColor = (lifecycleYear: string) =>
    lifecycleYear === 'high' ? colors.lifecycleHigh : colors.lifecycleLow;

  const mapHeightStyle = fillScreen ? styles.mapFill : { height };

  if (mappableFields.length === 0) {
    return (
      <Card variant="elevated" style={!embedded ? styles.container : undefined}>
        {!embedded ? <Text style={[styles.title, { color: colors.textPrimary }]}>{t('mapTitle')}</Text> : null}
        <EmptyState
          icon="🗺️"
          title={t('mapEmptyTitle')}
          description={t('mapEmptyDescription')}
        />
      </Card>
    );
  }

  if (!MapView || !initialRegion) {
    return (
      <Card variant="elevated" style={!embedded ? styles.container : undefined}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('mapTitle')} ({mappableFields.length})
        </Text>
        <View style={styles.fallbackList}>
          {mappableFields.map((field) => {
            const center = resolveFieldCenter(field)!;
            return (
              <TouchableOpacity
                key={field.id}
                style={[styles.fieldItem, { backgroundColor: colors.surface }]}
                onPress={() => onFieldPress?.(field.id)}
              >
                <Text style={[styles.fieldName, { color: colors.textPrimary }]}>{field.name}</Text>
                <Text style={[styles.fieldMeta, { color: colors.textSecondary }]}>
                  {formatFieldArea(field)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>
    );
  }

  const mapContent = (
    <View style={[styles.mapContainer, mapHeightStyle, { backgroundColor: colors.gray200 }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={!!currentLocation}
            showsMyLocationButton={false}
            mapType={mapLayerToMapType(mapLayer)}
            scrollEnabled
            zoomEnabled
            zoomTapEnabled
            zoomControlEnabled={Platform.OS === 'android'}
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {mappableFields.map((field) => {
              const center = resolveFieldCenter(field)!;
              const polygon = resolveFieldPolygon(field);
              const lifecycleColor = getLifecycleColor(field.currentLifecycleYear);

              if (polygon && polygon.length >= 3) {
                return (
                  <Polygon
                    key={field.id}
                    coordinates={polygon}
                    strokeColor={FIELD_POLYGON_STROKE}
                    fillColor={FIELD_POLYGON_FILL}
                    strokeWidth={2}
                    tappable
                    onPress={() => onFieldPress?.(field.id)}
                  />
                );
              }

              return (
                <Marker
                  key={field.id}
                  coordinate={center}
                  title={field.name}
                  description={formatFieldArea(field)}
                  onPress={() => onFieldPress?.(field.id)}
                >
                  <View style={[styles.markerContainer, { backgroundColor: lifecycleColor, borderColor: colors.white }]}>
                    <Text style={styles.markerText}>🏡</Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>
          <View style={styles.toggleOverlay}>
            <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
          </View>
          <View style={[styles.countPill, { backgroundColor: colors.surfaceElevated + 'E8' }]}>
            <Text style={[styles.countText, { color: colors.textPrimary }]}>
              {mappableFields.length} {t('summaryFields').toLowerCase()}
            </Text>
          </View>
        </>
      )}
    </View>
  );

  if (embedded || fillScreen) {
    return mapContent;
  }

  return (
    <Card variant="elevated" style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('mapTitle')} ({mappableFields.length})
        </Text>
      </View>
      {mapContent}
      {!safeCompact ? (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.lifecycleHigh }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('highYear')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.lifecycleLow }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('lowYear')}</Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.base },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    ...typography.styles.h5,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
  },
  mapContainer: {
    borderRadius: spacingPatterns.borderRadius.md,
    overflow: 'hidden',
  },
  mapFill: { flex: 1, minHeight: 280 },
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center' },
  toggleOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  countPill: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: { ...typography.styles.caption, fontWeight: '600', fontSize: 11 },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    ...spacingPatterns.shadow.md,
  },
  markerText: { fontSize: 16 },
  legend: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: { ...typography.styles.caption, fontSize: 11 },
  fallbackList: { gap: spacing.sm },
  fieldItem: {
    padding: spacing.sm,
    borderRadius: spacingPatterns.borderRadius.md,
  },
  fieldName: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.semibold,
  },
  fieldMeta: { ...typography.styles.caption, fontSize: 11, marginTop: 2 },
});

export default FieldsMap;
