import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import Card from '../ui/Card';
import { Field } from '../../services/fieldService';
import { locationService } from '../../services/locationService';
import { useTheme } from '../../context/ThemeContext';
import { toBoolean } from '../../utils/booleanConverter';
import {
  resolveFieldCenter,
  resolveFieldPolygon,
  regionForCenter,
  LatLng,
} from '../../utils/fieldGeo';
import { DEFAULT_MAP_LAYER, MAP_MAX_ZOOM, MapLayerType } from '../../utils/mapLayers';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import MapLayerToggle from './MapLayerToggle';
import AppMapView, { AppMapViewRef } from '../maps/AppMapView';
import MapPolygonLayer from '../maps/MapPolygonLayer';
import MapFieldPins, { MapFieldPin } from '../maps/MapFieldPins';
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
  onFieldSelect?: (fieldId: string) => void;
  selectedFieldId?: string | null;
  compact?: boolean;
  height?: number;
  embedded?: boolean;
  fillScreen?: boolean;
}

const FieldsMap: React.FC<FieldsMapProps> = ({
  fields,
  onFieldPress,
  onFieldSelect,
  selectedFieldId,
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
  const [mapReady, setMapReady] = useState(false);
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

  /** Prefer drawn boundaries so zoom frames the maps that exist. */
  const fitSourceFields = useMemo(() => {
    const withBoundary = mappableFields.filter((field) => {
      const polygon = resolveFieldPolygon(field);
      return Boolean(polygon && polygon.length >= 3);
    });
    return withBoundary.length > 0 ? withBoundary : mappableFields;
  }, [mappableFields]);

  const fitPoints = useMemo(() => collectFitPoints(fitSourceFields), [fitSourceFields]);

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
      latitudeDelta: Math.max((maxLat - minLat) * 1.25, 0.002),
      longitudeDelta: Math.max((maxLng - minLng) * 1.25, 0.002),
    };
  }, [fitPoints]);

  useEffect(() => {
    if (!mapReady || fitPoints.length === 0) return;
    mapRef.current?.fitCoordinates(fitPoints, 44, 15, 17);
  }, [mapReady, fitPoints, fields.length]);

  const selectedField = useMemo(
    () => mappableFields.find((field) => field.id === selectedFieldId) ?? null,
    [mappableFields, selectedFieldId]
  );

  useEffect(() => {
    if (!mapReady || !selectedField) return;
    const polygon = resolveFieldPolygon(selectedField);
    const center = resolveFieldCenter(selectedField);
    if (polygon && polygon.length >= 3) {
      mapRef.current?.fitCoordinates(polygon, 56, 16, 17);
      return;
    }
    if (center) {
      mapRef.current?.fitCoordinates([center], 48, 15, 16);
    }
  }, [mapReady, selectedField]);

  const safeCompact = toBoolean(compact, 'FieldsMap.compact');

  const pins: MapFieldPin[] = useMemo(
    () =>
      mappableFields.map((field) => {
        const center = resolveFieldCenter(field)!;
        const selected = field.id === selectedFieldId;
        return {
          id: field.id,
          coordinate: center,
          color: resolveFieldColor(field.color, field.id),
          label: friendlyFieldLabel(field.name),
          selected,
        };
      }),
    [mappableFields, selectedFieldId]
  );

  const handlePinPress = (fieldId: string) => {
    if (selectedFieldId === fieldId && onFieldPress) {
      onFieldPress(fieldId);
      return;
    }
    if (onFieldSelect) onFieldSelect(fieldId);
    else onFieldPress?.(fieldId);
  };

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
            maxZoom={MAP_MAX_ZOOM}
            showUserLocation={hasLocation}
            scrollEnabled
            zoomEnabled
            onMapReady={() => setMapReady(true)}
          >
            {mappableFields.map((field) => {
              const polygon = resolveFieldPolygon(field);
              if (!polygon || polygon.length < 3) return null;
              const accent = resolveFieldColor(field.color, field.id);
              const selected = field.id === selectedFieldId;
              return (
                <MapPolygonLayer
                  key={field.id}
                  id={field.id}
                  ring={polygon}
                  fillColor={accent}
                  strokeColor={accent}
                  fillOpacity={0}
                  strokeWidth={selected ? 3.5 : 2.75}
                  onPress={handlePinPress}
                />
              );
            })}
            <MapFieldPins pins={pins} compact={safeCompact} onPress={handlePinPress} />
          </AppMapView>
          <View style={styles.toggleOverlay}>
            <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
          </View>
          <View style={[styles.countPill, { backgroundColor: colors.surfaceElevated + 'E8' }]}>
            <Text style={[styles.countText, { color: colors.textPrimary }]}>
              {mappableFields.length} {t('summaryFields')}
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
});

export default FieldsMap;
