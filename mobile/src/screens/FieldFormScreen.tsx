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
import { useAuth } from '../context/AuthContext';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import GuideTarget from '../components/onboarding/GuideTarget';
import { PaywallSource, useSubscription } from '../context/SubscriptionContext';
import {
  isAtProLimit,
  isFieldLimitError,
  mustUpgradeToAddField,
} from '../billing/subscriptionModel';
import { trackBillingEvent } from '../billing/billingAnalytics';

type Route = RouteProp<RootStackParamList, 'FieldForm'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldForm'>;

type CreateScreen = 'name';

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
  const { user } = useAuth();
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
  const { ensureFresh, refresh, showUpgradePaywall } = useSubscription();
  const [createGateReady, setCreateGateReady] = useState(isEdit);

  const isActiveEdit = isEdit && loadedField?.status === 'Active';
  const nameValid = formData.name.trim().length >= 2;
  const hasDetails = Boolean(formData.variety?.trim()) || formData.treeCount != null;
  const hasBoundary = fieldHasBoundary(loadedField || { boundary: undefined });

  useEffect(() => {
    if (!fieldId) {
      if (!user?.id) {
        setIsFirstGrove(true);
        return;
      }
      getFieldService()
        .getFields(user.id, user.role || 'FieldOwner')
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
  }, [fieldId, t, user?.id, user?.role]);

  /** Leave the (modal) form first, then paywall — a Modal can't present over a native modal screen. */
  const leaveForPaywall = (intent: 'add_field' | 'pro_limit', source: PaywallSource) => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Main', { screen: 'Fields' });
    setTimeout(() => showUpgradePaywall({ source, intent }), 350);
  };

  // Create mode is gated before the form is ever shown. A snapshot we can't load (offline)
  // lets the form open — the backend still enforces the limit on save.
  useEffect(() => {
    if (isEdit) return undefined;
    let cancelled = false;
    void ensureFresh().then((snapshot) => {
      if (cancelled) return;
      if (mustUpgradeToAddField(snapshot)) {
        trackBillingEvent('field_limit_reached', { source: 'add_field', plan: 'free' });
        leaveForPaywall('add_field', 'add_field');
        return;
      }
      if (isAtProLimit(snapshot)) {
        trackBillingEvent('field_limit_reached', { source: 'add_field', plan: 'pro' });
        leaveForPaywall('pro_limit', 'add_field');
        return;
      }
      setCreateGateReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  /** Backend said the plan is full (race with another device / stale snapshot): same paywall. */
  const handleSaveError = (e: unknown) => {
    if (isFieldLimitError(e)) {
      trackBillingEvent('field_limit_reached', { source: 'field_limit_error' });
      void refresh();
      leaveForPaywall('add_field', 'field_limit_error');
      return;
    }
    setError(e instanceof Error ? e.message : t('fields:form.failedSave'));
  };

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
      title: '',
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ paddingHorizontal: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 17 }}>{t('common:cancel')}</Text>
        </Pressable>
      ),
    });
  }, [navigation, colors.primary, t]);

  const continueToPlace = async () => {
    if (!nameValid) {
      setError(t('fields:form.errors.nameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await ensureDraftField();
      await getFieldService().updateField(id, fieldPayload());
      activation?.markFieldsDirty({ groveCreatedFieldId: id });
      navigation.replace('FieldMapBoundary', { fieldId: id });
    } catch (e: unknown) {
      handleSaveError(e);
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

  const setupMark = (key: 'name' | 'boundary' | 'details') => {
    if (key === 'name') return 'current';
    if (key === 'boundary') return hasBoundary ? 'done' : 'upcoming';
    return hasDetails ? 'done' : 'upcoming';
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

  const setSpotlightScreen = activation?.setSpotlightScreen;
  const releaseSpotlightScreen = activation?.releaseSpotlightScreen;
  useEffect(() => {
    if (!setSpotlightScreen || !releaseSpotlightScreen) return undefined;
    if (!isActiveEdit && createScreen === 'name') {
      setSpotlightScreen('create');
      // Release only our own claim: navigation.replace unmounts this screen after the boundary
      // screen has mounted, and a blind reset would wipe the boundary coach.
      return () => releaseSpotlightScreen('create');
    }
    releaseSpotlightScreen('create');
    return undefined;
  }, [setSpotlightScreen, releaseSpotlightScreen, isActiveEdit, createScreen]);

  if (
    loading ||
    !createGateReady ||
    (!isActiveEdit && activation != null && !activation.ready)
  ) {
    return <LoadingSpinner fullScreen />;
  }

  const guidedSetup = Boolean(activation?.visible && !isActiveEdit);
  const nameSuggestions = (() => {
    const raw = t('fields:createGrove.nameSuggestions', { returnObjects: true });
    if (!Array.isArray(raw)) return [] as string[];
    return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  })();

  const title = isActiveEdit
    ? t('fields:editField')
    : isFirstGrove
      ? t('fields:createGrove.firstTitle')
      : t('fields:createGrove.title');

  return (
    <ScreenLayout scroll contentContainerStyle={styles.content}>
      {guidedSetup ? null : (
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      )}

      {!isActiveEdit && !guidedSetup ? (
        <View style={styles.rail} accessibilityLabel={t('fields:createGrove.setupLevelAria')}>
          <View style={[styles.railLine, { backgroundColor: colors.border }]} />
          {(['name', 'boundary', 'details'] as const).map((key, idx) => {
            const state = setupMark(key);
            const reached = state === 'current' || state === 'done';
            const canPress =
              key === 'boundary'
                ? Boolean(draftFieldId) && nameValid
                : key === 'details'
                  ? loadedField?.status === 'Active' && Boolean(draftFieldId)
                  : false;
            const onPress = () => {
              if (key === 'boundary' && draftFieldId) void continueToPlace();
              else if (key === 'details' && draftFieldId) {
                navigation.replace('FieldForm', { fieldId: draftFieldId, focus: 'details' });
              }
            };
            const mark = (
              <View style={styles.railStep}>
                <View
                  style={[
                    styles.railDot,
                    {
                      backgroundColor: reached ? colors.primary : colors.background,
                      borderColor: reached ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: reached ? colors.onOlive : colors.textTertiary,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {state === 'done' ? '✓' : idx + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    color: state === 'current' ? colors.textPrimary : colors.textTertiary,
                    fontSize: 12,
                    fontWeight: state === 'current' ? '700' : '500',
                    marginTop: 6,
                  }}
                  numberOfLines={1}
                >
                  {t(`fields:createGrove.levels.${key}`)}
                </Text>
              </View>
            );
            return canPress ? (
              <Pressable key={key} onPress={onPress} style={styles.railStepHit} hitSlop={4}>
                {mark}
              </Pressable>
            ) : (
              <View key={key} style={styles.railStepHit}>
                {mark}
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
        <GuideTarget id="createGrove" style={styles.coachTarget}>
        <View
          style={[
            styles.welcome,
            guidedSetup ? styles.welcomeOpen : styles.welcomeBoxed,
            {
              backgroundColor: guidedSetup ? 'transparent' : colors.surface,
              borderColor: guidedSetup ? 'transparent' : colors.oliveBorder,
            },
          ]}
        >
          {guidedSetup ? null : (
            <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
              {t('fields:createGrove.nameHeading')}
            </Text>
          )}
          <FormField
            accessibilityLabel={t('fields:createGrove.nameLabel')}
            value={formData.name}
            onChangeText={(name) => patchForm({ name })}
            editable={!saving}
            autoFocus
            placeholder={t('fields:form.namePlaceholder', {
              defaultValue: t('fields:createGrove.nameLabel'),
            })}
            containerStyle={styles.welcomeField}
          />
          {nameSuggestions.length > 0 ? (
            <View
              style={styles.chips}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('fields:createGrove.nameSuggestionsLabel')}
            >
              {nameSuggestions.map((suggestion) => {
                const selected = formData.name.trim() === suggestion;
                return (
                  <Pressable
                    key={suggestion}
                    onPress={() => patchForm({ name: suggestion })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[
                      styles.chip,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primaryLight : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? colors.primary : colors.textSecondary,
                        fontWeight: selected ? '700' : '500',
                        fontSize: 14,
                      }}
                    >
                      {suggestion}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <Button
            title={t('fields:createGrove.continueToPlace')}
            onPress={() => void continueToPlace()}
            loading={saving}
            disabled={!nameValid}
            fullWidth
            size="large"
            style={styles.cta}
          />
        </View>
        </GuideTarget>
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
  coachTarget: { alignSelf: 'stretch' },
  title: { ...typography.styles.h3, fontWeight: '700' },
  subtitle: { ...typography.styles.bodySmall, marginTop: 4, marginBottom: spacing.sm },
  rail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  railLine: {
    position: 'absolute',
    left: '16%',
    right: '16%',
    top: 13,
    height: 2,
    borderRadius: 1,
  },
  railStepHit: { flex: 1 },
  railStep: { alignItems: 'center' },
  railDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: { padding: spacing.base, marginBottom: spacing.md },
  welcome: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  welcomeOpen: {
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 4,
  },
  welcomeBoxed: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
  },
  welcomeTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  welcomeField: { marginBottom: 12 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
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
