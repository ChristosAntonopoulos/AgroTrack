import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { fieldService } from '../services/fieldService';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import LocationSearchField from '../components/fields/LocationSearchField';
import AppMapView, { type AppMapViewRef } from '../components/maps/AppMapView';
import MapPointLayer from '../components/maps/MapPointLayer';
import { useTheme } from '../context/ThemeContext';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import { fieldHasLocation } from '../utils/fieldDisplay';
import { GREECE_CENTER } from '../utils/geocodeLocation';
import { spacing, typography } from '../theme';
import { SQM_PER_STREMMA } from '../utils/boundaryValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'FieldPlace'>;
type AreaUnit = 'stremmata' | 'hectares';
type Step = 'place' | 'area';

const SQM_PER_HECTARE = 10_000;
const PLACE_ZOOM = 15;

const estimatedHectaresFromInput = (raw: string, unit: AreaUnit): number | null => {
  const n = Number.parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (unit === 'hectares') return n;
  return (n * SQM_PER_STREMMA) / SQM_PER_HECTARE;
};

const FieldPlaceScreen: React.FC<Props> = ({ route, navigation }) => {
  const { fieldId } = route.params;
  const { t, i18n } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const activation = useOwnerActivationOptional();
  const mapRef = useRef<AppMapViewRef>(null);

  const [step, setStep] = useState<Step>('place');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldStatus, setFieldStatus] = useState<string | undefined>();
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [areaInput, setAreaInput] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>(
    i18n.language.startsWith('el') ? 'stremmata' : 'hectares'
  );

  const hasPin = fieldHasLocation({ latitude, longitude });
  const estimatedHectares = estimatedHectaresFromInput(areaInput, areaUnit);
  const areaValid = estimatedHectares != null;

  useEffect(() => {
    navigation.setOptions({
      title: step === 'place' ? t('fields:createGrove.placeHeading') : t('fields:createGrove.area.title'),
    });
  }, [navigation, step, t]);

  useEffect(() => {
    fieldService
      .getField(fieldId)
      .then((field) => {
        setFieldStatus(field.status);
        setLocationText(field.locationText || '');
        setLatitude(field.latitude);
        setLongitude(field.longitude);
        if (fieldHasLocation(field) && field.area > 0 && !field.appMeasuredAreaSqm) {
          setStep('area');
          if (i18n.language.startsWith('el')) {
            setAreaUnit('stremmata');
            setAreaInput(String(Math.round(field.area * 10 * 10) / 10));
          } else {
            setAreaUnit('hectares');
            setAreaInput(String(field.area));
          }
        }
      })
      .catch(() => setError(t('fields:form.failedLoad')))
      .finally(() => setLoading(false));
  }, [fieldId, t, i18n.language]);

  useEffect(() => {
    if (!hasPin || !mapRef.current || latitude == null || longitude == null) return;
    mapRef.current.flyTo(latitude, longitude, PLACE_ZOOM);
  }, [hasPin, latitude, longitude]);

  const persistLocation = useCallback(
    async (next: { locationText: string; latitude?: number; longitude?: number }) => {
      setLocationText(next.locationText);
      const ok =
        next.latitude != null &&
        next.longitude != null &&
        Number.isFinite(next.latitude) &&
        Number.isFinite(next.longitude);
      if (ok) {
        setLatitude(next.latitude);
        setLongitude(next.longitude);
      }
      try {
        await fieldService.updateField(fieldId, {
          locationText: next.locationText,
          latitude: ok ? next.latitude : undefined,
          longitude: ok ? next.longitude : undefined,
        });
      } catch {
        /* keep local pin */
      }
    },
    [fieldId]
  );

  const continueToArea = async () => {
    if (!hasPin) {
      setError(t('fields:createGrove.place.pinRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fieldService.updateField(fieldId, {
        locationText,
        latitude,
        longitude,
      });
      activation?.markFieldsDirty({
        groveCreatedFieldId: fieldId,
        locationSavedFieldId: fieldId,
      });
      setStep('area');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const activateFromPin = async (thenBoundary: boolean) => {
    if (!hasPin) {
      setError(t('fields:createGrove.place.pinRequired'));
      return;
    }
    if (!areaValid || estimatedHectares == null) {
      setError(t('fields:createGrove.area.required'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fieldService.updateField(fieldId, {
        locationText,
        latitude,
        longitude,
        area: estimatedHectares,
      });
      if (fieldStatus !== 'Active') {
        await fieldService.activateField(fieldId, {
          boundaryConfirmed: false,
          cadastreReferenceAcknowledged: true,
        });
        setFieldStatus('Active');
      }
      activation?.markFieldsDirty({
        groveCreatedFieldId: fieldId,
        locationSavedFieldId: fieldId,
      });
      if (thenBoundary) {
        navigation.replace('FieldMapBoundary', { fieldId });
        return;
      }
      navigation.replace('FieldDetail', { fieldId, mode: 'weather' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const pinPoints = useMemo(
    () =>
      hasPin && latitude != null && longitude != null
        ? [
            {
              id: 'grove-pin',
              coordinate: { latitude, longitude },
              color: colors.primary,
            },
          ]
        : [],
    [hasPin, latitude, longitude, colors.primary]
  );

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.error + '18' }]}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      {step === 'place' ? (
        <>
          <View style={styles.searchPad}>
            <LocationSearchField
              value={locationText}
              compact
              onChange={(next) => void persistLocation(next)}
              disabled={saving}
            />
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t('fields:createGrove.place.tapHint')}
            </Text>
          </View>
          <AppMapView
            ref={mapRef}
            style={styles.map}
            mapLayer="satellite"
            initialRegion={{
              latitude: latitude ?? GREECE_CENTER.latitude,
              longitude: longitude ?? GREECE_CENTER.longitude,
              latitudeDelta: 3,
              longitudeDelta: 3,
            }}
            onPress={(e) => {
              void persistLocation({
                locationText:
                  locationText.trim() || t('fields:createGrove.placement.pickedOnMap'),
                latitude: e.coordinate.latitude,
                longitude: e.coordinate.longitude,
              });
            }}
          >
            <MapPointLayer sourceId="place-pin" points={pinPoints} radius={8} />
          </AppMapView>
          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <Button
              title={t('fields:createGrove.continueToArea')}
              onPress={() => void continueToArea()}
              loading={saving}
              disabled={!hasPin || saving}
            />
          </View>
        </>
      ) : (
        <View style={styles.areaPad}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('fields:createGrove.area.title')}
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('fields:createGrove.area.subtitle')}
          </Text>
          <View style={styles.areaRow}>
            <TextInput
              style={[
                styles.areaInput,
                { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              keyboardType="decimal-pad"
              value={areaInput}
              onChangeText={setAreaInput}
              placeholder={t('fields:createGrove.area.placeholder')}
              placeholderTextColor={colors.textTertiary}
            />
            <View style={styles.unitToggle}>
              {(['stremmata', 'hectares'] as const).map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => setAreaUnit(unit)}
                  style={[
                    styles.unitChip,
                    {
                      backgroundColor: areaUnit === unit ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: areaUnit === unit ? colors.onOlive : colors.textSecondary,
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                  >
                    {t(`fields:createGrove.area.${unit}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('fields:addField.skipBoundaryConsequence')}
          </Text>
          <Button
            title={t('fields:addField.skipBoundaryConfirm')}
            onPress={() => void activateFromPin(false)}
            loading={saving}
            disabled={!areaValid || saving}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title={t('fields:createGrove.addBoundaryNow')}
            variant="outline"
            onPress={() => void activateFromPin(true)}
            loading={saving}
            disabled={!areaValid || saving}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchPad: { padding: spacing.md, gap: spacing.xs },
  hint: { ...typography.styles.caption, marginTop: 4 },
  map: { flex: 1 },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  errorBox: {
    margin: spacing.md,
    padding: spacing.sm,
    borderRadius: 8,
  },
  areaPad: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4,
  },
  areaRow: { gap: spacing.sm, marginVertical: spacing.md },
  areaInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 18,
  },
  unitToggle: { flexDirection: 'row', gap: spacing.sm },
  unitChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
});

export default FieldPlaceScreen;
