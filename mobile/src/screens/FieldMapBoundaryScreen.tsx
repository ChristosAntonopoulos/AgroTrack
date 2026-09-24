import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { fieldService, GeoJsonPolygon } from '../services/fieldService';
import { useTheme } from '../context/ThemeContext';
import FieldBoundaryDrawMap, { BoundaryPoint } from '../components/fields/FieldBoundaryDrawMap';
import LocationSearchField from '../components/fields/LocationSearchField';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { resolveFieldPolygon } from '../utils/fieldGeo';
import { spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FieldMapBoundary'>;

const FieldMapBoundaryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { fieldId } = route.params;
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const [points, setPoints] = useState<BoundaryPoint[]>([]);
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    fieldService
      .getField(fieldId)
      .then((field) => {
        const existing = resolveFieldPolygon(field);
        if (existing?.length) setPoints(existing);
        setLocationText(field.locationText || '');
        setLatitude(field.latitude);
        setLongitude(field.longitude);
      })
      .catch(() => setError(t('form.failedLoad')))
      .finally(() => setLoading(false));
  }, [fieldId, t]);

  const persistLocation = useCallback(
    async (next: { locationText: string; latitude?: number; longitude?: number }) => {
      setLocationText(next.locationText);
      setLatitude(next.latitude);
      setLongitude(next.longitude);
      try {
        await fieldService.updateField(fieldId, {
          locationText: next.locationText,
          latitude: next.latitude,
          longitude: next.longitude,
        });
      } catch {
        /* keep local map center even if save fails */
      }
    },
    [fieldId]
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
      if (locationText.trim() || (latitude != null && longitude != null)) {
        await fieldService.updateField(fieldId, {
          locationText: locationText.trim() || undefined,
          latitude,
          longitude,
        });
      }
      await fieldService.updateBoundary(fieldId, boundary);
      navigation.goBack();
    } catch {
      setError(t('form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('addField.steps.boundary')}
        </Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]}>
          {t('addField.boundaryDescFriendly')}
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('createGrove.enrich.boundaryBody')}
        </Text>

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <View style={styles.searchBlock}>
          <LocationSearchField
            value={locationText}
            disabled={saving}
            onChange={(next) => {
              void persistLocation(next);
            }}
          />
        </View>

        <FieldBoundaryDrawMap
          points={points}
          onPointsChange={setPoints}
          locationQuery={locationText}
          latitude={latitude}
          longitude={longitude}
          height={400}
          onGestureActiveChange={(active) => setScrollEnabled(!active)}
        />

        <Button
          title={t('addFieldWizard.saveBoundary')}
          onPress={saveBoundary}
          loading={saving}
          disabled={points.length < 3}
          fullWidth
          style={styles.save}
        />
        <Button
          title={t('common:cancel')}
          variant="outline"
          onPress={() => navigation.goBack()}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.sm },
  title: { ...typography.styles.h3, fontWeight: '700' },
  desc: { ...typography.styles.bodySmall, lineHeight: 20 },
  hint: { ...typography.styles.caption, marginBottom: spacing.xs },
  error: { marginBottom: spacing.xs },
  searchBlock: { marginBottom: spacing.xs },
  save: { marginTop: spacing.md },
});

export default FieldMapBoundaryScreen;
