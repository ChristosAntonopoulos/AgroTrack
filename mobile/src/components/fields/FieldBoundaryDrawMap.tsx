import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppMapView, { AppMapViewRef } from '../maps/AppMapView';
import MapPolygonLayer from '../maps/MapPolygonLayer';
import MapZoomControls from '../maps/MapZoomControls';
import BoundaryVertexPins from './BoundaryVertexPins';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import MapLayerToggle from '../domain/MapLayerToggle';
import { DEFAULT_MAP_LAYER, MAP_MAX_ZOOM, MapLayerType } from '../../utils/mapLayers';
import { regionForCenter, regionForPolygon } from '../../utils/fieldGeo';
import {
  FIELD_HERO_MAX_ZOOM,
  FIELD_HERO_MIN_DELTA,
  FIELD_HERO_POLYGON_FACTOR,
  FIELD_HERO_POLYGON_PADDING,
} from '../../utils/fieldMapFraming';
import { capRegionZoom, type MapRegion } from '../../utils/maplibreGeo';
import { estimatePolygonAreaSqm } from '../../utils/polygonArea';
import { locationService } from '../../services/locationService';
import { geocodeFirstPlace } from '../../utils/geocodeLocation';
import { typography, spacing, radii, createElevation } from '../../theme';

export type BoundaryPoint = { latitude: number; longitude: number };

type DrawPhase = 'locate' | 'drawing' | 'done';

interface Props {
  points: BoundaryPoint[];
  onPointsChange: (points: BoundaryPoint[]) => void;
  onMeasuredAreaChange?: (sqm: number) => void;
  onGestureActiveChange?: (active: boolean) => void;
  locationQuery?: string;
  latitude?: number;
  longitude?: number;
  height?: number;
}

const GREECE_OVERVIEW: MapRegion = {
  latitude: 38.42,
  longitude: 23.72,
  latitudeDelta: 7.8,
  longitudeDelta: 7.8,
};

