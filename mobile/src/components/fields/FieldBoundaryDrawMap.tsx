import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder, type GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppMapView, { AppMapViewRef } from '../maps/AppMapView';
import MapPolygonLayer from '../maps/MapPolygonLayer';
import MapZoomControls from '../maps/MapZoomControls';
import BoundaryVertexPins from './BoundaryVertexPins';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import MapLayerToggle from '../domain/MapLayerToggle';
import { DEFAULT_MAP_LAYER, MAP_MAX_ZOOM, MapLayerType } from '../../utils/mapLayers';
import { formatAreaFromSqm, regionForCenter, regionForPolygon } from '../../utils/fieldGeo';
import {
  FIELD_HERO_MAX_ZOOM,
  FIELD_HERO_MIN_DELTA,
  FIELD_HERO_POLYGON_FACTOR,
  FIELD_HERO_POLYGON_PADDING,
} from '../../utils/fieldMapFraming';
import { capRegionZoom, zoomToLatitudeDelta, type MapRegion } from '../../utils/maplibreGeo';
import { estimatePolygonAreaSqm } from '../../utils/polygonArea';
import { locationService } from '../../services/locationService';
import { typography, spacing, radii, createElevation } from '../../theme';

export type BoundaryPoint = { latitude: number; longitude: number };

export type DrawPhase = 'locate' | 'drawing' | 'done';

interface Props {
  points: BoundaryPoint[];
  onPointsChange: (points: BoundaryPoint[]) => void;
  onMeasuredAreaChange?: (sqm: number) => void;
  onPhaseChange?: (phase: DrawPhase) => void;
  onGestureActiveChange?: (active: boolean) => void;
  locationQuery?: string;
  latitude?: number;
  longitude?: number;
  /** Bumps on every place pick so the same village can be chosen again. */
  placeFocus?: number;
  /** When set, map fills this height; otherwise uses a compact default. */
  height?: number;
  /** First-boundary flow shows the area sentence beside the continue button. */
  showSavedHint?: boolean;
}

