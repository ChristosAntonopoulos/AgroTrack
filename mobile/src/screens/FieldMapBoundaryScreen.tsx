import React, { useState, useEffect, useCallback, useContext } from 'react';
import { HeaderHeightContext } from '@react-navigation/elements';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { fieldService, GeoJsonPolygon } from '../services/fieldService';
import { useTheme } from '../context/ThemeContext';
import FieldBoundaryDrawMap, {
  BoundaryPoint,
  DrawPhase,
} from '../components/fields/FieldBoundaryDrawMap';
import LocationSearchField from '../components/fields/LocationSearchField';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { fieldHasBoundary } from '../utils/fieldDisplay';
import { formatAreaFromSqm, resolveFieldPolygon } from '../utils/fieldGeo';
import { spacing, typography } from '../theme';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import FocusSpotlight from '../components/onboarding/FocusSpotlight';

type Props = NativeStackScreenProps<RootStackParamList, 'FieldMapBoundary'>;

const FieldMapBoundaryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { fieldId } = route.params;
  const { t, i18n } = useTranslation(['fields', 'common', 'onboarding']);
  const { colors } = useTheme();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const activation = useOwnerActivationOptional();
  const { height: windowHeight } = useWindowDimensions();
  const [points, setPoints] = useState<BoundaryPoint[]>([]);
  const [drawPhase, setDrawPhase] = useState<DrawPhase>('locate');
  const [measuredSqm, setMeasuredSqm] = useState(0);
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [placeFocus, setPlaceFocus] = useState(0);
  const [fieldStatus, setFieldStatus] = useState<string | undefined>();
  const [hadBoundary, setHadBoundary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Leave room for search + tools + save; keep the map the hero.
  const mapHeight = Math.max(280, Math.min(420, Math.round(windowHeight * 0.48)));

  useEffect(() => {
    fieldService
      .getField(fieldId)
      .then((field) => {
        const existing = resolveFieldPolygon(field);
        if (existing?.length) setPoints(existing);
        setHadBoundary(fieldHasBoundary(field));
        setFieldStatus(field.status);
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
      // Clear coords while typing so the map waits for a list pick.
      const hasCoords =
        next.latitude != null &&
        next.longitude != null &&
        Number.isFinite(next.latitude) &&
        Number.isFinite(next.longitude);
      if (hasCoords) {
        setLatitude(next.latitude);
        setLongitude(next.longitude);
        setPlaceFocus((n) => n + 1);
      } else if (next.locationText.trim() !== locationText.trim()) {
        setLatitude(undefined);
        setLongitude(undefined);
      }
      try {
        await fieldService.updateField(fieldId, {
          locationText: next.locationText,
          latitude: hasCoords ? next.latitude : undefined,
          longitude: hasCoords ? next.longitude : undefined,
        });
      } catch {
        /* keep local map center even if save fails */
      }
    },
    [fieldId, locationText]
  );

  const saveBoundary = async (handoff: boolean) => {
    if (points.length < 3 || drawPhase !== 'done') {
      setError(t('addFieldWizard.errors.boundaryRequiredNow'));
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
      if (fieldStatus !== 'Active') {
        await fieldService.activateField(fieldId, {
          boundaryConfirmed: true,
          cadastreReferenceAcknowledged: true,
        });
        setFieldStatus('Active');
      }
      activation?.markFieldsDirty({ boundarySavedFieldId: fieldId });
      if (handoff) {
        navigation.replace('FieldDetail', { fieldId, groveReady: true, activation: 'spatial' });
        return;
      }
      navigation.goBack();
    } catch {
      setError(t('form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!activation) return;
    activation.setSpotlightScreen('boundary');
    return () => activation.setSpotlightScreen(null);
  }, [activation]);

  const showSpotlight = activation?.spotlightStep === 'drawBoundary';
  const placeChosen =
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const boundaryPhase: 'locate' | 'draw' = placeChosen ? 'draw' : 'locate';
  const finishingFirst = !hadBoundary;
  const shapeReady = drawPhase === 'done' && points.length >= 3;
  const areaLocale = i18n.language?.startsWith('it')
    ? 'it'
    : i18n.language?.startsWith('en')
      ? 'en'
      : 'el';
  const areaLabel = measuredSqm > 0 ? formatAreaFromSqm(measuredSqm, areaLocale) : '';
  const askingPlace = finishingFirst && (!placeChosen || points.length === 0);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background, paddingTop: headerHeight }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="always"
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {askingPlace ? t('createGrove.placeHeading') : t('addField.steps.boundary')}
        </Text>
        <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
          {t('addField.boundaryDescFriendly')}
        </Text>

        {showSpotlight && boundaryPhase !== 'locate' ? (
          <FocusSpotlight step="drawBoundary" boundaryPhase={boundaryPhase} />
        ) : null}

        {error ? (
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        ) : null}

        <View style={styles.searchBlock}>
          <LocationSearchField
            value={locationText}
            disabled={saving}
            compact
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
          placeFocus={placeFocus}
          height={mapHeight}
          onGestureActiveChange={(active) => setScrollEnabled(!active)}
          onMeasuredAreaChange={setMeasuredSqm}
          onPhaseChange={setDrawPhase}
          showSavedHint={!finishingFirst}
        />

        {finishingFirst && shapeReady ? (
          <View style={styles.result}>
            {areaLabel ? (
              <Text style={[styles.area, { color: colors.textPrimary }]}>
                {t('addField.boundaryAreaExplained', { area: areaLabel })}
              </Text>
            ) : null}
            <Button
              title={t('addField.continueToChronologio')}
              onPress={() => void saveBoundary(true)}
              loading={saving}
              fullWidth
              style={styles.save}
            />
          </View>
        ) : null}

        {!finishingFirst ? (
          <>
            <Button
              title={t('addFieldWizard.saveBoundary')}
              onPress={() => void saveBoundary(false)}
              loading={saving}
              disabled={!shapeReady}
              fullWidth
              style={styles.save}
            />
            <Button
              title={t('common:cancel')}
              variant="outline"
              onPress={() => navigation.goBack()}
              fullWidth
            />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'], gap: spacing.xs },
  title: { ...typography.styles.h4, fontWeight: '700' },
  desc: { ...typography.styles.caption, lineHeight: 18, marginBottom: spacing.xs },
  error: { marginBottom: spacing.xs },
  searchBlock: { marginBottom: spacing.xs, zIndex: 30, elevation: 30 },
  save: { marginTop: spacing.sm },
  result: { marginTop: spacing.sm, gap: spacing.xs },
  area: { ...typography.styles.body, fontWeight: '600' },
});

export default FieldMapBoundaryScreen;
