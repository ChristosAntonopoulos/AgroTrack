import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getFieldService } from '../services/serviceFactory';
import { useTheme } from '../context/ThemeContext';
import FormField from '../components/forms/FormField';
import FormSelect from '../components/forms/FormSelect';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import ScreenLayout from '../components/layout/ScreenLayout';
import FieldColorPicker from '../components/fields/FieldColorPicker';
import { CreateFieldDto, Field } from '../services/fieldService';
import { resolveFieldColor } from '../utils/fieldColors';
import { VARIETY_OPTIONS, toSelectOptions } from '../constants/fieldFormOptions';
import { typography, spacing } from '../theme';
import { fieldHasBoundary, isListedGrove } from '../utils/fieldDisplay';
import { RootStackParamList } from '../navigation/types';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import FocusSpotlight from '../components/onboarding/FocusSpotlight';

type Route = RouteProp<RootStackParamList, 'FieldForm'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldForm'>;

type CreateScreen = 'name' | 'color';

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
  const editFocus =
    focus === 'details' ? 'details' : focus === 'appearance' ? 'appearance' : 'settings';
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common', 'onboarding']);
  const activation = useOwnerActivationOptional();
  const isEdit = !!fieldId;

  const [createScreen, setCreateScreen] = useState<CreateScreen>('name');
  const [formData, setFormData] = useState<CreateFieldDto>(emptyForm);
  const [draftFieldId, setDraftFieldId] = useState<string | undefined>(fieldId);
  const [loadedField, setLoadedField] = useState<Field | null>(null);
  const [isFirstGrove, setIsFirstGrove] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const isActiveEdit = isEdit && loadedField?.status === 'Active';
  const nameValid = formData.name.trim().length >= 2;
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

  const fieldPayload = () => ({
    name: formData.name.trim(),
    cropType: formData.cropType || 'Olive',
    locationText: formData.locationText,
    latitude: formData.latitude,
    longitude: formData.longitude,
    variety: formData.variety,
    treeCount: formData.treeCount,
    color: formData.color || resolveFieldColor(undefined, draftFieldId),
  });

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
      await getFieldService().updateField(id, fieldPayload());
      await getFieldService().activateField(id, {
        boundaryConfirmed: true,
        cadastreReferenceAcknowledged: true,
      });
      patchForm({ status: 'Active' });
      setLoadedField((prev) =>
        prev
          ? { ...prev, status: 'Active', id }
          : ({ id, name: formData.name.trim(), status: 'Active' } as Field)
      );
      activation?.markFieldsDirty();
      // Name + colour done → straight to όρια (no intermediate "ready" stop).
      navigation.replace('FieldMapBoundary', { fieldId: id });
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
      await getFieldService().updateField(draftFieldId, fieldPayload());
      navigation.replace('FieldDetail', { fieldId: draftFieldId });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const setupMark = (key: 'name' | 'color' | 'boundary' | 'details') => {
    if (key === 'name') {
      if (createScreen === 'name') return 'current';
      return nameValid ? 'done' : 'upcoming';
    }
    if (key === 'color') {
      if (createScreen === 'color') return 'current';
      if (nameValid && createScreen !== 'name') return 'done';
      return 'upcoming';
    }
    if (key === 'boundary') {
      return hasBoundary ? 'done' : 'upcoming';
    }
    return hasDetails ? 'done' : 'upcoming';
  };

  const goToColorStep = () => {
    if (!nameValid) {
      setError(t('fields:form.errors.nameRequired'));
      return;
    }
    setError(null);
    if (!formData.color) {
      patchForm({ color: resolveFieldColor(undefined, draftFieldId) });
    }
    setCreateScreen('color');
  };

  const nameBody = (
    <>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        {isActiveEdit ? t('fields:form.editTitle') : t('fields:createGrove.nameHeading')}
      </Text>
      <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
        {isActiveEdit ? t('fields:form.editSubtitle') : t('fields:createGrove.nameHelper')}
      </Text>
      <FormField
        label={isActiveEdit ? `${t('fields:createGrove.nameLabel')} *` : undefined}
        accessibilityLabel={t('fields:createGrove.nameLabel')}
        value={formData.name}
        onChangeText={(name) => patchForm({ name })}
        editable={!saving}
        placeholder={t('fields:form.namePlaceholder', {
          defaultValue: t('fields:createGrove.nameLabel'),
        })}
      />
    </>
  );

  const colorBody = (
    <>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        {t('fields:createGrove.colorHeading')}
      </Text>
      <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
        {t('fields:createGrove.colorHelper')}
      </Text>
      <FieldColorPicker
        value={formData.color}
        fieldId={draftFieldId || fieldId}
        onChange={(color) => patchForm({ color })}
        disabled={saving}
        showLabel={false}
      />
    </>
  );

  const detailsBody = (
    <>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
        {t('fields:createGrove.levels.details')}
      </Text>
      <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
        {t('fields:createGrove.details.subtitle')}
      </Text>
      <View style={styles.detailsRow}>
        <View style={styles.detailsCol}>
          <FormSelect
            label={t('fields:addField.oliveVariety')}
            value={formData.variety || ''}
            options={toSelectOptions(VARIETY_OPTIONS)}
            placeholder={t('fields:addField.selectOption')}
            onValueChange={(variety) => patchForm({ variety })}
            disabled={saving}
            containerStyle={styles.detailsField}
          />
        </View>
        <View style={styles.detailsCol}>
          <FormField
            label={t('fields:createGrove.details.treeCountLabel')}
            value={formData.treeCount != null ? String(formData.treeCount) : ''}
            onChangeText={(v) => patchForm({ treeCount: v ? parseInt(v, 10) : undefined })}
            keyboardType="number-pad"
            editable={!saving}
            containerStyle={styles.detailsField}
          />
        </View>
      </View>
    </>
  );

  useEffect(() => {
    if (!activation) return;
    if (!isActiveEdit && (createScreen === 'name' || createScreen === 'color')) {
      activation.setSpotlightScreen('create');
      return () => activation.setSpotlightScreen(null);
    }
    activation.setSpotlightScreen(null);
    return undefined;
  }, [activation, isActiveEdit, createScreen]);

  if (loading) return <LoadingSpinner fullScreen />;

  const title = isActiveEdit
    ? t('fields:editField')
    : isFirstGrove
      ? t('fields:createGrove.firstTitle')
      : t('fields:createGrove.title');

  const showCreateSpotlight =
    activation?.spotlightStep === 'createGrove' &&
    (createScreen === 'name' || createScreen === 'color') &&
    !isActiveEdit;

  return (
    <ScreenLayout scroll contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {!isActiveEdit ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('fields:createGrove.subtitle')}
        </Text>
      ) : null}

      {showCreateSpotlight ? (
        <FocusSpotlight step="createGrove" createPhase={createScreen} />
      ) : null}

      {!isActiveEdit ? (
        <View style={styles.setupRow} accessibilityLabel={t('fields:createGrove.setupLevelAria')}>
          {(['name', 'color', 'boundary', 'details'] as const).map((key, idx) => {
            const state = setupMark(key);
            const canPress =
              key === 'name' ||
              (key === 'color' && nameValid) ||
              ((key === 'boundary' || key === 'details') &&
                Boolean(draftFieldId && loadedField?.status === 'Active'));
            const onPress = () => {
              if (key === 'name') setCreateScreen('name');
              else if (key === 'color' && nameValid) goToColorStep();
              else if (key === 'boundary' && draftFieldId) {
                navigation.replace('FieldMapBoundary', { fieldId: draftFieldId });
              } else if (key === 'details' && draftFieldId) {
                navigation.replace('FieldForm', { fieldId: draftFieldId, focus: 'details' });
              }
            };
            const label = (
              <Text
                style={{
                  color:
                    state === 'done' || state === 'current' ? colors.primary : colors.textSecondary,
                  fontWeight: state === 'current' ? '700' : '500',
                  fontSize: 13,
                }}
              >
                {state === 'done' ? '✓ ' : `${idx + 1}. `}
                {t(`fields:createGrove.levels.${key}`)}
              </Text>
            );
            return (
              <View key={key} style={styles.setupItem}>
                {idx > 0 ? <Text style={{ color: colors.borderLight }}> · </Text> : null}
                {canPress ? (
                  <Pressable onPress={onPress} hitSlop={6}>
                    {label}
                  </Pressable>
                ) : (
                  label
                )}
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

      {!isActiveEdit && createScreen === 'name' ? (
        <Card variant="outlined" style={styles.panel}>
          {nameBody}
          <Button
            title={t('fields:createGrove.continueToColor')}
            onPress={goToColorStep}
            disabled={!nameValid}
            fullWidth
            style={styles.cta}
          />
        </Card>
      ) : null}

      {!isActiveEdit && createScreen === 'color' ? (
        <Card variant="outlined" style={styles.panel}>
          {colorBody}
          <Text style={[styles.nudge, { color: colors.textSecondary }]}>
            {t('fields:createGrove.readyNudge')}
          </Text>
          <Button
            title={t('fields:createGrove.createCta')}
            onPress={handleCreateGrove}
            loading={saving}
            disabled={!nameValid}
            fullWidth
            style={styles.cta}
          />
          <Button
            title={t('common:back')}
            variant="outline"
            onPress={() => setCreateScreen('name')}
            disabled={saving}
            fullWidth
            style={styles.cta}
          />
        </Card>
      ) : null}

      {isActiveEdit && editFocus === 'settings' ? (
        <Card variant="outlined" style={styles.panel}>
          {nameBody}
          <Button
            title={t('fields:saveChanges')}
            onPress={handleSaveEdit}
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

      {isActiveEdit && editFocus === 'appearance' ? (
        <Card variant="outlined" style={styles.panel}>
          {colorBody}
          <Button
            title={t('fields:saveChanges')}
            onPress={handleSaveEdit}
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

      {isActiveEdit && editFocus === 'details' ? (
        <Card variant="outlined" style={styles.panel}>
          {detailsBody}
          <Button
            title={t('fields:saveChanges')}
            onPress={handleSaveEdit}
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
  nudge: { ...typography.styles.bodySmall, marginBottom: spacing.md, marginTop: spacing.sm },
  cta: { marginTop: spacing.sm },
  errorBox: {
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  detailsCol: {
    flex: 1,
    minWidth: 0,
  },
  detailsField: {
    marginBottom: 0,
  },
});

export default FieldFormScreen;
