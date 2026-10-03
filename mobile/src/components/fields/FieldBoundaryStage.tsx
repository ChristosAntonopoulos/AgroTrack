import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  type GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AppMapView, { AppMapViewRef } from '../maps/AppMapView';
import MapPolygonLayer from '../maps/MapPolygonLayer';
import MapDraftPathLayer from '../maps/MapDraftPathLayer';
import MapZoomControls from '../maps/MapZoomControls';
import BoundaryVertexPins from './BoundaryVertexPins';
import LocationSearchField from './LocationSearchField';
import MapLayerToggle from '../domain/MapLayerToggle';
import { useTheme } from '../../context/ThemeContext';
import { DEFAULT_MAP_LAYER, MAP_MAX_ZOOM, MapLayerType } from '../../utils/mapLayers';
import { formatAreaFromSqm, regionForCenter, regionForPolygon } from '../../utils/fieldGeo';
import {
  FIELD_HERO_MAX_ZOOM,
  FIELD_HERO_MIN_DELTA,
  FIELD_HERO_POLYGON_FACTOR,
  FIELD_HERO_POLYGON_PADDING,
} from '../../utils/fieldMapFraming';
import { capRegionZoom, zoomToLatitudeDelta, type MapRegion } from '../../utils/maplibreGeo';
import {
  MIN_DRAW_ZOOM,
  validateBoundaryPolygon,
  type BoundaryValidationCode,
} from '../../utils/boundaryValidation';
import { locationService } from '../../services/locationService';
import type { GeoJsonPolygon } from '../../services/fieldService';
import { reverseGeocode } from '../../utils/geocodeLocation';
import { typography, spacing, radii, createElevation } from '../../theme';

export type BoundaryPoint = { latitude: number; longitude: number };
export type DrawPhase = 'locate' | 'drawing' | 'done';

type Props = {
  points: BoundaryPoint[];
  onPointsChange: (points: BoundaryPoint[]) => void;
  locationText: string;
  latitude?: number;
  longitude?: number;
  placeFocus?: number;
  onLocationChange: (next: { locationText: string; latitude?: number; longitude?: number }) => void;
  /** First grove: primary CTA continues into History / spatial welcome. */
  finishingFirst: boolean;
  saving?: boolean;
  onContinue: () => void;
  onSaveExisting?: () => void;
  onCancel?: () => void;
  error?: string | null;
};

const PLACE_FOCUS_ZOOM = 16;
const VERTEX_HIT_PX = 36;

const GREECE_OVERVIEW: MapRegion = {
  latitude: 38.42,
  longitude: 23.72,
  latitudeDelta: 7.8,
  longitudeDelta: 7.8,
};

const toPolygon = (pts: BoundaryPoint[]): GeoJsonPolygon => {
  const ring = [...pts, pts[0]].map((p) => [p.longitude, p.latitude]);
  return { type: 'Polygon', coordinates: [ring] };
};

/**
 * Full-bleed boundary stage — map fills the screen, search floats on top,
 * undo / finish live in a bottom sheet (web parity).
 */
