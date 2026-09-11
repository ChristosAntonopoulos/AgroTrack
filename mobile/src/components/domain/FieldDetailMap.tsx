import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
import { resolveFieldColor } from '../../utils/fieldColors';
import AppMapView, { AppMapViewRef } from '../maps/AppMapView';
import MapPolygonLayer from '../maps/MapPolygonLayer';
import MapPointLayer from '../maps/MapPointLayer';
import MapRasterOverlay from '../maps/MapRasterOverlay';
import MapLayerToggle from './MapLayerToggle';
import MapLayerSheet from './MapLayerSheet';
import MapZoomControls from '../maps/MapZoomControls';
import { SATELLITE_LAYER_IDS, useFieldMapLayers } from '../../hooks/useFieldMapLayers';
import { usePreferences } from '../../context/PreferencesContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';

export interface FieldDetailMapProps {
  field: Field;
  height?: number;
  onGestureActiveChange?: (active: boolean) => void;
  /** Set to false where only the boundary matters, such as compact previews. */
  showDataLayers?: boolean;
}

const FieldDetailMap: React.FC<FieldDetailMapProps> = ({
  field,
  height = 210,
  onGestureActiveChange,
  showDataLayers,
}) => {
  const { colors } = useTheme();
  const { showWidget, isEveryday, recordIntelligenceOpen } = usePreferences();
  const { t } = useTranslation(['fields', 'common', 'settings']);
  const [layersPeeked, setLayersPeeked] = useState(false);
  const allowDataLayers =
    showDataLayers === false
      ? false
      : Boolean(showDataLayers) || showWidget('mapLayerPanel') || layersPeeked;
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [opacity, setOpacity] = useState(0.5);

  const {
    definitions,
    activeLayerId,
    activeLayer,
    dates,
    selectedDateId,
    selectLayer,
    selectDate,
  } = useFieldMapLayers(allowDataLayers ? field.id : undefined);

  const satelliteLayerActive = Boolean(activeLayerId && SATELLITE_LAYER_IDS.includes(activeLayerId));
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
  const accent = resolveFieldColor(field.color, field.id);

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
          {t('fields:mapEmptyDescription')}
        </Text>
      </View>
    );
  }

  const overlayChips = allowDataLayers && definitions.length > 0;

  return (
    <View style={styles.block}>
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
        {activeLayer?.available ? (
          <MapRasterOverlay
            id={activeLayer.layerId}
            imageUrl={activeLayer.imageUrl}
            bounds={activeLayer.bounds}
            tileUrlTemplate={activeLayer.imageUrl ? undefined : activeLayer.tileUrlTemplate}
            opacity={opacity}
            belowLayerId={`polygon-fill-${field.id}`}
          />
        ) : null}

        {polygon && polygon.length >= 3 ? (
          <MapPolygonLayer
            id={field.id}
            ring={polygon}
            fillColor={accent}
            strokeColor={accent}
            fillOpacity={activeLayerId ? 0 : 0.28}
            strokeWidth={activeLayerId ? 3 : 2.5}
          />
        ) : (
          <MapPointLayer
            sourceId="field-center"
            points={[{ id: field.id, coordinate: center, color: accent }]}
            radius={10}
          />
        )}
      </AppMapView>
      <View style={styles.toggle} pointerEvents="box-none">
        {allowDataLayers ? (
          <Pressable
            onPress={() => setSheetVisible(true)}
            style={[
              styles.layersButton,
              {
                backgroundColor: colors.surfaceElevated + 'E6',
                borderColor: colors.borderLight,
                ...createElevation(colors, 'sm'),
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('fields:mapLayers.title')}
          >
            <Text style={[styles.layersLabel, { color: colors.textSecondary }]}>
              {t('fields:mapLayers.title')}
              {activeLayerId ? ` · ${t(`fields:mapLayers.names.${activeLayerId}`, { defaultValue: activeLayerId })}` : ''}
            </Text>
          </Pressable>
        ) : (
          <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact={isEveryday} />
        )}
      </View>
      <View style={styles.zoom} pointerEvents="box-none">
        <MapZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      </View>

      {allowDataLayers ? (
        <MapLayerSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          baseLayer={mapLayer}
          onBaseLayerChange={setMapLayer}
          overlays={definitions}
          activeLayerId={activeLayerId}
          onActiveLayerChange={selectLayer}
          activeLayer={activeLayer}
          opacity={opacity}
          onOpacityChange={setOpacity}
          dates={dates}
          selectedDateId={selectedDateId}
          onSelectDate={selectDate}
          satelliteLayerActive={satelliteLayerActive}
        />
      ) : null}
    </View>
    {showDataLayers !== false && isEveryday && !allowDataLayers ? (
      <Pressable
        onPress={() => {
          setLayersPeeked(true);
          void recordIntelligenceOpen();
        }}
        style={[styles.peekBtn, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
        accessibilityRole="button"
      >
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
          {t('settings:experience.peekMoreAboutField')}
        </Text>
      </Pressable>
    ) : null}
    {overlayChips ? (
      <View style={styles.chipBlock}>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => selectLayer(undefined)}
            style={[
              styles.chip,
              {
                borderColor: !activeLayerId ? colors.primary : colors.borderLight,
                backgroundColor: !activeLayerId ? colors.primary : colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: !activeLayerId }}
          >
            <Text style={{ color: !activeLayerId ? colors.onOlive : colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
              {t('fields:mapLayers.none')}
            </Text>
          </Pressable>
          {definitions.map((definition) => {
            const active = activeLayerId === definition.id;
            return (
              <Pressable
                key={definition.id}
                onPress={() => selectLayer(definition.id)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.primary : colors.borderLight,
                    backgroundColor: active ? colors.primary : colors.surface,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={{ color: active ? colors.onOlive : colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                  {t(`fields:mapLayers.names.${definition.id}`, { defaultValue: definition.name })}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  chipBlock: { gap: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
  },
  map: { flex: 1 },
  toggle: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  layersButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 200,
  },
  layersLabel: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 11,
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
  peekBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
});

export default FieldDetailMap;