/** Close enough to mark grove corners after a village is chosen. */
const PLACE_FOCUS_ZOOM = 16;
/** Finger can grab a corner from this many density-independent pixels away. */
const VERTEX_HIT_PX = 32;

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
  onPhaseChange,
  onGestureActiveChange,
  latitude,
  longitude,
  placeFocus = 0,
  height = 320,
  showSavedHint = true,
}) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('fields');
  const areaLocale = i18n.language?.startsWith('it')
    ? 'it'
    : i18n.language?.startsWith('en')
      ? 'en'
      : 'el';
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);
  const [region, setRegion] = useState<MapRegion>(GREECE_OVERVIEW);
  const [phase, setPhase] = useState<DrawPhase>(() => (points.length >= 3 ? 'done' : 'locate'));
  const mapRef = useRef<AppMapViewRef>(null);
  const mapWrapRef = useRef<View>(null);
  const mapOriginRef = useRef({ x: 0, y: 0 });
  const mapReadyRef = useRef(false);
  const suppressMapTapUntilRef = useRef(0);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const screensRef = useRef<Array<{ x: number; y: number } | null>>([]);
  const dragIndexRef = useRef<number | null>(null);
  const dragGenRef = useRef(0);
  const projectGenRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
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
      return capRegionZoom(regionForCenter(points[0], FIELD_HERO_MIN_DELTA), FIELD_HERO_MAX_ZOOM);
    }
    return region;
  }, [points, region]);

  const [locationMissing, setLocationMissing] = useState(false);

  useEffect(() => {
    // Corners must not move the camera. Fly when a place is chosen, including the same village again.
    if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }
    const next = regionForCenter({ latitude, longitude }, zoomToLatitudeDelta(PLACE_FOCUS_ZOOM));
    setRegion(next);
    setLocationMissing(false);
    mapRef.current?.flyTo(latitude, longitude, PLACE_FOCUS_ZOOM);
  }, [placeFocus, latitude, longitude]);

  useEffect(() => {
    if (points.length >= 3 && phase === 'locate') {
      setPhase('done');
      return;
    }
    if (phase !== 'locate') return;
    if (
      latitude != null &&
      longitude != null &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      setPhase('drawing');
    }
  }, [points.length, phase, latitude, longitude]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

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
      onPointsChange(pointsRef.current.map((p, i) => (i === index ? point : p)));
    },
    [onPointsChange]
  );
  const movePointRef = useRef(movePoint);
  movePointRef.current = movePoint;

  const measureMap = useCallback(() => {
    mapWrapRef.current?.measureInWindow((x, y) => {
      mapOriginRef.current = { x, y };
    });
  }, []);

  const refreshScreens = useCallback(async () => {
    const gen = ++projectGenRef.current;
    const current = pointsRef.current;
    const projected = await Promise.all(
      current.map((point) => mapRef.current?.getPointInView(point) ?? Promise.resolve(null))
    );
    if (gen !== projectGenRef.current) return;
    screensRef.current = projected;
  }, []);

  useEffect(() => {
    if (dragIndexRef.current != null) return;
    void refreshScreens();
  }, [points, refreshScreens]);

  const borderRef = useRef(1);
  borderRef.current = phase === 'drawing' ? 2 : 1;

  const fingerOnMap = (event: GestureResponderEvent) => ({
    x: event.nativeEvent.pageX - mapOriginRef.current.x - borderRef.current,
    y: event.nativeEvent.pageY - mapOriginRef.current.y - borderRef.current,
  });

  const hitVertex = (x: number, y: number) => {
    let best = -1;
    let bestDist = VERTEX_HIT_PX;
    screensRef.current.forEach((screen, index) => {
      if (!screen || !Number.isFinite(screen.x) || !Number.isFinite(screen.y)) return;
      const dist = Math.hypot(screen.x - x, screen.y - y);
      if (dist <= bestDist) {
        best = index;
        bestDist = dist;
      }
    });
    return best;
  };

  const holdMapTap = () => {
    suppressMapTapUntilRef.current = Date.now() + 700;
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (event) => {
        const finger = fingerOnMap(event);
        const index = hitVertex(finger.x, finger.y);
        if (index < 0) return false;
        dragIndexRef.current = index;
        return true;
      },
      onMoveShouldSetPanResponderCapture: () => dragIndexRef.current != null,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        holdMapTap();
        setActiveIndex(dragIndexRef.current);
        setGestureActive(true);
      },
      onPanResponderMove: (event) => {
        const index = dragIndexRef.current;
        if (index == null) return;
        const finger = fingerOnMap(event);
        const gen = ++dragGenRef.current;
        void mapRef.current?.getCoordinateFromView(finger.x, finger.y).then((next) => {
          if (!next || gen !== dragGenRef.current) return;
          movePointRef.current(index, next);
        });
      },
      onPanResponderRelease: () => {
        holdMapTap();
        dragIndexRef.current = null;
        dragGenRef.current += 1;
        setActiveIndex(null);
        setGestureActive(false);
        void refreshScreens();
      },
      onPanResponderTerminate: () => {
        dragIndexRef.current = null;
        dragGenRef.current += 1;
        setActiveIndex(null);
        setGestureActive(false);
        void refreshScreens();
      },
    })
  ).current;

  const centerOnUser = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      const center = { latitude: loc.latitude, longitude: loc.longitude };
      const next = capRegionZoom(regionForCenter(center, FIELD_HERO_MIN_DELTA), FIELD_HERO_MAX_ZOOM);
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
          ? latitude != null && longitude != null
            ? t('addField.boundaryCoachFound')
            : t('addField.boundaryCoachFirst')
          : points.length < 3
            ? t('addField.boundaryCoachMore', { count: points.length })
            : t('addField.boundaryCoachFinish')
        : t('addField.boundaryCoachDone');

  const chipBg = colors.surfaceElevated + 'F2';
  const chipElevation = createElevation(colors, 'sm');

  return (
    <View style={styles.wrap}>
      <Text style={[styles.coach, { color: colors.textSecondary }]} numberOfLines={2}>
        {coachText}
      </Text>

      <View
        ref={mapWrapRef}
        style={[
          styles.mapWrap,
          {
            height,
            borderColor: phase === 'drawing' ? colors.primary : colors.borderLight,
            borderWidth: phase === 'drawing' ? 2 : 1,
          },
        ]}
        onLayout={measureMap}
        onTouchStart={() => setGestureActive(true)}
        onTouchEnd={() => setGestureActive(false)}
        onTouchCancel={() => setGestureActive(false)}
        {...pan.panHandlers}
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
          onCameraIdle={() => {
            if (dragIndexRef.current == null) void refreshScreens();
          }}
          onMapReady={() => {
            mapReadyRef.current = true;
            measureMap();
            void refreshScreens();
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
          {points.length >= 3 ? <MapPolygonLayer id="draft-boundary" ring={points} /> : null}
          <BoundaryVertexPins points={points} activeIndex={activeIndex} />
        </AppMapView>

        {/* Compact map chrome only — tools live under the map */}
        <View style={styles.mapChrome} pointerEvents="box-none">
          <View style={styles.mapChromeTop} pointerEvents="box-none">
            <Pressable
              style={[
                styles.iconChip,
                { backgroundColor: chipBg, borderColor: colors.borderLight, ...chipElevation },
              ]}
              onPress={centerOnUser}
              accessibilityRole="button"
              accessibilityLabel={t('addField.useCurrentLocation')}
            >
              <Ionicons name="navigate-outline" size={18} color={colors.textPrimary} />
            </Pressable>
            <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
          </View>
          <View style={styles.zoom} pointerEvents="box-none">
            <MapZoomControls
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
            />
          </View>
        </View>
      </View>

      <View style={styles.tools}>
        {phase === 'locate' ? (
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
        ) : null}

        {phase === 'drawing' ? (
          <View style={styles.toolRow}>
            <Pressable
              style={[
                styles.toolBtn,
                {
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surface,
                  opacity: points.length === 0 ? 0.45 : 1,
                },
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
                {
                  borderColor: colors.borderLight,
                  backgroundColor: colors.surface,
                  opacity: points.length === 0 ? 0.45 : 1,
                },
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
                styles.primaryBtnInline,
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
          </View>
        ) : null}

        {phase === 'done' ? (
          <View style={styles.toolRow}>
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
            {showSavedHint ? (
              <Text style={[styles.doneNote, { color: colors.textSecondary }]} numberOfLines={2}>
                {t('addField.boundarySavedHint')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {points.length > 0 ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('addField.boundaryCornerCount', { count: points.length })}
            {measuredSqm > 0 ? ` · ${formatAreaFromSqm(measuredSqm, areaLocale)}` : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  coach: {
    ...typography.styles.caption,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 2,
  },
  mapWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  map: { flex: 1 },
  mapChrome: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  mapChromeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoom: { alignSelf: 'flex-end' },
  tools: { gap: spacing.xs, marginTop: spacing.xs },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  toolBtnText: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnInline: {
    flexGrow: 1,
    minWidth: 120,
  },
  primaryBtnText: {
    ...typography.styles.bodySmall,
    fontWeight: '700',
  },
  doneNote: {
    ...typography.styles.caption,
    fontWeight: '600',
    flex: 1,
  },
  hint: { ...typography.styles.caption, fontWeight: '600' },
});

export default FieldBoundaryDrawMap;
