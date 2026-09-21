import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AppMapView from '../components/maps/AppMapView';
import MapPolygonLayer from '../components/maps/MapPolygonLayer';
import BoundaryVertexPins from '../components/fields/BoundaryVertexPins';
import MapLayerToggle from '../components/domain/MapLayerToggle';
import { RootStackParamList } from '../navigation/types';
import { fieldService, GeoJsonPolygon } from '../services/fieldService';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_MAP_LAYER, MAP_MAX_ZOOM, MapLayerType } from '../utils/mapLayers';
import { resolveFieldCenter, resolveFieldPolygon, regionForCenter, regionForPolygon } from '../utils/fieldGeo';
import type { MapRegion } from '../utils/maplibreGeo';
import { radii, spacing, typography, createElevation } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FieldMapBoundary'>;
type DrawPhase = 'locate' | 'drawing' | 'done';

const FieldMapBoundaryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { fieldId } = route.params;
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const [points, setPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);
  const [phase, setPhase] = useState<DrawPhase>('locate');
  const suppressMapTapUntilRef = useRef(0);
  const [region, setRegion] = useState<MapRegion>({
    latitude: 38.42,
    longitude: 23.72,
    latitudeDelta: 7.8,
    longitudeDelta: 7.8,
  });

  useEffect(() => {
    fieldService
      .getField(fieldId)
      .then((field) => {
        const existing = resolveFieldPolygon(field);
        if (existing?.length) {
          setPoints(existing);
          setRegion(regionForPolygon(existing));
          setPhase('done');
          return;
        }
        const center = resolveFieldCenter(field);
        if (center) {
          setRegion(regionForCenter(center));
        }
      })
      .catch(() => {});
  }, [fieldId]);

  useEffect(() => {
    if (points.length >= 3) {
      setRegion(regionForPolygon(points));
    } else if (points.length === 1) {
      setRegion(regionForCenter(points[0], 0.008));
    }
  }, [points]);

  const movePoint = useCallback((index: number, point: { latitude: number; longitude: number }) => {
    setPoints((prev) => prev.map((p, i) => (i === index ? point : p)));
  }, []);

  const saveBoundary = async () => {
    if (points.length < 3) {
      setError(t('addFieldWizard.errors.boundaryRequired'));
      return;
    }
    const ring = [...points, points[0]].map((p) => [p.longitude, p.latitude]);
    const boundary: GeoJsonPolygon = { type: 'Polygon', coordinates: [ring] };
    setSaving(true);
    setError(null);
    try {
      await fieldService.updateBoundary(fieldId, boundary);
      navigation.goBack();
    } catch {
      setError(t('form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const overlayBg = colors.surfaceElevated + 'F2';
  const overlayElevation = createElevation(colors, 'sm');

  const coachText =
    phase === 'locate'
      ? t('addField.boundaryCoachLocate')
      : phase === 'drawing'
        ? points.length === 0
          ? t('addField.boundaryCoachFirst')
          : points.length < 3
            ? t('addField.boundaryCoachMore', { count: points.length })
            : t('addField.boundaryCoachFinish')
        : t('addField.boundaryCoachDone');

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('addFieldWizard.steps.boundary')}</Text>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      <View style={[styles.coach, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
        <Text style={[styles.coachText, { color: colors.primary }]}>{coachText}</Text>
      </View>
      <View style={[styles.mapWrap, { borderColor: phase === 'drawing' ? colors.primary : colors.borderLight }]}>
        <AppMapView
          style={styles.map}
          region={region}
          mapLayer={mapLayer}
          maxZoom={MAP_MAX_ZOOM}
          onPress={({ coordinate }) => {
            if (phase !== 'drawing') return;
            if (Date.now() < suppressMapTapUntilRef.current) return;
            setPoints((prev) => [...prev, coordinate]);
          }}
        >
          <BoundaryVertexPins
            points={points}
            onMove={movePoint}
            suppressMapTapUntilRef={suppressMapTapUntilRef}
          />
          {points.length >= 3 ? (
            <MapPolygonLayer id="draft-boundary" ring={points} />
          ) : null}
        </AppMapView>
        <View style={styles.overlays} pointerEvents="box-none">
          <View style={styles.toggleOverlay} pointerEvents="box-none">
            <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
          </View>
          <View
            style={[
              styles.actionBar,
              { backgroundColor: overlayBg, borderColor: colors.borderLight, ...overlayElevation },
            ]}
          >
            {phase === 'locate' ? (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => setPhase('drawing')}
                accessibilityRole="button"
              >
                <Ionicons name="locate-outline" size={18} color={colors.onOlive} />
                <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
                  {t('addField.boundaryStartMarking')}
                </Text>
              </Pressable>
            ) : null}
            {phase === 'drawing' ? (
              <>
                <Pressable
                  style={[styles.btnOutline, { borderColor: colors.borderLight }]}
                  onPress={() => setPoints((prev) => prev.slice(0, -1))}
                  disabled={points.length === 0}
                >
                  <Text style={{ color: colors.textPrimary }}>{t('addField.boundaryUndo')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnOutline, { borderColor: colors.borderLight }]}
                  onPress={() => {
                    setPoints([]);
                    setPhase('drawing');
                  }}
                >
                  <Text style={{ color: colors.textPrimary }}>{t('addFieldWizard.clearBoundary')}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: colors.primary, opacity: points.length < 3 ? 0.45 : 1 },
                  ]}
                  onPress={() => {
                    if (points.length < 3) return;
                    setPhase('done');
                  }}
                  disabled={points.length < 3}
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
                  style={[styles.btnOutline, { borderColor: colors.borderLight }]}
                  onPress={() => {
                    setPoints([]);
                    setPhase('drawing');
                  }}
                >
                  <Text style={{ color: colors.textPrimary }}>{t('addField.boundaryRedraw')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={saveBoundary}
                  disabled={saving}
                >
                  <Text style={[styles.primaryBtnText, { color: colors.onOlive }]}>
                    {saving ? '…' : t('addFieldWizard.saveBoundary')}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  error: { marginBottom: 8 },
  coach: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  coachText: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  mapWrap: {
    height: 420,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    position: 'relative',
  },
  map: { flex: 1 },
  overlays: {
    ...StyleSheet.absoluteFillObject,
    padding: 10,
    gap: 8,
  },
  toggleOverlay: {
    alignSelf: 'flex-end',
  },
  actionBar: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  btnOutline: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryBtn: {
    flexGrow: 1,
    flexBasis: '100%',
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { fontWeight: '700' },
});

export default FieldMapBoundaryScreen;
