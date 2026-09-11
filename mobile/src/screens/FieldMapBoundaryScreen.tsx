import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import AppMapView from '../components/maps/AppMapView';
import MapPolygonLayer from '../components/maps/MapPolygonLayer';
import MapPointLayer from '../components/maps/MapPointLayer';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { fieldService, GeoJsonPolygon } from '../services/fieldService';
import { useTheme } from '../context/ThemeContext';
import MapLayerToggle from '../components/domain/MapLayerToggle';
import { DEFAULT_MAP_LAYER, MapLayerType } from '../utils/mapLayers';
import { resolveFieldCenter, resolveFieldPolygon, regionForCenter, regionForPolygon } from '../utils/fieldGeo';
import type { MapRegion } from '../utils/maplibreGeo';

type Props = NativeStackScreenProps<RootStackParamList, 'FieldMapBoundary'>;

const FieldMapBoundaryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { fieldId } = route.params;
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const [points, setPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);
  const [region, setRegion] = useState<MapRegion>({
    latitude: 37.05,
    longitude: 21.85,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    fieldService
      .getField(fieldId)
      .then((field) => {
        const existing = resolveFieldPolygon(field);
        if (existing?.length) {
          setPoints(existing);
          setRegion(regionForPolygon(existing));
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

  const vertexPoints = useMemo(
    () =>
      points.map((p, i) => ({
        id: `vertex-${i}`,
        coordinate: p,
        color: colors.primary,
      })),
    [points, colors.primary]
  );

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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('addFieldWizard.steps.boundary')}</Text>
      <Text style={[styles.desc, { color: colors.textSecondary }]}>{t('addFieldWizard.boundaryDesc')}</Text>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      <View style={[styles.mapWrap, { borderColor: colors.borderLight }]}>
        <AppMapView
          style={styles.map}
          region={region}
          mapLayer={mapLayer}
          onPress={({ coordinate }) => setPoints((prev) => [...prev, coordinate])}
        >
          <MapPointLayer sourceId="boundary-vertices" points={vertexPoints} radius={8} />
          {points.length >= 3 ? (
            <MapPolygonLayer id="draft-boundary" ring={points} />
          ) : null}
        </AppMapView>
        <View style={styles.toggleOverlay}>
          <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
        </View>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('addFieldWizard.tapToAddPoint')}</Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.btnOutline, { borderColor: colors.borderLight }]}
          onPress={() => setPoints([])}
        >
          <Text style={{ color: colors.textPrimary }}>{t('addFieldWizard.clearBoundary')}</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
          onPress={saveBoundary}
          disabled={saving}
        >
          <Text style={[styles.btnPrimaryText, { color: colors.onOlive }]}>
            {saving ? '…' : t('addFieldWizard.saveBoundary')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  desc: { marginBottom: 12 },
  error: { marginBottom: 8 },
  mapWrap: {
    height: 360,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
  },
  map: { flex: 1 },
  toggleOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  hint: { fontSize: 13, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnPrimaryText: { fontWeight: '600' },
});

export default FieldMapBoundaryScreen;
