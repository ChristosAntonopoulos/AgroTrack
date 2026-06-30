import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import MapView, { Marker, Polygon, MapPressEvent } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { fieldService, GeoJsonPolygon } from '../services/fieldService';
import { useTheme } from '../context/ThemeContext';
import MapLayerToggle from '../components/domain/MapLayerToggle';
import {
  DEFAULT_MAP_LAYER,
  MapLayerType,
  FIELD_POLYGON_FILL,
  FIELD_POLYGON_STROKE,
  mapLayerToMapType,
} from '../utils/mapLayers';
import { resolveFieldCenter, resolveFieldPolygon, regionForCenter, regionForPolygon } from '../utils/fieldGeo';

type Props = NativeStackScreenProps<RootStackParamList, 'FieldMapBoundary'>;

const FieldMapBoundaryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { fieldId } = route.params;
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const [points, setPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayerType>(DEFAULT_MAP_LAYER);
  const [initialRegion, setInitialRegion] = useState({
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
          setInitialRegion(regionForPolygon(existing));
          return;
        }
        const center = resolveFieldCenter(field);
        if (center) {
          setInitialRegion(regionForCenter(center));
        }
      })
      .catch(() => {});
  }, [fieldId]);

  const region = useMemo(() => {
    if (points.length > 0) {
      if (points.length >= 3) return regionForPolygon(points);
      return regionForCenter(points[0], 0.008);
    }
    return initialRegion;
  }, [points, initialRegion]);

  const onMapPress = (e: MapPressEvent) => {
    setPoints((prev) => [...prev, e.nativeEvent.coordinate]);
  };

  const clearPoints = () => setPoints([]);

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
        <MapView
          style={styles.map}
          region={region}
          onPress={onMapPress}
          mapType={mapLayerToMapType(mapLayer)}
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
        </MapView>
        <View style={styles.toggleOverlay}>
          <MapLayerToggle value={mapLayer} onChange={setMapLayer} compact />
        </View>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('addFieldWizard.tapToAddPoint')}</Text>
      <View style={styles.actions}>
        <Pressable
          style={[styles.btnOutline, { borderColor: colors.borderLight }]}
          onPress={clearPoints}
        >
          <Text style={{ color: colors.textPrimary }}>{t('addFieldWizard.clearBoundary')}</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, { backgroundColor: colors.primaryDark }]}
          onPress={saveBoundary}
          disabled={saving}
        >
          <Text style={[styles.btnPrimaryText, { color: colors.textInverse }]}>
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
