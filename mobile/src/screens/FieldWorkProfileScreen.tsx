import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import Sheet from '../components/ui/Sheet';
import LoadingSpinner from '../components/LoadingSpinner';
import OnboardingChoiceList from '../components/tasks/OnboardingChoiceList';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getFieldService, getFieldWorkService } from '../services/serviceFactory';
import type { Field } from '../services/fieldService';
import type {
  FieldWorkLearningStatus,
  FieldWorkProfile,
  UpdateFieldWorkProfileInput,
} from '../services/fieldWorkService';
import { getApiErrorMessage } from '../services/api';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { resolveFieldGates } from '../utils/fieldGates';
import { RootStackParamList } from '../navigation/types';
import { spacing } from '../theme';
import WorkProfileCopyWizard from '../components/tasks/WorkProfileCopyWizard';

type Route = RouteProp<RootStackParamList, 'FieldWorkProfile'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;
type EditSection =
  | 'purpose'
  | 'irrigation'
  | 'pruning'
  | 'fertilisation'
  | 'groundCover'
  | 'pest'
  | 'harvest';

const PRACTICE_SOURCE = 'user_declared_during_onboarding';

const yesNoAsk = (id: string) =>
  id === 'yes' ? 'enabled' : id === 'no' ? 'disabled' : 'ask_first';

const prefText = (
  t: (key: string, options?: { defaultValue?: string }) => string,
  mode?: string,
  label?: string
) => label || (mode ? t(`tasks:fieldWork.profile.pref.${mode}`, { defaultValue: mode }) : '—');

