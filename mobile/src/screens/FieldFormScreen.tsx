import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { getFieldService } from '../services/serviceFactory';
import { useTheme } from '../context/ThemeContext';
import FormField from '../components/forms/FormField';
import FormSelect from '../components/forms/FormSelect';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ScreenLayout from '../components/layout/ScreenLayout';
import FieldColorPicker from '../components/fields/FieldColorPicker';
import LocationSearchField from '../components/fields/LocationSearchField';
import { CreateFieldDto, Field } from '../services/fieldService';
import { resolveFieldColor } from '../utils/fieldColors';
import { VARIETY_OPTIONS, toSelectOptions } from '../constants/fieldFormOptions';
import { typography, spacing } from '../theme';
import { fieldHasBoundary, isListedGrove } from '../utils/fieldDisplay';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'FieldForm'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldForm'>;

type CreateScreen = 'name' | 'location-choose' | 'location-place' | 'draft-saved' | 'ready';

const emptyForm = (): CreateFieldDto => ({
  name: '',
  cropType: 'Olive',
  locationText: '',
  area: 0,
  variety: '',
  irrigationStatus: false,
  status: 'Draft',
  color: resolveFieldColor(undefined, undefined),
});

const FieldFormScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { fieldId, focus } = route.params || {};
  const editFocus = focus === 'details' ? 'details' : 'settings';
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const isEdit = !!fieldId;

  const [createScreen, setCreateScreen] = useState<CreateScreen>('name');
  const [formData, setFormData] = useState<CreateFieldDto>(emptyForm);
  const [draftFieldId, setDraftFieldId] = useState<string | undefined>(fieldId);
  const [loadedField, setLoadedField] = useState<Field | null>(null);
  const [isFirstGrove, setIsFirstGrove] = useState(true);
  const [locationSkipped, setLocationSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const isActiveEdit = isEdit && loadedField?.status === 'Active';
  const nameValid = formData.name.trim().length >= 2;
  const hasLocation = Boolean(
    (formData.locationText && formData.locationText.trim()) ||
      (formData.latitude != null && formData.longitude != null)
  );
  const hasDetails = Boolean(formData.variety?.trim()) || formData.treeCount != null;
  const hasBoundary = fieldHasBoundary(loadedField || { boundary: undefined });

  useEffect(() => {
    if (!fieldId) {
      getFieldService()
        .getFields()
        .then((fields) => setIsFirstGrove(fields.filter(isListedGrove).length === 0))
        .catch(() => setIsFirstGrove(true));
      return;
    }
    getFieldService()
      .getField(fieldId)
      .then((f) => {
        setLoadedField(f);
        setFormData({
          name: f.name,
          cropType: f.cropType || 'Olive',
          locationText: f.locationText || '',
          latitude: f.latitude,
          longitude: f.longitude,
          area: f.appMeasuredAreaSqm ?? f.area,
          variety: f.oliveVariety || f.variety || '',
          treeCount: f.treeCount,
          treeAge: f.treeAge,
          groundType: f.soilType || f.groundType || '',
          soilType: f.soilType,
          irrigationStatus: f.irrigationStatus,
          irrigationType: f.irrigationType,
          slope: f.slope,
          accessNotes: f.accessNotes,
          status: f.status,
          color: resolveFieldColor(f.color, f.id),
        });
        setDraftFieldId(f.id);
        setCreateScreen('name');
      })
      .catch(() => setError(t('fields:form.failedLoad')))
      .finally(() => setLoading(false));
  }, [fieldId, t]);

  const patchForm = (patch: Partial<CreateFieldDto>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const ensureDraftField = async (): Promise<string> => {
    if (draftFieldId) return draftFieldId;
    const color = resolveFieldColor(formData.color, undefined);
    const created = await getFieldService().createField({
      ...formData,
      name: formData.name.trim(),
      color,
      area: formData.area || 0,
      status: 'Draft',
    });
    setDraftFieldId(created.id);
    patchForm({ color: created.color || color });
    return created.id;
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ paddingHorizontal: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 17 }}>{t('common:cancel')}</Text>
        </Pressable>
      ),
    });
  }, [navigation, colors.primary, t]);

  const handleCreateGrove = async () => {
    if (!nameValid) {
      setError(t('fields:form.errors.nameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await ensureDraftField();
      await getFieldService().updateField(id, {
        name: formData.name.trim(),
        cropType: formData.cropType || 'Olive',
        locationText: formData.locationText,
        latitude: formData.latitude,
        longitude: formData.longitude,
        variety: formData.variety,
        treeCount: formData.treeCount,
        color: formData.color || resolveFieldColor(undefined, id),
      });
      await getFieldService().activateField(id, {
        boundaryConfirmed: true,
        cadastreReferenceAcknowledged: true,
      });
      patchForm({ status: 'Active' });
      setLoadedField((prev) => (prev ? { ...prev, status: 'Active', id } : prev));
      setCreateScreen('ready');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleContinueLater = async () => {
    if (!nameValid) {
      setError(t('fields:form.errors.nameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await ensureDraftField();
      setCreateScreen('draft-saved');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!nameValid || !draftFieldId) {
      setError(t('fields:form.errors.nameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await getFieldService().updateField(draftFieldId, {
        name: formData.name.trim(),
        cropType: formData.cropType,
        locationText: formData.locationText,
        latitude: formData.latitude,
        longitude: formData.longitude,
        variety: formData.variety,
        treeCount: formData.treeCount,
        color: formData.color,
      });
      navigation.replace('FieldDetail', { fieldId: draftFieldId });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetailsOnly = async () => {
    if (!draftFieldId) return;
    setSaving(true);
    setError(null);
    try {
      await getFieldService().updateField(draftFieldId, {
        variety: formData.variety,
        treeCount: formData.treeCount,
      });
      navigation.replace('FieldDetail', { fieldId: draftFieldId });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const useMyLocation = useCallback(async () => {
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(t('fields:createGrove.placement.geoDenied'));
        setCreateScreen('location-place');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      patchForm({
        locationText: formData.locationText || t('fields:createGrove.placement.nearMe'),
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setLocationSkipped(false);
      setCreateScreen('location-place');
    } catch {
      setError(t('fields:createGrove.placement.geoUnavailable'));
      setCreateScreen('location-place');
    }
  }, [formData.locationText, t]);

  const setupMark = (key: 'name' | 'location' | 'details') => {
    if (key === 'name') {
      if (createScreen === 'name') return 'current';
      return nameValid ? 'done' : 'upcoming';
    }
    if (key === 'location') {
      if (createScreen === 'location-choose' || createScreen === 'location-place') return 'current';
      if (hasLocation) return 'done';
      if (locationSkipped || createScreen === 'ready' || createScreen === 'draft-saved') return 'skipped';
      return 'upcoming';
    }
    if (hasDetails) return 'done';
    if (createScreen === 'ready' || createScreen === 'draft-saved') return 'skipped';
    return 'upcoming';
  };

  const detailsRow = (
    <View style={styles.detailsRow}>
      <View style={styles.detailsCol}>
        <FormSelect
          label={t('fields:addField.oliveVariety')}
          helperText={t('fields:createGrove.details.varietyHint')}
          value={formData.variety || ''}
          options={toSelectOptions(VARIETY_OPTIONS)}
          placeholder={t('fields:addField.selectOption')}
          onValueChange={(variety) => patchForm({ variety })}
          disabled={saving}
          containerStyle={styles.detailsField}
        />
      </View>
      <View style={styles.detailsCol}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
          {t('fields:createGrove.details.treeCountLabel')}
        </Text>
        <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
          {t('fields:createGrove.details.treeCountHint')}
        </Text>
        <FormField
          value={formData.treeCount != null ? String(formData.treeCount) : ''}
          onChangeText={(v) => patchForm({ treeCount: v ? parseInt(v, 10) : undefined })}
          keyboardType="number-pad"
          editable={!saving}
          containerStyle={styles.detailsField}
        />
      </View>
    </View>
  );

  if (loading) return <LoadingSpinner fullScreen />;

  const title = isActiveEdit
    ? t('fields:editField')
    : isFirstGrove
      ? t('fields:createGrove.firstTitle')
      : t('fields:createGrove.title');

  return (
    <ScreenLayout scroll contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {!isActiveEdit && createScreen !== 'ready' && createScreen !== 'draft-saved' ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('fields:createGrove.subtitle')}
        </Text>
      ) : null}

      {!isActiveEdit && createScreen !== 'ready' && createScreen !== 'draft-saved' ? (
        <View style={styles.setupRow} accessibilityLabel={t('fields:createGrove.setupLevelAria')}>
          {(['name', 'location', 'details'] as const).map((key, idx) => {
            const state = setupMark(key);
            return (
              <View key={key} style={styles.setupItem}>
                {idx > 0 ? <Text style={{ color: colors.borderLight }}> · </Text> : null}
                <Text
                  style={{
                    color:
                      state === 'done' || state === 'current' ? colors.primary : colors.textSecondary,
                    fontWeight: state === 'current' ? '700' : '500',
                    fontSize: 13,
                  }}
                >
                  {state === 'done' ? '✓ ' : state === 'skipped' ? '— ' : `${idx + 1}. `}
                  {t(`fields:createGrove.levels.${key}`)}
                  {state === 'skipped' ? ` (${t('fields:createGrove.later')})` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.error + '18' }]}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      {/* Create: name */}
      {!isActiveEdit && createScreen === 'name' ? (
        <Card variant="outlined" style={styles.panel}>
          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
            {t('fields:createGrove.nameHeading')}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.nameHelper')}
          </Text>
          <FormField
            label={`${t('fields:createGrove.nameLabel')} *`}
            value={formData.name}
            onChangeText={(name) => patchForm({ name })}
            editable={!saving}
            placeholder={t('fields:form.namePlaceholder', {
              defaultValue: t('fields:createGrove.nameLabel'),
            })}
          />
          {nameValid ? (
            <Text style={[styles.nudge, { color: colors.textSecondary }]}>
              {t('fields:createGrove.readyNudge')}
            </Text>
          ) : null}
          <Button
            title={t('fields:createGrove.createCta')}
            onPress={handleCreateGrove}
            loading={saving}
            disabled={!nameValid}
            fullWidth
            style={styles.cta}
          />
          <Button
            title={t('fields:createGrove.continueLater')}
            variant="outline"
            onPress={handleContinueLater}
            loading={saving}
            disabled={!nameValid}
            fullWidth
            style={styles.cta}
          />
          <Pressable
            onPress={() => {
              setError(null);
              setCreateScreen('location-choose');
            }}
            style={styles.textLink}
          >
            <Text style={{ color: colors.primary, fontWeight: '600', textAlign: 'center' }}>
              {t('fields:createGrove.addLocationFirst')}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {/* Create: location chooser */}
      {!isActiveEdit && createScreen === 'location-choose' ? (
        <Card variant="outlined" style={styles.panel}>
          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
            {t('fields:createGrove.placement.title')}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.placement.subtitle')}
          </Text>
          <Button
            title={t('fields:createGrove.placement.searchTitle')}
            onPress={() => {
              setLocationSkipped(false);
              setCreateScreen('location-place');
            }}
            fullWidth
            style={styles.cta}
          />
          <Button
            title={t('fields:createGrove.placement.myLocationTitle')}
            variant="outline"
            onPress={useMyLocation}
            fullWidth
            style={styles.cta}
          />
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.placement.myLocationDesc')}
          </Text>
          <Button
            title={t('fields:createGrove.placement.laterTitle')}
            variant="ghost"
            onPress={() => {
              setLocationSkipped(true);
              setCreateScreen('name');
            }}
            fullWidth
          />
          <Button
            title={t('fields:form.back')}
            variant="outline"
            onPress={() => setCreateScreen('name')}
            fullWidth
            style={styles.cta}
          />
        </Card>
      ) : null}

      {/* Create: place search */}
      {!isActiveEdit && createScreen === 'location-place' ? (
        <Card variant="outlined" style={styles.panel}>
          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
            {t('fields:createGrove.place.title')}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.place.subtitle')}
          </Text>
          <LocationSearchField
            value={formData.locationText || ''}
            disabled={saving}
            onChange={(next) => {
              setLocationSkipped(false);
              patchForm({
                locationText: next.locationText,
                latitude: next.latitude,
                longitude: next.longitude,
              });
            }}
          />
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.place.canWait')}
          </Text>
          <Button
            title={t('fields:createGrove.place.confirm')}
            onPress={async () => {
              if (draftFieldId && formData.status === 'Active') {
                try {
                  setSaving(true);
                  await getFieldService().updateField(draftFieldId, {
                    locationText: formData.locationText,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                  });
                  setCreateScreen('ready');
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
                } finally {
                  setSaving(false);
                }
                return;
              }
              setCreateScreen('name');
            }}
            loading={saving}
            fullWidth
            style={styles.cta}
          />
          <Button
            title={t('fields:createGrove.placement.laterTitle')}
            variant="outline"
            onPress={() => {
              setLocationSkipped(true);
              setCreateScreen('name');
            }}
            fullWidth
          />
        </Card>
      ) : null}

      {/* Draft saved */}
      {!isActiveEdit && createScreen === 'draft-saved' ? (
        <Card variant="outlined" style={styles.panel}>
          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
            {t('fields:createGrove.draftSavedTitle')}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.draftSavedBody')}
          </Text>
          <Button
            title={t('fields:createGrove.backToGroves')}
            onPress={() => navigation.navigate('Main', { screen: 'Fields' })}
            fullWidth
            style={styles.cta}
          />
          <Button
            title={t('fields:createGrove.continueSetup')}
            variant="outline"
            onPress={() => setCreateScreen('name')}
            fullWidth
          />
        </Card>
      ) : null}

      {/* Ready — mirrors web GroveReadyPanel */}
      {!isActiveEdit && createScreen === 'ready' && draftFieldId ? (
        <Card variant="outlined" style={styles.panel}>
          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
            {t('fields:createGrove.ready.title', { name: formData.name.trim() })}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.ready.body')}
          </Text>
          <View style={styles.readySplit}>
            <View style={[styles.readyCol, { borderColor: colors.borderLight }]}>
              <Text style={[styles.readyHead, { color: colors.textSecondary }]}>
                {t('fields:createGrove.ready.readyHeading')}
              </Text>
              <Text style={{ color: colors.textPrimary }}>✓ {t('fields:createGrove.ready.readyName')}</Text>
              <Text style={{ color: colors.textPrimary }}>
                ✓ {t('fields:createGrove.ready.readyTimeline')}
              </Text>
              <Text style={{ color: colors.textPrimary }}>✓ {t('fields:createGrove.ready.readyWork')}</Text>
            </View>
            <View style={[styles.readyCol, { borderColor: colors.borderLight }]}>
              <Text style={[styles.readyHead, { color: colors.textSecondary }]}>
                {t('fields:createGrove.ready.waitHeading')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {hasBoundary ? '✓' : '○'} {t('fields:createGrove.ready.waitBoundary')}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {hasDetails ? '✓' : '○'} {t('fields:createGrove.ready.waitDetails')}
              </Text>
            </View>
          </View>
          <Button
            title={t('fields:createGrove.ready.recordWork')}
            onPress={() => navigation.replace('CreateTask', { fieldId: draftFieldId })}
            fullWidth
            style={styles.cta}
          />
          {!hasBoundary ? (
            <Button
              title={t('fields:createGrove.enrich.boundaryAction')}
              variant="outline"
              onPress={() => navigation.replace('FieldMapBoundary', { fieldId: draftFieldId })}
              fullWidth
              style={styles.cta}
            />
          ) : null}
          <Button
            title={t('fields:createGrove.ready.openChronologio')}
            variant="outline"
            onPress={() =>
              navigation.replace('FieldDetail', { fieldId: draftFieldId, mode: 'chronologio' })
            }
            fullWidth
            style={styles.cta}
          />
          <Button
            title={t('fields:createGrove.ready.openGrove')}
            variant="ghost"
            onPress={() => navigation.replace('FieldDetail', { fieldId: draftFieldId })}
            fullWidth
          />
        </Card>
      ) : null}

      {/* Active edit: details only */}
      {isActiveEdit && editFocus === 'details' ? (
        <Card variant="outlined" style={styles.panel}>
          <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
            {t('fields:createGrove.levels.details')}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.details.subtitle')}
          </Text>
          {detailsRow}
          <Button
            title={t('fields:saveChanges')}
            onPress={handleSaveDetailsOnly}
            loading={saving}
            fullWidth
            style={styles.cta}
          />
          <Button
            title={t('common:cancel')}
            variant="outline"
            onPress={() => navigation.goBack()}
            fullWidth
            style={styles.cta}
          />
        </Card>
      ) : null}

      {/* Active edit: full settings */}
      {isActiveEdit && editFocus === 'settings' ? (
        <Card variant="outlined" style={styles.panel}>
          <FormField
            label={`${t('fields:createGrove.nameLabel')} *`}
            value={formData.name}
            onChangeText={(name) => patchForm({ name })}
            editable={!saving}
          />
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.details.subtitle')}
          </Text>
          {detailsRow}
          <Text style={[styles.stepTitle, { color: colors.textPrimary, marginTop: spacing.md }]}>
            {t('fields:createGrove.appearance.title')}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {t('fields:createGrove.appearance.autoHint')}
          </Text>
          <FieldColorPicker
            value={formData.color}
            fieldId={draftFieldId || fieldId}
            onChange={(color) => patchForm({ color })}
            disabled={saving}
          />
          <Button
            title={t('fields:saveChanges')}
            onPress={handleSaveEdit}
            loading={saving}
            fullWidth
            style={styles.cta}
          />
        </Card>
      ) : null}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  title: { ...typography.styles.h3, fontWeight: '700' },
  subtitle: { ...typography.styles.bodySmall, marginTop: 4, marginBottom: spacing.sm },
  setupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  setupItem: { flexDirection: 'row', alignItems: 'center' },
  panel: { padding: spacing.base, marginBottom: spacing.md },
  stepTitle: { ...typography.styles.h4, fontWeight: '700', marginBottom: 2 },
  stepDesc: { ...typography.styles.bodySmall, marginBottom: spacing.sm },
  nudge: { ...typography.styles.bodySmall, marginBottom: spacing.md },
  cta: { marginTop: spacing.sm },
  textLink: { paddingVertical: spacing.md },
  errorBox: {
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  readySplit: { gap: spacing.sm, marginBottom: spacing.md },
  readyCol: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 4,
  },
  readyHead: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  detailsCol: {
    flex: 1,
    minWidth: 0,
  },
  detailsField: {
    marginBottom: 0,
  },
  fieldLabel: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  fieldHint: {
    ...typography.styles.caption,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
});

export default FieldFormScreen;