const FieldBoundaryStage: React.FC<Props> = ({
  points,
  onPointsChange,
  locationText,
  latitude,
  longitude,
  placeFocus = 0,
  onLocationChange,
  finishingFirst,
  saving = false,
  onContinue,
  onSaveExisting,
  onCancel,
  error = null,
}) => {
  const { t, i18n } = useTranslation(['fields', 'common', 'onboarding']);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const areaLocale = i18n.language?.startsWith('it')
    ? 'it'
    : i18n.language?.startsWith('en')
      ? 'en'
      : 'el';

  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);
  const [region, setRegion] = useState<MapRegion>(GREECE_OVERVIEW);
  const [phase, setPhase] = useState<DrawPhase>(() => (points.length >= 3 ? 'done' : 'locate'));
  const [liveZoom, setLiveZoom] = useState(PLACE_FOCUS_ZOOM);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [measuredSqm, setMeasuredSqm] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const mapRef = useRef<AppMapViewRef>(null);
  const mapWrapRef = useRef<View>(null);
  const mapOriginRef = useRef({ x: 0, y: 0 });
  const suppressMapTapUntilRef = useRef(0);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const screensRef = useRef<Array<{ x: number; y: number } | null>>([]);
  const dragIndexRef = useRef<number | null>(null);
  const dragGenRef = useRef(0);
  const projectGenRef = useRef(0);
  const hadBoundaryOnMount = useRef(points.length >= 3);

  const zoomTooLow = liveZoom < MIN_DRAW_ZOOM;
  const placeChosen =
    latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);

  const validationMessage = useCallback(
    (code: BoundaryValidationCode) => t(`addField.boundaryValidation.${code}`),
    [t]
  );

  useEffect(() => {
    if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }
    const next = regionForCenter({ latitude, longitude }, zoomToLatitudeDelta(PLACE_FOCUS_ZOOM));
    setRegion(next);
    mapRef.current?.flyTo(latitude, longitude, PLACE_FOCUS_ZOOM);
    setLiveZoom(PLACE_FOCUS_ZOOM);
  }, [placeFocus, latitude, longitude]);

  useEffect(() => {
    if (points.length >= 3 && phase === 'locate') {
      setPhase('done');
      return;
    }
    if (phase !== 'locate') return;
    if (placeChosen) setPhase('drawing');
  }, [points.length, phase, placeChosen]);

  useEffect(() => {
    if (points.length < 3) {
      setMeasuredSqm(0);
      return;
    }
    const result = validateBoundaryPolygon(toPolygon(points));
    if (result.ok) {
      setMeasuredSqm(Math.round(result.areaSqm));
      setDrawError(result.warnLarge ? t('addField.boundaryValidation.warnLarge') : null);
    } else if (result.areaSqm != null) {
      setMeasuredSqm(Math.round(result.areaSqm));
    }
  }, [points, t]);

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

  const movePoint = useCallback(
    (index: number, point: BoundaryPoint) => {
      onPointsChange(pointsRef.current.map((p, i) => (i === index ? point : p)));
    },
    [onPointsChange]
  );
  const movePointRef = useRef(movePoint);
  movePointRef.current = movePoint;

  const fingerOnMap = (event: GestureResponderEvent) => ({
    x: event.nativeEvent.pageX - mapOriginRef.current.x,
    y: event.nativeEvent.pageY - mapOriginRef.current.y,
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
        setDragging(true);
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
        setDragging(false);
        void refreshScreens();
      },
      onPanResponderTerminate: () => {
        dragIndexRef.current = null;
        dragGenRef.current += 1;
        setActiveIndex(null);
        setDragging(false);
        void refreshScreens();
      },
    })
  ).current;

  const centerOnUser = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      const place = await reverseGeocode(loc.latitude, loc.longitude, {
        language: i18n.language,
      }).catch(() => null);
      onLocationChange({
        locationText:
          place?.label ||
          t('addField.useCurrentLocation', {
            defaultValue: t('createGrove.placement.nearMe'),
          }),
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    } catch {
      /* location unavailable */
    }
  };

  const startDrawing = () => {
    if (zoomTooLow) {
      setDrawError(t('addField.boundaryValidation.zoomTooLow'));
      return;
    }
    setDrawError(null);
    setPhase('drawing');
  };

  const undoCorner = () => {
    if (points.length === 0) return;
    const next = points.slice(0, -1);
    onPointsChange(next);
    if (phase === 'done') {
      setPhase('drawing');
      setDrawError(null);
    }
  };

  const clearCorners = () => {
    onPointsChange([]);
    setPhase('drawing');
    setDrawError(null);
    setMeasuredSqm(0);
  };

  const finishShape = () => {
    if (points.length < 3) return;
    if (zoomTooLow) {
      setDrawError(t('addField.boundaryValidation.zoomTooLow'));
      return;
    }
    const result = validateBoundaryPolygon(toPolygon(points), { mapZoom: liveZoom });
    if (!result.ok) {
      setDrawError(validationMessage(result.code));
      return;
    }
    setMeasuredSqm(Math.round(result.areaSqm));
    setDrawError(result.warnLarge ? t('addField.boundaryValidation.warnLarge') : null);
    setPhase('done');
  };

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

  const coachText =
    phase === 'locate'
      ? t('addField.boundaryCoachLocate')
      : phase === 'drawing'
        ? points.length === 0 && placeChosen
          ? t('addField.boundaryCoachFound')
          : points.length === 0
            ? t('addField.boundaryCoachFirst')
            : points.length < 3
              ? t('addField.boundaryCoachMore', { count: points.length })
              : t('addField.boundaryCoachFinish')
        : t('addField.boundaryCoachDone');

  const areaLabel = measuredSqm > 0 ? formatAreaFromSqm(measuredSqm, areaLocale) : '';
  const needsZoom = zoomTooLow && phase !== 'done';
  const sheetLine = needsZoom
    ? t('addField.boundaryCoachZoomIn')
    : phase === 'done'
      ? areaLabel
        ? t('addField.boundaryAreaExplained', { area: areaLabel })
        : t('addField.boundarySheet.saved')
      : coachText;
  const zoomTip = needsZoom ? t('addField.boundaryCoachZoomInHint') : null;
  const chipBg = colors.surfaceElevated + 'F2';
  const chipElevation = createElevation(colors, 'sm');
  const alertText = drawError || error;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        ref={mapWrapRef}
        style={styles.mapFill}
        onLayout={measureMap}
        {...pan.panHandlers}
      >
        <AppMapView
          ref={mapRef}
          key={`boundary-stage-${mapLayer}`}
          style={StyleSheet.absoluteFill}
          initialRegion={framedRegion}
          maxZoom={MAP_MAX_ZOOM}
          mapLayer={mapLayer}
          scrollEnabled={!dragging}
          zoomEnabled={!dragging}
          rotateEnabled={false}
          pitchEnabled={false}
          onZoomChange={setLiveZoom}
          onCameraIdle={() => {
            if (dragIndexRef.current == null) void refreshScreens();
          }}
          onMapReady={() => {
            measureMap();
            void refreshScreens();
            if (hadBoundaryOnMount.current && points.length >= 3) {
              mapRef.current?.fitCoordinates(
                points,
                FIELD_HERO_POLYGON_PADDING,
                FIELD_HERO_MAX_ZOOM,
                FIELD_HERO_MAX_ZOOM
              );
            }
          }}
          onPress={({ coordinate }) => {
            if (phase !== 'drawing') return;
            if (Date.now() < suppressMapTapUntilRef.current) return;
            if (zoomTooLow) {
              setDrawError(t('addField.boundaryValidation.zoomTooLow'));
              return;
            }
            setDrawError(null);
            onPointsChange([...points, coordinate]);
          }}
        >
          {phase !== 'done' && points.length >= 2 ? (
            <MapDraftPathLayer id="draft-open" points={points} dashed />
          ) : null}
          {points.length >= 3 ? (
            <MapPolygonLayer
              id="draft-boundary"
              ring={points}
              fillOpacity={phase === 'done' ? 0.32 : 0.12}
            />
          ) : null}
          <BoundaryVertexPins points={points} activeIndex={activeIndex} numbered />
        </AppMapView>

        {/* Mid-map chrome: layers + zoom, clear of search and sheet */}
        <View
          style={[styles.mapChrome, { top: insets.top + 72, bottom: 168 + insets.bottom }]}
          pointerEvents="box-none"
        >
          <View style={styles.mapChromeSide} pointerEvents="box-none">
            <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
          </View>
          <View style={styles.mapChromeSide} pointerEvents="box-none">
            <MapZoomControls
              onZoomIn={() => mapRef.current?.zoomIn()}
              onZoomOut={() => mapRef.current?.zoomOut()}
            />
          </View>
        </View>
      </View>

      {/* Top: search + locate only — coach lives in the bottom sheet */}
      <View
        style={[styles.topChrome, { paddingTop: Math.max(insets.top, 8) + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <LocationSearchField
              value={locationText}
              disabled={saving}
              compact
              onChange={onLocationChange}
            />
          </View>
          <Pressable
            style={[
              styles.locateBtn,
              { backgroundColor: chipBg, borderColor: colors.borderLight, ...chipElevation },
            ]}
            onPress={() => void centerOnUser()}
            accessibilityRole="button"
            accessibilityLabel={t('addField.useCurrentLocation')}
          >
            <Ionicons name="navigate-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Bottom sheet: status + undo/clear + primary */}
      <View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.borderLight,
          },
        ]}
        accessibilityRole="summary"
      >
        <Text style={[styles.sheetLine, { color: colors.textPrimary }]} numberOfLines={2}>
          {sheetLine}
        </Text>
        {zoomTip ? (
          <View
            style={[
              styles.tipRow,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.oliveBorder,
              },
            ]}
            accessibilityRole="text"
          >
            <Ionicons name="expand-outline" size={18} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.textPrimary }]} numberOfLines={2}>
              {zoomTip}
            </Text>
          </View>
        ) : null}
        {alertText ? (
          <View
            style={[
              styles.tipRow,
              {
                backgroundColor: colors.errorLight,
                borderColor: colors.error,
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={[styles.tipText, { color: colors.error }]} numberOfLines={2}>
              {alertText}
            </Text>
          </View>
        ) : null}
        <View style={styles.sheetActions}>
          {points.length > 0 && phase === 'drawing' ? (
            <Pressable
              style={[styles.iconBtn, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
              onPress={undoCorner}
              accessibilityRole="button"
              accessibilityLabel={t('addField.boundaryUndo')}
            >
              <Ionicons name="arrow-undo-outline" size={20} color={colors.textPrimary} />
            </Pressable>
          ) : null}
          {points.length > 0 ? (
            <Pressable
              style={[styles.iconBtn, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}
              onPress={clearCorners}
              accessibilityRole="button"
              accessibilityLabel={
                phase === 'done' ? t('addField.boundaryRedraw') : t('addField.boundaryClear')
              }
            >
              <Ionicons
                name={phase === 'done' ? 'refresh-outline' : 'trash-outline'}
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
          ) : null}

          {phase === 'done' ? (
            <Pressable
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={finishingFirst ? onContinue : onSaveExisting}
              disabled={saving}
              accessibilityRole="button"
            >
              <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
                {finishingFirst
                  ? t('addField.continueToChronologio')
                  : t('addFieldWizard.saveBoundary')}
              </Text>
            </Pressable>
          ) : phase === 'locate' ? (
            <Pressable
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: zoomTooLow ? 0.45 : 1 },
              ]}
              onPress={startDrawing}
              disabled={zoomTooLow}
              accessibilityRole="button"
            >
              <Ionicons name="locate-outline" size={18} color={colors.onOlive} />
              <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
                {t('addField.boundaryStartMarking')}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: points.length < 3 || zoomTooLow ? 0.45 : 1,
                },
              ]}
              onPress={finishShape}
              disabled={points.length < 3 || zoomTooLow}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark" size={18} color={colors.onOlive} />
              <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
                {t('addField.boundaryFinish')}
              </Text>
            </Pressable>
          )}
        </View>
        {!finishingFirst && onCancel && phase === 'done' ? (
          <Pressable onPress={onCancel} hitSlop={8} style={styles.cancelLink}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
              {t('common:cancel')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapFill: { ...StyleSheet.absoluteFillObject },
  mapChrome: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mapChromeSide: { gap: spacing.xs },
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    zIndex: 40,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  searchField: {
    flex: 1,
    minWidth: 0,
    zIndex: 50,
    borderRadius: 14,
    overflow: 'visible',
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: 'rgba(34, 40, 31, 0.14)',
    paddingHorizontal: 4,
    paddingTop: 2,
    shadowColor: '#080c0a',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  locateBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: spacing.base,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    gap: 8,
    zIndex: 30,
    shadowColor: '#080c0a',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  sheetLine: {
    ...typography.styles.body,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipText: {
    ...typography.styles.bodySmall,
    flex: 1,
    fontWeight: '600',
    lineHeight: 20,
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    ...typography.styles.bodySmall,
    fontWeight: '700',
  },
  cancelLink: { alignSelf: 'center', paddingVertical: 4 },
  cancelText: { ...typography.styles.caption, fontWeight: '700' },
});

export default FieldBoundaryStage;