const FieldWorkProfileScreen = () => {
  const { t } = useTranslation(['tasks', 'fields', 'common']);
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { fieldId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();

  const [field, setField] = useState<Field | null>(null);
  const [profile, setProfile] = useState<FieldWorkProfile | null>(null);
  const [learningStatus, setLearningStatus] = useState<FieldWorkLearningStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [editSection, setEditSection] = useState<EditSection | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fieldData = await getFieldService().getField(fieldId);
      const workProfile = await getFieldWorkService().getWorkProfile(fieldId);
      if (!workProfile || workProfile.status === 'draft') {
        navigation.replace('FieldWorkSetup', { fieldId, edit: workProfile?.status === 'draft' });
        return;
      }
      setField(fieldData);
      setProfile(workProfile);
      try {
        setLearningStatus(await getFieldWorkService().getLearningStatus(fieldId));
      } catch {
        setLearningStatus(null);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('tasks:fieldWork.profile.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [fieldId, navigation, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const canEdit = resolveFieldGates({
    field,
    userId: user?.id,
    userRole: user?.role,
  }).canOwn;

  const savePatch = async (patch: UpdateFieldWorkProfileInput) => {
    if (!canEdit) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await getFieldWorkService().updateWorkProfile(fieldId, patch);
      setProfile(updated);
      setEditSection(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('tasks:fieldWork.onboarding.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const markReviewed = async () => {
    if (!canEdit) return;
    try {
      setReviewBusy(true);
      setError(null);
      const updated = await getFieldWorkService().markWorkProfileReviewed(fieldId);
      setProfile(updated);
      setLearningStatus((prev) =>
        prev
          ? { ...prev, annualReviewDue: false, lastReviewedAt: updated.lastReviewedAt }
          : prev
      );
      setReviewDismissed(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t('tasks:fieldWork.profile.learning.applyFailed')));
    } finally {
      setReviewBusy(false);
    }
  };

  if (loading) {
    return (
      <ScreenLayout>
        <LoadingSpinner fullScreen />
      </ScreenLayout>
    );
  }

  if (!field || !profile) {
    return (
      <ScreenLayout padded>
        <EmptyState
          title={error || t('tasks:fieldWork.profile.loadFailed')}
          action={{
            label: t('fields:title'),
            onPress: () => navigation.navigate('Main', { screen: 'Fields' }),
          }}
        />
      </ScreenLayout>
    );
  }

  const rows: Array<{ key: EditSection; title: string; summary: string }> = [
    {
      key: 'purpose',
      title: t('tasks:fieldWork.profile.sections.purpose'),
      summary: prefText(t, profile.productionPurpose, profile.productionPurposeLabel),
    },
    {
      key: 'irrigation',
      title: t('tasks:fieldWork.profile.categories.irrigation'),
      summary: prefText(t, profile.irrigation?.preferenceMode, profile.irrigation?.preferenceModeLabel),
    },
    {
      key: 'pruning',
      title: t('tasks:fieldWork.profile.categories.pruning'),
      summary: prefText(t, profile.pruning?.preferenceMode, profile.pruning?.preferenceModeLabel),
    },
    {
      key: 'fertilisation',
      title: t('tasks:fieldWork.profile.categories.fertilisation'),
      summary: prefText(
        t,
        profile.fertilisation?.preferenceMode,
        profile.fertilisation?.preferenceModeLabel
      ),
    },
    {
      key: 'groundCover',
      title: t('tasks:fieldWork.profile.categories.ground_cover'),
      summary: prefText(t, profile.groundCover?.preferenceMode, profile.groundCover?.preferenceModeLabel),
    },
    {
      key: 'pest',
      title: t('tasks:fieldWork.profile.categories.monitoring'),
      summary: prefText(
        t,
        profile.pestManagement?.preferenceMode,
        profile.pestManagement?.preferenceModeLabel
      ),
    },
    {
      key: 'harvest',
      title: t('tasks:fieldWork.profile.categories.harvest'),
      summary: prefText(t, profile.harvest?.preferenceMode, profile.harvest?.preferenceModeLabel),
    },
  ];

  const showReview = Boolean(canEdit && learningStatus?.annualReviewDue && !reviewDismissed);

  if (showCopy && canEdit) {
    return (
      <ScreenLayout scroll padded contentContainerStyle={styles.content}>
        <WorkProfileCopyWizard
          sourceFieldId={fieldId}
          profile={profile}
          onCancel={() => setShowCopy(false)}
          onDone={() => setShowCopy(false)}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout scroll padded contentContainerStyle={styles.content}>
      <Text style={[styles.fieldName, { color: colors.textSecondary }]}>{friendlyFieldLabel(field.name)}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('tasks:fieldWork.profile.subtitle')}
      </Text>

      {showReview ? (
        <View style={[styles.banner, { backgroundColor: colors.primaryLight, borderColor: colors.oliveBorder }]}>
          <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
            {t('tasks:fieldWork.profile.learning.reviewTitle')}
          </Text>
          <Text style={[styles.bannerBody, { color: colors.textSecondary }]}>
            {t('tasks:fieldWork.profile.learning.reviewBody')}
          </Text>
          <Button
            title={t('tasks:fieldWork.profile.learning.reviewNow')}
            onPress={() => void markReviewed()}
            disabled={reviewBusy}
            fullWidth
          />
          <Button
            title={t('tasks:fieldWork.profile.learning.reviewLater')}
            variant="outline"
            onPress={() => setReviewDismissed(true)}
            disabled={reviewBusy}
            fullWidth
          />
        </View>
      ) : null}

      {!canEdit ? (
        <Text style={[styles.error, { color: colors.error }]}>
          {t('tasks:fieldWork.onboarding.blocked.permissionBody')}
        </Text>
      ) : null}
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <View style={[styles.list, { backgroundColor: colors.surfaceElevated }]}>
        {rows.map((row, index) => (
          <View
            key={row.key}
            style={[
              styles.row,
              index > 0 ? { borderTopColor: colors.borderLight, borderTopWidth: StyleSheet.hairlineWidth } : null,
            ]}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{row.title}</Text>
              <Text style={[styles.rowSummary, { color: colors.textSecondary }]}>{row.summary}</Text>
            </View>
            {canEdit ? (
              <Pressable onPress={() => setEditSection(row.key)} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {t('tasks:fieldWork.profile.change')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {canEdit ? (
        <>
          <Button
            title={t('tasks:fieldWork.profile.copy.open')}
            fullWidth
            onPress={() => setShowCopy(true)}
          />
          <Button
            title={t('tasks:fieldWork.profile.revisitSetup')}
            variant="outline"
            fullWidth
            onPress={() => navigation.navigate('FieldWorkSetup', { fieldId, edit: true })}
          />
        </>
      ) : null}

      <Sheet
        open={editSection != null}
        onClose={() => setEditSection(null)}
        title={rows.find((row) => row.key === editSection)?.title}
        edge="bottom"
      >
        {editSection === 'purpose' ? (
          <OnboardingChoiceList
            onSelect={(id) => {
              const map: Record<string, string> = {
                oil: 'olive_oil',
                table: 'table_olives',
                both: 'both',
              };
              void savePatch({ productionPurpose: map[id] || id });
            }}
            choices={[
              { id: 'oil', title: t('tasks:fieldWork.onboarding.choices.purpose.oil') },
              { id: 'table', title: t('tasks:fieldWork.onboarding.choices.purpose.table') },
              { id: 'both', title: t('tasks:fieldWork.onboarding.choices.purpose.both') },
            ]}
          />
        ) : null}
        {editSection === 'irrigation' ? (
          <OnboardingChoiceList
            onSelect={(id) =>
              void savePatch({
                irrigation: { preferenceMode: yesNoAsk(id), source: PRACTICE_SOURCE },
              })
            }
            choices={[
              { id: 'yes', title: t('tasks:fieldWork.onboarding.choices.irrigation.yes') },
              { id: 'no', title: t('tasks:fieldWork.onboarding.choices.irrigation.no') },
              { id: 'ask', title: t('tasks:fieldWork.onboarding.choices.irrigation.ask') },
            ]}
          />
        ) : null}
        {editSection === 'pruning' ||
        editSection === 'fertilisation' ||
        editSection === 'groundCover' ||
        editSection === 'harvest' ? (
          <OnboardingChoiceList
            onSelect={(id) => {
              const practice = { preferenceMode: yesNoAsk(id), source: PRACTICE_SOURCE };
              if (editSection === 'pruning') void savePatch({ pruning: practice });
              if (editSection === 'fertilisation') void savePatch({ fertilisation: practice });
              if (editSection === 'groundCover') void savePatch({ groundCover: practice });
              if (editSection === 'harvest') void savePatch({ harvest: practice });
            }}
            choices={[
              { id: 'yes', title: t('tasks:fieldWork.onboarding.choices.yes') },
              { id: 'no', title: t('tasks:fieldWork.onboarding.choices.no') },
              { id: 'ask', title: t('tasks:fieldWork.onboarding.choices.unsure') },
            ]}
          />
        ) : null}
        {editSection === 'pest' ? (
          <OnboardingChoiceList
            onSelect={(id) =>
              void savePatch({
                pestManagement: {
                  preferenceMode: id === 'no_usual_treatments' ? 'disabled' : 'enabled',
                  decisionApproach: id,
                  source: PRACTICE_SOURCE,
                },
              })
            }
            choices={[
              { id: 'official_warnings', title: t('tasks:fieldWork.onboarding.choices.pest.official') },
              { id: 'agronomist', title: t('tasks:fieldWork.onboarding.choices.pest.agronomist') },
              { id: 'trap_and_fruit_checks', title: t('tasks:fieldWork.onboarding.choices.pest.traps') },
              { id: 'combined', title: t('tasks:fieldWork.onboarding.choices.pest.combined') },
              { id: 'no_usual_treatments', title: t('tasks:fieldWork.onboarding.choices.pest.none') },
            ]}
          />
        ) : null}
        {saving ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {t('tasks:fieldWork.onboarding.saving')}
          </Text>
        ) : null}
        <Button title={t('common:cancel')} variant="outline" fullWidth onPress={() => setEditSection(null)} />
      </Sheet>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  fieldName: { fontSize: 14, fontWeight: '600' },
  subtitle: { fontSize: 15, lineHeight: 21 },
  hint: { fontSize: 14, lineHeight: 20 },
  banner: { borderWidth: 1, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  bannerTitle: { fontSize: 16, fontWeight: '700' },
  bannerBody: { fontSize: 14, lineHeight: 20 },
  error: { fontSize: 14, lineHeight: 20 },
  list: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSummary: { fontSize: 14 },
});

export default FieldWorkProfileScreen;
