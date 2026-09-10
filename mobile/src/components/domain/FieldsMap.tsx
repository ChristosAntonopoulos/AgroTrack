import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
import { DEFAULT_MAP_LAYER, MapLayerType } from '../../utils/mapLayers';
import { resolveFieldColor } from '../../utils/fieldColors';
import MapLayerToggle from './MapLayerToggle';
import AppMapView, { AppMapViewRef } from '../maps/AppMapView';
import MapPolygonLayer from '../maps/MapPolygonLayer';
import MapPointLayer from '../maps/MapPointLayer';
import EmptyState from '../EmptyState';
import { typography, spacing, spacingPatterns } from '../../theme';

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
  const mapRef = useRef<AppMapViewRef>(null);
  const [hasLocation, setHasLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);

  useEffect(() => {
    locationService
      .getCurrentLocation()
      .then(() => setHasLocation(true))
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
    if (fitPoints.length === 0) return;
    mapRef.current?.fitCoordinates(fitPoints);
  }, [fitPoints, fields.length]);

  const safeCompact = toBoolean(compact, 'FieldsMap.compact');

  const markerPoints = useMemo(
    () =>
      mappableFields
        .filter((field) => {
          const polygon = resolveFieldPolygon(field);
          return !polygon || polygon.length < 3;
        })
        .map((field) => ({
          id: field.id,
          coordinate: resolveFieldCenter(field)!,
          color: resolveFieldColor(field.color, field.id),
        })),
    [mappableFields]
  );

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

  const mapContent = (
    <View style={[styles.mapContainer, mapHeightStyle, { backgroundColor: colors.gray200 }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <AppMapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            mapLayer={mapLayer}
            showUserLocation={hasLocation}
            scrollEnabled
            zoomEnabled
          >
            {mappableFields.map((field) => {
              const polygon = resolveFieldPolygon(field);
              if (!polygon || polygon.length < 3) return null;
              const accent = resolveFieldColor(field.color, field.id);
              return (
                <MapPolygonLayer
                  key={field.id}
                  id={field.id}
                  ring={polygon}
                  fillColor={accent}
                  strokeColor={accent}
                  fillOpacity={0.28}
                  strokeWidth={2.5}
                  onPress={onFieldPress}
                />
              );
            })}
            <MapPointLayer
              sourceId="field-markers"
              points={markerPoints}
              radius={12}
              onPress={onFieldPress}
            />
          </AppMapView>
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
});

export default FieldsMap;