const FieldBoundaryDrawMap: React.FC<Props> = ({
  points,
  onPointsChange,
  onMeasuredAreaChange,
  onGestureActiveChange,
  locationQuery,
  latitude,
  longitude,
  height = 360,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);
  const [region, setRegion] = useState<MapRegion>(GREECE_OVERVIEW);
  const [phase, setPhase] = useState<DrawPhase>(() => (points.length >= 3 ? 'done' : 'locate'));
  const mapRef = useRef<AppMapViewRef>(null);
  const mapReadyRef = useRef(false);
  const suppressMapTapUntilRef = useRef(0);
  /** True when the step opened with a saved polygon (edit) — frame once on load only. */
  const hadBoundaryOnMount = useRef(points.length >= 3);
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

  const framedRegion = useMemo(() => {
    if (points.length >= 3) {
      return capRegionZoom(
        regionForPolygon(points, FIELD_HERO_POLYGON_FACTOR, FIELD_HERO_MIN_DELTA),
        FIELD_HERO_MAX_ZOOM
      );
    }
    if (points.length >= 1) {
      return capRegionZoom(
        regionForCenter(points[0], FIELD_HERO_MIN_DELTA),
        FIELD_HERO_MAX_ZOOM
      );
    }
    return region;
  }, [points, region]);

  const [locationMissing, setLocationMissing] = useState(false);

  useEffect(() => {
    if (points.length >= 3) return;
    const goTo = (lat: number, lng: number) => {
      const next = capRegionZoom(regionForCenter({ latitude: lat, longitude: lng }, FIELD_HERO_MIN_DELTA), FIELD_HERO_MAX_ZOOM);
      setRegion(next);
      setLocationMissing(false);
      mapRef.current?.animateToRegion(next, FIELD_HERO_MAX_ZOOM);
    };
    if (latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      goTo(latitude, longitude);
      return;
    }
    const query = (locationQuery || '').trim();
    if (!query) {
      setRegion(GREECE_OVERVIEW);
      setLocationMissing(false);
      mapRef.current?.animateToRegion(GREECE_OVERVIEW);
      return;
    }
    let cancelled = false;
    void geocodeFirstPlace(query).then((place) => {
      if (cancelled) return;
      if (place) goTo(place.latitude, place.longitude);
      else {
        setRegion(GREECE_OVERVIEW);
        setLocationMissing(true);
        mapRef.current?.animateToRegion(GREECE_OVERVIEW);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locationQuery, latitude, longitude, points.length]);

  useEffect(() => {
    if (points.length >= 3 && phase === 'locate') {
      setPhase('done');
    }
  }, [points.length, phase]);

  const focusMap = useCallback(() => {
    if (points.length >= 3) {
      mapRef.current?.fitCoordinates(
        points,
        FIELD_HERO_POLYGON_PADDING,
        FIELD_HERO_MAX_ZOOM,
        FIELD_HERO_MAX_ZOOM
      );
      return;
    }
    if (points.length >= 1) {
      mapRef.current?.animateToRegion(framedRegion, FIELD_HERO_MAX_ZOOM);
    }
  }, [points, framedRegion]);

  useEffect(() => {
    if (points.length >= 3) {
      const ring = [...points, points[0]].map((p) => [p.longitude, p.latitude]);
      onMeasuredAreaChange?.(Math.round(estimatePolygonAreaSqm(ring)));
    } else {
      onMeasuredAreaChange?.(0);
    }
  }, [points, onMeasuredAreaChange]);

  useEffect(() => {
    mapReadyRef.current = false;
  }, [mapLayer]);

  const measuredSqm = useMemo(() => {
    if (points.length < 3) return 0;
    const ring = [...points, points[0]].map((p) => [p.longitude, p.latitude]);
    return Math.round(estimatePolygonAreaSqm(ring));
  }, [points]);

  const movePoint = useCallback(
    (index: number, point: BoundaryPoint) => {
      const next = points.map((p, i) => (i === index ? point : p));
      onPointsChange(next);
    },
    [onPointsChange, points]
  );

  const centerOnUser = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      const center = { latitude: loc.latitude, longitude: loc.longitude };
      const next = capRegionZoom(
        regionForCenter(center, FIELD_HERO_MIN_DELTA),
        FIELD_HERO_MAX_ZOOM
      );
      setRegion(next);
      setLocationMissing(false);
      mapRef.current?.animateToRegion(next, FIELD_HERO_MAX_ZOOM);
    } catch {
      /* location unavailable */
    }
  };

  const finishShape = () => {
    if (points.length < 3) return;
    setPhase('done');
  };

  const clearBoundary = () => {
    onPointsChange([]);
    setPhase('drawing');
  };

  const coachText =
    phase === 'locate'
      ? locationMissing
        ? t('addField.locationNotFound')
        : t('addField.boundaryCoachLocate')
      : phase === 'drawing'
        ? points.length === 0
          ? t('addField.boundaryCoachFirst')
          : points.length < 3
            ? t('addField.boundaryCoachMore', { count: points.length })
            : t('addField.boundaryCoachFinish')
        : t('addField.boundaryCoachDone');

  const overlayBg = colors.surfaceElevated + 'F2';
  const overlayElevation = createElevation(colors, 'sm');

  return (
    <View style={styles.wrap}>
      <View style={[styles.coach, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
        <Text style={[styles.coachText, { color: colors.primary }]}>{coachText}</Text>
      </View>

      <View
        style={[
          styles.mapWrap,
          {
            height,
            borderColor: phase === 'drawing' ? colors.primary : colors.borderLight,
            borderWidth: phase === 'drawing' ? 2 : 1,
          },
        ]}
        onTouchStart={() => setGestureActive(true)}
        onTouchEnd={() => setGestureActive(false)}
        onTouchCancel={() => setGestureActive(false)}
      >
        <AppMapView
          ref={mapRef}
          key={`boundary-draw-${mapLayer}`}
          style={styles.map}
          initialRegion={framedRegion}
          maxZoom={MAP_MAX_ZOOM}
          mapLayer={mapLayer}
          scrollEnabled
          zoomEnabled
          rotateEnabled={false}
          pitchEnabled={false}
          onMapReady={() => {
            mapReadyRef.current = true;
            if (hadBoundaryOnMount.current && points.length >= 3) {
              focusMap();
            }
          }}
          onPress={({ coordinate }) => {
            if (phase !== 'drawing') return;
            if (Date.now() < suppressMapTapUntilRef.current) return;
            onPointsChange([...points, coordinate]);
          }}
        >
          <BoundaryVertexPins
            points={points}
            onMove={movePoint}
            suppressMapTapUntilRef={suppressMapTapUntilRef}
            onDragActiveChange={setGestureActive}
          />
          {points.length >= 3 ? (
            <MapPolygonLayer id="draft-boundary" ring={points} />
          ) : null}
        </AppMapView>

        <View style={styles.overlays} pointerEvents="box-none">
          <View style={styles.overlayTop} pointerEvents="box-none">
            <View style={styles.toggle} pointerEvents="box-none">
              <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
            </View>

            <View
              style={[
                styles.actionBar,
                { backgroundColor: overlayBg, borderColor: colors.borderLight, ...overlayElevation },
              ]}
            >
              {phase === 'locate' ? (
                <>
                  <Pressable
                    style={[styles.toolBtn, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
                    onPress={centerOnUser}
                    accessibilityRole="button"
                    accessibilityLabel={t('addField.useCurrentLocation')}
                  >
                    <Ionicons name="navigate-outline" size={16} color={colors.textPrimary} />
                    <Text style={[styles.toolBtnText, { color: colors.textPrimary }]}>
                      {t('addField.useCurrentLocation')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setPhase('drawing')}
                    accessibilityRole="button"
                    accessibilityLabel={t('addField.boundaryStartMarking')}
                  >
                    <Ionicons name="locate-outline" size={18} color={colors.onOlive} />
                    <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
                      {t('addField.boundaryStartMarking')}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {phase === 'drawing' ? (
                <>
                  <Pressable
                    style={[
                      styles.toolBtn,
                      { borderColor: colors.borderLight, backgroundColor: colors.surface, opacity: points.length === 0 ? 0.45 : 1 },
                    ]}
                    onPress={() => onPointsChange(points.slice(0, -1))}
                    disabled={points.length === 0}
                    accessibilityRole="button"
                  >
                    <Ionicons name="arrow-undo-outline" size={16} color={colors.textPrimary} />
                    <Text style={[styles.toolBtnText, { color: colors.textPrimary }]}>
                      {t('addField.boundaryUndo')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.toolBtn,
                      { borderColor: colors.borderLight, backgroundColor: colors.surface, opacity: points.length === 0 ? 0.45 : 1 },
                    ]}
                    onPress={clearBoundary}
                    disabled={points.length === 0}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textPrimary} />
                    <Text style={[styles.toolBtnText, { color: colors.textPrimary }]}>
                      {t('addField.boundaryClear')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.primaryBtn,
                      { backgroundColor: colors.primary, opacity: points.length < 3 ? 0.45 : 1 },
                    ]}
                    onPress={finishShape}
                    disabled={points.length < 3}
                    accessibilityRole="button"
                  >
                    <Ionicons name="checkmark" size={18} color={colors.onOlive} />
                    <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
                      {t('addField.boundaryFinish')}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {phase === 'done' ? (
                <>
                  <Pressable
                    style={[styles.toolBtn, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
                    onPress={clearBoundary}
                    accessibilityRole="button"
                  >
                    <Ionicons name="refresh-outline" size={16} color={colors.textPrimary} />
                    <Text style={[styles.toolBtnText, { color: colors.textPrimary }]}>
                      {t('addField.boundaryRedraw')}
                    </Text>
                  </Pressable>
                  <Text style={[styles.doneNote, { color: colors.textSecondary }]}>
                    {t('addField.boundarySavedHint')}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.zoom} pointerEvents="box-none">
          <MapZoomControls
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
          />
        </View>
      </View>

      {points.length > 0 ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('addField.boundaryCornerCount', { count: points.length })}
          {measuredSqm > 0 ? ` · ${measuredSqm} m²` : ''}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  coach: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  coachText: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  mapWrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  map: { flex: 1 },
  overlays: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.sm,
  },
  overlayTop: {
    gap: spacing.sm,
  },
  toggle: { alignSelf: 'flex-end' },
  actionBar: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  toolBtnText: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  primaryBtn: {
    flexGrow: 1,
    flexBasis: '100%',
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    ...typography.styles.body,
    fontWeight: '700',
  },
  doneNote: {
    ...typography.styles.caption,
    fontWeight: '600',
    flex: 1,
  },
  zoom: { position: 'absolute', bottom: spacing.sm, right: spacing.sm },
  hint: { ...typography.styles.caption, fontWeight: '600' },
});

export default FieldBoundaryDrawMap;
