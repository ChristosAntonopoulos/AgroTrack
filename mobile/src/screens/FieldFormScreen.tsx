import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { getFieldService } from '../services/serviceFactory';
import { useTheme } from '../context/ThemeContext';
import FormField from '../components/forms/FormField';
import FormSelect from '../components/forms/FormSelect';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import InfoRow from '../components/ui/InfoRow';
import LoadingSpinner from '../components/LoadingSpinner';
import AddFieldMethodStep, { AddFieldMethod } from '../components/fields/AddFieldMethodStep';
import WizardStepIndicator, { WizardStepKey } from '../components/fields/WizardStepIndicator';
import FieldBoundaryDrawMap, { BoundaryPoint } from '../components/fields/FieldBoundaryDrawMap';
import { CreateFieldDto, GeoJsonPolygon } from '../services/fieldService';
import { geoJsonToPoints, pointsToGeoJsonPolygon } from '../utils/polygonArea';
import {
  CROP_TYPE_OPTIONS,
  VARIETY_OPTIONS,
  IRRIGATION_OPTIONS,
  SOIL_OPTIONS,
  SLOPE_OPTIONS,
  toSelectOptions,
} from '../constants/fieldFormOptions';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'FieldForm'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldForm'>;

type WizardStep = WizardStepKey | 'basics-edit';

const NEW_DRAW_STEPS: WizardStepKey[] = ['method', 'basics', 'boundary', 'crop', 'review'];
const EDIT_STEPS: WizardStepKey[] = ['basics', 'boundary', 'crop', 'review'];

const emptyForm = (): CreateFieldDto => ({
  name: '',
  cropType: 'Olive',
  locationText: '',
  area: 0,
  variety: '',
  irrigationStatus: false,
  status: 'Draft',
});

const FieldFormScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { fieldId } = route.params || {};
  const { colors } = useTheme();
  const { t } = useTranslation(['fields', 'common']);
  const isEdit = !!fieldId;

  const [step, setStep] = useState<WizardStep>(isEdit ? 'basics' : 'method');
  const [method, setMethod] = useState<AddFieldMethod | null>(isEdit ? 'draw' : null);
  const [formData, setFormData] = useState<CreateFieldDto>(emptyForm);
  const [boundaryPoints, setBoundaryPoints] = useState<BoundaryPoint[]>([]);
  const [measuredAreaSqm, setMeasuredAreaSqm] = useState(0);
  const [boundaryConfirmed, setBoundaryConfirmed] = useState(false);
  const [draftFieldId, setDraftFieldId] = useState<string | undefined>(fieldId);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);

  const activeSteps = useMemo(
    () => (isEdit ? EDIT_STEPS : NEW_DRAW_STEPS),
    [isEdit]
  );

  const stepIndex = useMemo(() => {
    const key = step === 'basics-edit' ? 'basics' : step;
    return activeSteps.indexOf(key as WizardStepKey);
  }, [step, activeSteps]);

  const isFirst = stepIndex <= 0;
  const isLast = stepIndex === activeSteps.length - 1;
  const currentStepKey = (step === 'basics-edit' ? 'basics' : step) as WizardStepKey;

  useEffect(() => {
    if (!fieldId) return;
    getFieldService()
      .getField(fieldId)
      .then((f) => {
        setFormData({
          name: f.name,
          cropType: f.cropType || 'Olive',
          locationText: f.locationText || '',
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
        });
        setDraftFieldId(f.id);
        if (f.boundary) {
          setBoundaryPoints(geoJsonToPoints(f.boundary));
        }
        if (f.appMeasuredAreaSqm) setMeasuredAreaSqm(f.appMeasuredAreaSqm);
        setStep('basics');
      })
      .catch(() => setError(t('fields:form.failedLoad')))
      .finally(() => setLoading(false));
  }, [fieldId, t]);

  const patchForm = (patch: Partial<CreateFieldDto>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const ensureDraftField = async (): Promise<string> => {
    if (draftFieldId) return draftFieldId;
    const created = await getFieldService().createField({
      ...formData,
      name: formData.name.trim(),
      area: formData.area || 0,
      status: 'Draft',
    });
    setDraftFieldId(created.id);
    return created.id;
  };

  const validateStep = (): string | null => {
    if (step === 'method' && !method) return t('fields:addField.errors.methodRequired');
    if (step === 'basics' || step === 'basics-edit') {
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        return t('fields:form.errors.nameRequired');
      }
    }
    if (step === 'boundary') {
      if (boundaryPoints.length < 3) return t('fields:addFieldWizard.errors.boundaryRequired');
    }
    if (step === 'review') {
      if (!boundaryConfirmed) return t('fields:addField.errors.confirmBoundary');
    }
    return null;
  };

  const persistBoundary = async (fieldIdToUse: string) => {
    const boundary = pointsToGeoJsonPolygon(boundaryPoints);
    if (!boundary) return;
    await getFieldService().updateBoundary(fieldIdToUse, boundary as GeoJsonPolygon);
    patchForm({ area: measuredAreaSqm });
  };

  const goNext = async () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    try {
      setSaving(true);
      if (step === 'basics') {
        await ensureDraftField();
      }
      if (step === 'boundary' && draftFieldId) {
        await persistBoundary(draftFieldId);
      }
      if (!isLast) {
        setStep(activeSteps[stepIndex + 1] as WizardStep);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (!isFirst) setStep(activeSteps[stepIndex - 1] as WizardStep);
    else navigation.goBack();
  };

  const handleActivate = async () => {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = draftFieldId || (await ensureDraftField());
      await getFieldService().updateField(id, {
        name: formData.name.trim(),
        cropType: formData.cropType,
        locationText: formData.locationText,
        variety: formData.variety,
        treeCount: formData.treeCount,
        treeAge: formData.treeAge,
        groundType: formData.soilType || formData.groundType,
        soilType: formData.soilType,
        irrigationType: formData.irrigationType,
        irrigationStatus:
          formData.irrigationStatus ||
          Boolean(formData.irrigationType && formData.irrigationType !== 'Rainfed'),
        slope: formData.slope,
        accessNotes: formData.accessNotes,
        area: measuredAreaSqm || formData.area,
      });
      await persistBoundary(id);
      const result = await getFieldService().activateField(id, {
        boundaryConfirmed,
        cadastreReferenceAcknowledged: true,
      });
      navigation.replace('FieldDetail', { fieldId: result.field.id });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const id = await ensureDraftField();
      await getFieldService().updateField(id, {
        ...formData,
        name: formData.name.trim(),
        area: measuredAreaSqm || formData.area,
      });
      if (boundaryPoints.length >= 3) await persistBoundary(id);
      Alert.alert(t('fields:saved'));
      navigation.replace('FieldDetail', { fieldId: id });
    } catch (e: unknown) {
      Alert.alert(t('common:save'), e instanceof Error ? e.message : t('fields:form.failedSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!fieldId) return;
    Alert.alert(t('fields:deleteField'), t('fields:deleteConfirm'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('common:delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await getFieldService().deleteField(fieldId);
            navigation.navigate('Main', { screen: 'Fields' });
          } catch (e: unknown) {
            Alert.alert(
              t('fields:deleteField'),
              e instanceof Error ? e.message : t('fields:form.failedDelete')
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      scrollEnabled={parentScrollEnabled}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {isEdit ? t('fields:editField') : t('fields:addField.title')}
      </Text>
      {!isEdit ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('fields:addField.subtitle')}
        </Text>
      ) : null}

      <WizardStepIndicator
        steps={activeSteps}
        current={currentStepKey}
        currentIndex={stepIndex}
      />

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.error + '18' }]}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      <Card variant="outlined" style={styles.panel}>
        {step === 'method' ? (
          <AddFieldMethodStep
            method={method}
            onSelect={(m) => {
              setMethod(m);
              setError(null);
            }}
          />
        ) : null}

        {(step === 'basics' || step === 'basics-edit') ? (
          <View style={styles.stepBody}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {t('fields:addField.steps.basics')}
            </Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              {t('fields:addField.basicsDesc')}
            </Text>
            <FormField
              label={`${t('fields:fieldName')} *`}
              value={formData.name}
              onChangeText={(name) => patchForm({ name })}
              editable={!saving}
            />
            <FormSelect
              label={t('fields:addField.cropType')}
              value={formData.cropType || 'Olive'}
              options={toSelectOptions(CROP_TYPE_OPTIONS)}
              onValueChange={(cropType) => patchForm({ cropType })}
              disabled={saving}
            />
            <FormField
              label={t('fields:addField.locationText')}
              value={formData.locationText || ''}
              onChangeText={(locationText) => patchForm({ locationText })}
              placeholder={t('fields:addField.locationPlaceholder')}
              editable={!saving}
            />
          </View>
        ) : null}

        {step === 'boundary' ? (
          <View style={styles.stepBody}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {t('fields:addField.steps.boundary')}
            </Text>
            <FieldBoundaryDrawMap
              points={boundaryPoints}
              onPointsChange={setBoundaryPoints}
              onMeasuredAreaChange={setMeasuredAreaSqm}
              onGestureActiveChange={(active) => setParentScrollEnabled(!active)}
            />
          </View>
        ) : null}

        {step === 'crop' ? (
          <View style={styles.stepBody}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {t('fields:addField.steps.crop')}
            </Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              {t('fields:addField.cropDesc')}
            </Text>
            <FormSelect
              label={t('fields:addField.oliveVariety')}
              value={formData.variety || ''}
              options={toSelectOptions(VARIETY_OPTIONS)}
              placeholder={t('fields:addField.selectOption')}
              onValueChange={(variety) => patchForm({ variety })}
              disabled={saving}
            />
            <FormField
              label={t('fields:addField.treeCount')}
              value={formData.treeCount != null ? String(formData.treeCount) : ''}
              onChangeText={(v) => patchForm({ treeCount: v ? parseInt(v, 10) : undefined })}
              keyboardType="number-pad"
              editable={!saving}
            />
            <FormField
              label={t('fields:treeAge')}
              value={formData.treeAge != null ? String(formData.treeAge) : ''}
              onChangeText={(v) => patchForm({ treeAge: v ? parseInt(v, 10) : undefined })}
              keyboardType="number-pad"
              editable={!saving}
            />
            <FormSelect
              label={t('fields:addField.irrigationType')}
              value={formData.irrigationType || ''}
              options={toSelectOptions(IRRIGATION_OPTIONS)}
              placeholder={t('fields:addField.selectOption')}
              onValueChange={(irrigationType) =>
                patchForm({
                  irrigationType,
                  irrigationStatus: Boolean(irrigationType && irrigationType !== 'Rainfed'),
                })
              }
              disabled={saving}
            />
            <FormSelect
              label={t('fields:addField.soilType')}
              value={formData.soilType || ''}
              options={toSelectOptions(SOIL_OPTIONS)}
              placeholder={t('fields:addField.selectOption')}
              onValueChange={(soilType) => patchForm({ soilType, groundType: soilType })}
              disabled={saving}
            />
            <FormSelect
              label={t('fields:addField.slope')}
              value={formData.slope || ''}
              options={toSelectOptions(SLOPE_OPTIONS)}
              placeholder={t('fields:addField.selectOption')}
              onValueChange={(slope) => patchForm({ slope })}
              disabled={saving}
            />
            <FormField
              label={t('fields:addField.accessNotes')}
              value={formData.accessNotes || ''}
              onChangeText={(accessNotes) => patchForm({ accessNotes })}
              multiline
              editable={!saving}
            />
          </View>
        ) : null}

        {step === 'review' ? (
          <View style={styles.stepBody}>
            <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
              {t('fields:addField.steps.review')}
            </Text>
            <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
              {t('fields:addField.reviewDesc')}
            </Text>
            <InfoRow icon="leaf-outline" label={t('fields:fieldName')} value={formData.name} />
            <InfoRow
              icon="resize-outline"
              label={t('fields:addField.measuredArea')}
              value={measuredAreaSqm > 0 ? `${measuredAreaSqm} m²` : t('fields:addField.notDrawn')}
            />
            {formData.locationText ? (
              <InfoRow
                icon="location-outline"
                label={t('fields:addField.locationText')}
                value={formData.locationText}
              />
            ) : null}
            {formData.variety ? (
              <InfoRow
                icon="nutrition-outline"
                label={t('fields:addField.oliveVariety')}
                value={formData.variety}
              />
            ) : null}
            <View style={[styles.confirmRow, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.confirmLabel, { color: colors.textPrimary }]}>
                {t('fields:addField.confirmBoundary')}
              </Text>
              <Switch
                value={boundaryConfirmed}
                onValueChange={setBoundaryConfirmed}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.navRow}>
          <Button
            title={isFirst ? t('common:back') : t('fields:form.back')}
            variant="outline"
            onPress={goBack}
            disabled={saving}
            style={styles.navBtn}
          />
          {!isLast ? (
            <Button
              title={t('fields:form.next')}
              onPress={goNext}
              loading={saving}
              style={styles.navBtn}
            />
          ) : (
            <Button
              title={t('fields:addField.activate')}
              onPress={handleActivate}
              loading={saving}
              style={styles.navBtn}
            />
          )}
        </View>
      </Card>

      {!isLast && step !== 'method' ? (
        <Button
          title={t('fields:addField.saveDraft')}
          variant="ghost"
          onPress={handleSaveDraft}
          loading={saving}
          fullWidth
          style={styles.draftBtn}
        />
      ) : null}

      {isEdit && fieldId ? (
        <Pressable
          onPress={handleDelete}
          disabled={saving}
          style={[
            styles.deleteBtn,
            { borderColor: colors.error, opacity: saving ? 0.5 : 1 },
          ]}
        >
          <Text style={[styles.deleteBtnText, { color: colors.error }]}>
            {t('fields:deleteField')}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['3xl'] },
  title: { ...typography.styles.h3, fontWeight: '700' },
  subtitle: { ...typography.styles.bodySmall, marginTop: 4, marginBottom: spacing.sm },
  panel: { padding: spacing.base, marginBottom: spacing.md },
  stepBody: { gap: spacing.xs, marginBottom: spacing.md },
  stepTitle: { ...typography.styles.h4, fontWeight: '700', marginBottom: 2 },
  stepDesc: { ...typography.styles.bodySmall, marginBottom: spacing.sm },
  errorBox: {
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  navBtn: { flex: 1 },
  draftBtn: { marginTop: spacing.xs },
  deleteBtn: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: { ...typography.styles.body, fontWeight: '600' },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  confirmLabel: { ...typography.styles.bodySmall, flex: 1 },
});

export default FieldFormScreen;
