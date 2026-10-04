import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { fieldService, GeoJsonPolygon } from '../services/fieldService';
import FieldBoundaryStage, { type BoundaryPoint } from '../components/fields/FieldBoundaryStage';
import LoadingSpinner from '../components/LoadingSpinner';
import { fieldHasBoundary } from '../utils/fieldDisplay';
import { polygonCentroid, resolveFieldPolygon } from '../utils/fieldGeo';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import { validateBoundaryPolygon } from '../utils/boundaryValidation';
import {
  isPlaceholderLocationText,
  reverseGeocode,
} from '../utils/geocodeLocation';

type Props = NativeStackScreenProps<RootStackParamList, 'FieldMapBoundary'>;

const FieldMapBoundaryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { fieldId } = route.params;
  const { t, i18n } = useTranslation(['fields', 'common']);
  const activation = useOwnerActivationOptional();
  const [points, setPoints] = useState<BoundaryPoint[]>([]);
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [placeFocus, setPlaceFocus] = useState(0);
  const [fieldStatus, setFieldStatus] = useState<string | undefined>();
  const [hadBoundary, setHadBoundary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false, presentation: 'fullScreenModal' });
  }, [navigation]);

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
    if (points.length < 3) {
      setError(t('addFieldWizard.errors.boundaryRequiredNow'));
      return;
    }
    const ring = [...points, points[0]].map((p) => [p.longitude, p.latitude]);
    const boundary: GeoJsonPolygon = { type: 'Polygon', coordinates: [ring] };
    const check = validateBoundaryPolygon(boundary);
    if (!check.ok) {
      setError(t(`addField.boundaryValidation.${check.code}`));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const centroid = polygonCentroid(points);
      let nextLocationText = locationText.trim();
      let nextLat = latitude;
      let nextLng = longitude;

      if (nextLat == null || nextLng == null || !Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
        nextLat = centroid.latitude;
        nextLng = centroid.longitude;
      }

      const placeholderLabels = [
        t('addField.useCurrentLocation'),
        t('createGrove.placement.nearMe'),
        t('createGrove.placement.pickedOnMap'),
      ];
      if (isPlaceholderLocationText(nextLocationText, placeholderLabels)) {
        const place = await reverseGeocode(nextLat, nextLng, {
          language: i18n.language,
        }).catch(() => null);
        if (place?.label) {
          nextLocationText = place.label;
          setLocationText(place.label);
        }
      }

      if (nextLocationText || (nextLat != null && nextLng != null)) {
        await fieldService.updateField(fieldId, {
          locationText: nextLocationText || undefined,
          latitude: nextLat,
          longitude: nextLng,
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

  const setSpotlightScreen = activation?.setSpotlightScreen;
  const releaseSpotlightScreen = activation?.releaseSpotlightScreen;
  useEffect(() => {
    if (!setSpotlightScreen || !releaseSpotlightScreen) return undefined;
    setSpotlightScreen('boundary');
    return () => releaseSpotlightScreen('boundary');
  }, [setSpotlightScreen, releaseSpotlightScreen]);

  const finishingFirst = !hadBoundary;

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <FieldBoundaryStage
        points={points}
        onPointsChange={setPoints}
        locationText={locationText}
        latitude={latitude}
        longitude={longitude}
        placeFocus={placeFocus}
        onLocationChange={(next) => {
          void persistLocation(next);
        }}
        finishingFirst={finishingFirst}
        saving={saving}
        onContinue={() => void saveBoundary(true)}
        onSaveExisting={() => void saveBoundary(false)}
        onCancel={() => navigation.goBack()}
        error={error}
      />
    </>
  );
};

export default FieldMapBoundaryScreen;
