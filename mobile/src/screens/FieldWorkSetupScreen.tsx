import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useTheme } from '../context/ThemeContext';
import ScreenLayout from '../components/layout/ScreenLayout';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import OnboardingChoiceList from '../components/tasks/OnboardingChoiceList';
import { getFieldService, getFieldWorkService } from '../services/serviceFactory';
import type { Field } from '../services/fieldService';
import type {
  AnalysisKindEntry,
  CurrentYearDeclaredWork,
  FieldWorkProfile,
  UpdateFieldWorkProfileInput,
} from '../services/fieldWorkService';
import { getApiErrorMessage } from '../services/api';
import { athensCalendarYear } from '../utils/athensDate';
import { formatFieldArea } from '../utils/fieldGeo';
import { resolveFieldGates } from '../utils/fieldGates';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { isDeviceOnline, isNetworkError } from '../utils/networkStatus';
import { OfflineQueue } from '../utils/offlineQueue';
import {
  buildStepSequence,
  hasSelectedAnalysisKinds,
  inferResumeStep,
  nextStep,
  normalizeOnboardingStep,
  prevStep,
  primaryIndexForStep,
  PRIMARY_TOTAL,
  resultYearOptions,
  type OnboardingStepId,
} from '../utils/fieldWorkOnboardingSteps';
import {
  clearWorkProfileDraft,
  mergePendingUpdates,
  readWorkProfileDraft,
  writeWorkProfileDraft,
} from '../utils/fieldWorkProfileDraft';
import { RootStackParamList } from '../navigation/types';
import { spacing, typography } from '../theme';

const SOURCE = 'user_declared_during_onboarding';

type Route = RouteProp<RootStackParamList, 'FieldWorkSetup'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'FieldWorkSetup'>;

const FieldWorkSetupScreen = () => {
  const { t, i18n } = useTranslation(['tasks', 'fields', 'common']);
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { fieldId, edit } = route.params;
  const allowActiveEdit = Boolean(edit);
  const { user } = useAuth();
  const { isOnline, syncGeneration } = useOfflineMode();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const allowLeaveRef = useRef(false);

  const [field, setField] = useState<Field | null>(null);
  const [profile, setProfile] = useState<FieldWorkProfile | null>(null);
  const [step, setStep] = useState<OnboardingStepId>('welcome');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<'draft' | 'permission' | 'active' | null>(null);
  const [activating, setActivating] = useState(false);
  const [finishNonce, setFinishNonce] = useState(0);
  const [groundMethods, setGroundMethods] = useState<string[]>([]);
  const [analysisKinds, setAnalysisKinds] = useState<AnalysisKindEntry[]>([]);
  const [fertilisationAnnual, setFertilisationAnnual] = useState(false);

  const canOwn = resolveFieldGates({
    field,
    userId: user?.id,
    userRole: user?.role,
  }).canOwn;
  const resultYear = profile?.resultYearCreated ?? athensCalendarYear(new Date());

  const sequence = useMemo(
    () =>
      buildStepSequence({
        irrigationEnabled: profile?.irrigation?.preferenceMode === 'enabled',
        pruningEnabled: profile?.pruning?.preferenceMode === 'enabled',
        fertilisationEnabled: profile?.fertilisation?.preferenceMode === 'enabled',
        fertilisationAnnual,
        pestMonitoring:
          profile?.pestManagement?.decisionApproach === 'trap_and_fruit_checks' ||
          profile?.pestManagement?.decisionApproach === 'combined',
        analysisKindsSelected:
          hasSelectedAnalysisKinds(analysisKinds) ||
          hasSelectedAnalysisKinds(profile?.analysis?.kinds),
      }),
    [profile, fertilisationAnnual, analysisKinds]
  );

  const progress = primaryIndexForStep(step);

  const goToField = useCallback(() => {
    allowLeaveRef.current = true;
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.replace('FieldDetail', { fieldId });
  }, [fieldId, navigation]);

  const persistLocal = useCallback(
    async (next: OnboardingStepId, pending: UpdateFieldWorkProfileInput, needsSync: boolean) => {
      const existing = await readWorkProfileDraft(fieldId);
      await writeWorkProfileDraft({
        fieldId,
        stepId: next,
        pendingUpdate: mergePendingUpdates(existing?.pendingUpdate ?? {}, pending),
        needsSync: needsSync || Boolean(existing?.needsSync),
        updatedAt: new Date().toISOString(),
      });
    },
    [fieldId]
  );

  const saveAnswer = useCallback(
    async (patch: UpdateFieldWorkProfileInput, advanceTo?: OnboardingStepId) => {
      setSaving(true);
      setError(null);
      setSyncNote(null);

      const targetStep =
        advanceTo ??
        nextStep(
          step,
          buildStepSequence({
            irrigationEnabled:
              patch.irrigation?.preferenceMode === 'enabled' ||
              profile?.irrigation?.preferenceMode === 'enabled',
            pruningEnabled:
              patch.pruning?.preferenceMode === 'enabled' ||
              profile?.pruning?.preferenceMode === 'enabled',
            fertilisationEnabled:
              patch.fertilisation?.preferenceMode === 'enabled' ||
              profile?.fertilisation?.preferenceMode === 'enabled',
            fertilisationAnnual:
              fertilisationAnnual || patch.fertilisation?.frequencyType === 'times_per_year',
            pestMonitoring:
              patch.pestManagement?.decisionApproach === 'trap_and_fruit_checks' ||
              patch.pestManagement?.decisionApproach === 'combined' ||
              profile?.pestManagement?.decisionApproach === 'trap_and_fruit_checks' ||
              profile?.pestManagement?.decisionApproach === 'combined',
            analysisKindsSelected:
              hasSelectedAnalysisKinds(patch.analysis?.kinds) ||
              hasSelectedAnalysisKinds(analysisKinds) ||
              hasSelectedAnalysisKinds(profile?.analysis?.kinds),
          })
        );

      try {
        if (!(await isDeviceOnline())) {
          await persistLocal(targetStep, patch, true);
          setSyncNote(t('tasks:fieldWork.onboarding.savedOffline'));
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  productionPurpose: patch.productionPurpose ?? prev.productionPurpose,
                  irrigation: { ...prev.irrigation, ...patch.irrigation } as FieldWorkProfile['irrigation'],
                  pruning: { ...prev.pruning, ...patch.pruning } as FieldWorkProfile['pruning'],
                  fertilisation: {
                    ...prev.fertilisation,
                    ...patch.fertilisation,
                  } as FieldWorkProfile['fertilisation'],
                  groundCover: {
                    ...prev.groundCover,
                    ...patch.groundCover,
                    methods: patch.groundCover?.methods ?? prev.groundCover?.methods ?? [],
                  } as FieldWorkProfile['groundCover'],
                  pestManagement: {
                    ...prev.pestManagement,
                    ...patch.pestManagement,
                  } as FieldWorkProfile['pestManagement'],
                  analysis: {
                    ...prev.analysis,
                    ...patch.analysis,
                    kinds: patch.analysis?.kinds ?? prev.analysis?.kinds ?? [],
                  } as FieldWorkProfile['analysis'],
                  harvest: { ...prev.harvest, ...patch.harvest } as FieldWorkProfile['harvest'],
                  notificationPreference: {
                    ...prev.notificationPreference,
                    ...patch.notificationPreference,
                  } as FieldWorkProfile['notificationPreference'],
                  currentYearDeclaredWork:
                    patch.currentYearDeclaredWork ?? prev.currentYearDeclaredWork,
                }
              : prev
          );
          setStep(targetStep);
          return;
        }

        const updated = await getFieldWorkService().updateWorkProfile(fieldId, patch);
        setProfile(updated);
        await persistLocal(targetStep, {}, false);
        const draft = await readWorkProfileDraft(fieldId);
        if (draft) {
          await writeWorkProfileDraft({
            ...draft,
            stepId: targetStep,
            needsSync: false,
            pendingUpdate: {},
          });
        }
        setStep(targetStep);
      } catch (err: unknown) {
        if (isNetworkError(err)) {
          await persistLocal(targetStep, patch, true);
          await OfflineQueue.addOperation({
            method: 'put',
            endpoint: `/api/v1/fields/${fieldId}/work-profile`,
            data: patch,
          });
          setSyncNote(t('tasks:fieldWork.onboarding.savedOffline'));
          setStep(targetStep);
        } else {
          setError(
            getApiErrorMessage(err, t('tasks:fieldWork.onboarding.saveFailed'))
          );
        }
      } finally {
        setSaving(false);
      }
    },
    [fieldId, step, profile, fertilisationAnnual, analysisKinds, persistLocal, t]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const fieldData = await getFieldService().getField(fieldId);
        if (cancelled) return;
        setField(fieldData);

        const own = resolveFieldGates({
          field: fieldData,
          userId: user?.id,
          userRole: user?.role,
        }).canOwn;
        if (fieldData.status === 'Draft') {
          setBlocked('draft');
          return;
        }
        if (!own) {
          setBlocked('permission');
          return;
        }

        let workProfile = await getFieldWorkService().getWorkProfile(fieldId).catch(() => null);
        if (cancelled) return;

        if (workProfile?.status === 'active' && !allowActiveEdit) {
          allowLeaveRef.current = true;
          navigation.replace('FieldDetail', { fieldId });
          return;
        }

        if (!workProfile) {
          if (!(await isDeviceOnline())) {
            setError(t('tasks:fieldWork.onboarding.needOnlineFirst'));
            return;
          }
          workProfile = await getFieldWorkService().createWorkProfile(fieldId, {
            resultYearCreated: athensCalendarYear(new Date()),
          });
        }

        const local = await readWorkProfileDraft(fieldId);
        if (local?.needsSync && local.pendingUpdate && (await isDeviceOnline()) && workProfile) {
          try {
            workProfile = await getFieldWorkService().updateWorkProfile(
              fieldId,
              local.pendingUpdate
            );
            await writeWorkProfileDraft({
              ...local,
              needsSync: false,
              pendingUpdate: {},
              updatedAt: new Date().toISOString(),
            });
          } catch {
            /* keep offline draft */
          }
        }

        if (cancelled) return;
        setProfile(workProfile);

        if (workProfile?.groundCover?.methods?.length) {
          setGroundMethods(workProfile.groundCover.methods);
        }
        if (workProfile?.analysis?.kinds?.length) {
          setAnalysisKinds(workProfile.analysis.kinds);
        }
        if (workProfile?.fertilisation?.frequencyType === 'times_per_year') {
          setFertilisationAnnual(true);
        }

        const resumeRaw =
          local?.stepId && local.stepId !== 'welcome'
            ? local.stepId
            : inferResumeStep(workProfile);
        setStep(normalizeOnboardingStep(resumeRaw, workProfile));
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, t('tasks:fieldWork.onboarding.loadFailed')));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [fieldId, syncGeneration, user?.id, user?.role, allowActiveEdit, navigation, t]);

  useEffect(() => {
    if (step !== 'personalizing') return;
    let cancelled = false;

    const finish = async () => {
      const started = Date.now();
      try {
        setActivating(true);
        setError(null);
        await getFieldWorkService()
          .updateWorkProfile(fieldId, {
            harvest: { needsMillBooking: 'unknown', source: SOURCE },
            notificationPreference: {
              intensity: 'decisions_and_upcoming',
              acceptedTaskReminderDaysBefore: 3,
            },
          })
          .catch(() => undefined);

        const activated = await getFieldWorkService().activateWorkProfile(fieldId);
        if (cancelled) return;
        setProfile(activated);
        try {
          await getFieldWorkService().evaluateFieldProposals(fieldId, { resultYear });
        } catch {
          /* Chronologio can refresh later */
        }
        await clearWorkProfileDraft(fieldId);
        const elapsed = Date.now() - started;
        if (elapsed < 1600) {
          await new Promise((resolve) => setTimeout(resolve, 1600 - elapsed));
        }
        if (!cancelled) {
          allowLeaveRef.current = true;
          navigation.reset({
            index: 1,
            routes: [
              { name: 'Main', params: { screen: 'Launcher' } },
              { name: 'Chronologio' },
            ],
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(err, t('tasks:fieldWork.onboarding.planPreview.activateFailed'))
          );
        }
      } finally {
        if (!cancelled) setActivating(false);
      }
    };

    void finish();
    return () => {
      cancelled = true;
    };
  }, [fieldId, step, resultYear, t, navigation, finishNonce]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: step !== 'personalizing' });
  }, [navigation, step]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (step === 'personalizing' && !allowLeaveRef.current) {
        e.preventDefault();
      }
    });
    return unsub;
  }, [navigation, step]);

  const goBack = () => {
    if (step === 'personalizing') return;
    const back = prevStep(step, sequence);
    if (back) {
      setStep(back);
      void (async () => {
        const draft = await readWorkProfileDraft(fieldId);
        await writeWorkProfileDraft({
          fieldId,
          stepId: back,
          pendingUpdate: draft?.pendingUpdate ?? {},
          needsSync: Boolean(draft?.needsSync),
          updatedAt: new Date().toISOString(),
        });
      })();
    }
  };

  const unsure = (patch: UpdateFieldWorkProfileInput) => {
    void saveAnswer(patch);
  };

  const question = (key: string) => t(`tasks:fieldWork.onboarding.questions.${key}`);
  const hint = (key: string) => t(`tasks:fieldWork.onboarding.hints.${key}`, { defaultValue: '' });
  const label = (key: string) => t(`tasks:fieldWork.onboarding.choices.${key}`);

  const renderChoices = (
    choiceKeys: { id: string; titleKey: string; descKey?: string }[],
    onPick: (id: string) => void,
    selectedId?: string | null
  ) => (
    <OnboardingChoiceList
      choices={choiceKeys.map((c) => ({
        id: c.id,
        title: label(c.titleKey),
        description: c.descKey ? label(c.descKey) : undefined,
      }))}
      selectedId={selectedId}
      onSelect={onPick}
    />
  );

  const yearCards = resultYearOptions(resultYear).map((opt) => ({
    id: String(opt.value),
    title: t(`tasks:fieldWork.onboarding.years.${opt.key}`, { year: opt.value }),
  }));

  const fieldName = field ? friendlyFieldLabel(field.name) : '';
  const fieldArea = field
    ? formatFieldArea(field, i18n.language.startsWith('en') ? 'en' : 'el')
    : '';

  const renderBlocked = (title: string, body: string) => (
    <ScreenLayout padded>
      <View style={[styles.pane, { paddingTop: insets.top + spacing.base }]}>
        <Text style={[styles.question, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{body}</Text>
        <Button
          title={t('tasks:fieldWork.onboarding.backToField')}
          onPress={goToField}
          size="large"
        />
      </View>
    </ScreenLayout>
  );

  if (loading) {
    return (
      <ScreenLayout>
        <LoadingSpinner fullScreen />
      </ScreenLayout>
    );
  }

  if (blocked === 'draft') {
    return renderBlocked(
      t('tasks:fieldWork.onboarding.blocked.draftTitle'),
      t('tasks:fieldWork.onboarding.blocked.draftBody')
    );
  }

  if (blocked === 'permission') {
    return renderBlocked(
      t('tasks:fieldWork.onboarding.blocked.permissionTitle'),
      t('tasks:fieldWork.onboarding.blocked.permissionBody')
    );
  }

  if (blocked === 'active') {
    return renderBlocked(
      t('tasks:fieldWork.onboarding.blocked.activeTitle'),
      t('tasks:fieldWork.onboarding.blocked.activeBody')
    );
  }

  if (error && !field) {
    return (
      <ScreenLayout padded>
        <View style={[styles.pane, { paddingTop: insets.top + spacing.base }]}>
          <Text style={[styles.hint, { color: colors.error }]}>{error}</Text>
          <Button
            title={t('fields:title')}
            onPress={() => {
              allowLeaveRef.current = true;
              navigation.navigate('Main', { screen: 'Fields' });
            }}
            variant="outline"
            size="large"
          />
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        {progress != null ? (
          <Text style={[styles.progress, { color: colors.textSecondary }]}>
            {t('tasks:fieldWork.onboarding.progress', {
              current: progress,
              total: PRIMARY_TOTAL,
            })}
          </Text>
        ) : (
          <View />
        )}
        {step !== 'personalizing' ? (
          <Pressable onPress={goToField} hitSlop={8}>
            <Text style={[styles.exit, { color: colors.primary }]}>
              {t('tasks:fieldWork.onboarding.exit')}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View key={step} style={styles.pane}>
          {step === 'welcome' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {t('tasks:fieldWork.onboarding.welcome.title')}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {fieldName}
                {fieldArea ? ` · ${fieldArea}` : ''}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {t('tasks:fieldWork.onboarding.welcome.body')}
              </Text>
              <View style={styles.actions}>
                <Button
                  title={t('tasks:fieldWork.onboarding.welcome.start')}
                  size="large"
                  fullWidth
                  loading={saving}
                  onPress={() => {
                    void (async () => {
                      const existing = await readWorkProfileDraft(fieldId);
                      await writeWorkProfileDraft({
                        fieldId,
                        stepId: 'purpose',
                        pendingUpdate: existing?.pendingUpdate ?? {},
                        needsSync: Boolean(existing?.needsSync),
                        updatedAt: new Date().toISOString(),
                      });
                      setStep('purpose');
                    })();
                  }}
                />
                <Button
                  title={t('tasks:fieldWork.onboarding.welcome.later')}
                  variant="outline"
                  size="large"
                  fullWidth
                  onPress={goToField}
                />
              </View>
            </>
          ) : null}

          {step === 'purpose' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('purpose')}
              </Text>
              {hint('purpose') ? (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint('purpose')}</Text>
              ) : null}
              {renderChoices(
                [
                  { id: 'olive_oil', titleKey: 'purpose.oil' },
                  { id: 'table_olives', titleKey: 'purpose.table' },
                  { id: 'both', titleKey: 'purpose.both' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => void saveAnswer({ productionPurpose: id })
              )}
            </>
          ) : null}

          {step === 'irrigation' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('irrigation')}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {field?.irrigationStatus
                  ? t('tasks:fieldWork.onboarding.hints.irrigationPrefill')
                  : hint('irrigation')}
              </Text>
              {renderChoices(
                [
                  { id: 'enabled', titleKey: 'irrigation.yes' },
                  { id: 'disabled', titleKey: 'irrigation.no' },
                  { id: 'ask_first', titleKey: 'irrigation.ask' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => void saveAnswer({ irrigation: { preferenceMode: id, source: SOURCE } })
              )}
            </>
          ) : null}

          {step === 'irrigationMethod' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('irrigationMethod')}
              </Text>
              {renderChoices(
                [
                  { id: 'drip', titleKey: 'irrigationMethod.drip' },
                  { id: 'sprinklers', titleKey: 'irrigationMethod.sprinklers' },
                  { id: 'portable', titleKey: 'irrigationMethod.portable' },
                  { id: 'other', titleKey: 'irrigationMethod.other' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => void saveAnswer({ irrigation: { method: id, source: SOURCE } })
              )}
            </>
          ) : null}

          {step === 'irrigationWho' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('irrigationWho')}
              </Text>
              {renderChoices(
                [
                  { id: 'self', titleKey: 'who.self' },
                  { id: 'collaborator_or_family', titleKey: 'who.family' },
                  { id: 'agronomist', titleKey: 'who.agronomist' },
                  { id: 'automatic_system', titleKey: 'who.auto' },
                  { id: 'no_fixed_way', titleKey: 'who.nofixed' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) =>
                  void saveAnswer({
                    irrigation: { decisionMaker: id, source: SOURCE },
                    defaultAssignments:
                      id === 'self'
                        ? {
                            entries: [
                              ...(profile?.defaultAssignments?.entries?.filter(
                                (e) => e.category !== 'irrigation'
                              ) ?? []),
                              { category: 'irrigation', isSelf: true },
                            ],
                          }
                        : undefined,
                  })
              )}
            </>
          ) : null}

          {step === 'pruning' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('pruning')}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint('pruning')}</Text>
              {renderChoices(
                [
                  { id: 'enabled', titleKey: 'pruning.yes' },
                  { id: 'when_needed', titleKey: 'pruning.whenNeeded' },
                  { id: 'decided_by_professional', titleKey: 'pruning.pro' },
                  { id: 'disabled', titleKey: 'pruning.no' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => {
                  if (id === 'when_needed') {
                    void saveAnswer({
                      pruning: {
                        preferenceMode: 'enabled',
                        frequencyType: 'when_needed',
                        source: SOURCE,
                      },
                    });
                  } else if (id === 'enabled') {
                    void saveAnswer({
                      pruning: {
                        preferenceMode: 'enabled',
                        frequencyType: 'every_n_years',
                        frequencyValue: 1,
                        source: SOURCE,
                      },
                    });
                  } else {
                    void saveAnswer({ pruning: { preferenceMode: id, source: SOURCE } });
                  }
                }
              )}
            </>
          ) : null}

          {step === 'pruningLastYear' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('pruningLastYear')}
              </Text>
              <OnboardingChoiceList
                choices={[
                  ...yearCards,
                  { id: 'never', title: label('pruning.never') },
                  { id: 'unknown', title: label('unsure') },
                ]}
                onSelect={(id) => {
                  if (id === 'never') {
                    void saveAnswer({
                      pruning: {
                        clearLastPerformedYear: true,
                        datePrecision: 'year',
                        source: SOURCE,
                      },
                    });
                  } else if (id === 'unknown') {
                    unsure({
                      pruning: {
                        clearLastPerformedYear: true,
                        datePrecision: 'year',
                        source: SOURCE,
                      },
                    });
                  } else {
                    void saveAnswer({
                      pruning: {
                        lastPerformedYear: Number(id),
                        datePrecision: 'year',
                        source: SOURCE,
                      },
                    });
                  }
                }}
              />
            </>
          ) : null}

          {step === 'pruningWho' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('pruningWho')}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {hint('optionalWho')}
              </Text>
              {renderChoices(
                [
                  { id: 'self', titleKey: 'who.self' },
                  { id: 'collaborator_or_family', titleKey: 'who.family' },
                  { id: 'contractor', titleKey: 'who.contractor' },
                  { id: 'agronomist', titleKey: 'who.agronomist' },
                  { id: 'skip', titleKey: 'skip' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => {
                  if (id === 'skip') {
                    setStep(nextStep(step, sequence));
                    return;
                  }
                  void saveAnswer({
                    defaultAssignments: {
                      entries: [
                        ...(profile?.defaultAssignments?.entries?.filter(
                          (e) => e.category !== 'pruning'
                        ) ?? []),
                        { category: 'pruning', isSelf: id === 'self' },
                      ],
                    },
                  });
                }
              )}
            </>
          ) : null}

          {step === 'fertilisation' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('fertilisation')}
              </Text>
              {renderChoices(
                [
                  { id: 'annual', titleKey: 'fertilisation.annual' },
                  { id: 'sometimes', titleKey: 'fertilisation.sometimes' },
                  { id: 'pro', titleKey: 'fertilisation.pro' },
                  { id: 'no', titleKey: 'fertilisation.no' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => {
                  if (id === 'annual') {
                    setFertilisationAnnual(true);
                    void saveAnswer({
                      fertilisation: {
                        preferenceMode: 'enabled',
                        frequencyType: 'times_per_year',
                        frequencyValue: 1,
                        source: SOURCE,
                      },
                    });
                  } else if (id === 'sometimes') {
                    setFertilisationAnnual(false);
                    void saveAnswer({
                      fertilisation: {
                        preferenceMode: 'enabled',
                        frequencyType: 'when_needed',
                        source: SOURCE,
                      },
                    });
                  } else if (id === 'pro') {
                    setFertilisationAnnual(false);
                    void saveAnswer({
                      fertilisation: {
                        preferenceMode: 'decided_by_professional',
                        source: SOURCE,
                      },
                    });
                  } else if (id === 'no') {
                    setFertilisationAnnual(false);
                    void saveAnswer({
                      fertilisation: { preferenceMode: 'disabled', source: SOURCE },
                    });
                  } else {
                    setFertilisationAnnual(false);
                    void saveAnswer({
                      fertilisation: { preferenceMode: 'unknown', source: SOURCE },
                    });
                  }
                }
              )}
            </>
          ) : null}

          {step === 'fertilisationFrequency' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('fertilisationFrequency')}
              </Text>
              {renderChoices(
                [
                  { id: '1', titleKey: 'fertilisation.once' },
                  { id: '2', titleKey: 'fertilisation.twice' },
                  { id: '3', titleKey: 'fertilisation.thrice' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => {
                  if (id === 'unknown') {
                    unsure({
                      fertilisation: { frequencyType: 'times_per_year', source: SOURCE },
                    });
                  } else {
                    void saveAnswer({
                      fertilisation: {
                        frequencyType: 'times_per_year',
                        frequencyValue: Number(id),
                        source: SOURCE,
                      },
                    });
                  }
                }
              )}
            </>
          ) : null}

          {step === 'fertilisationDone' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {t('tasks:fieldWork.onboarding.questions.fertilisationDone', { year: resultYear })}
              </Text>
              {renderChoices(
                [
                  { id: 'yes', titleKey: 'yes' },
                  { id: 'no', titleKey: 'no' },
                  { id: 'partially', titleKey: 'partially' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => {
                  const entry: CurrentYearDeclaredWork = {
                    category: 'fertilisation',
                    templateCode: 'T09',
                    resultYear,
                    completion: id,
                    source: SOURCE,
                  };
                  const rest =
                    profile?.currentYearDeclaredWork?.filter((w) => w.category !== 'fertilisation') ??
                    [];
                  void saveAnswer({ currentYearDeclaredWork: [...rest, entry] });
                }
              )}
            </>
          ) : null}

          {step === 'fertilisationWho' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('fertilisationWho')}
              </Text>
              {renderChoices(
                [
                  { id: 'self', titleKey: 'who.self' },
                  { id: 'collaborator_or_family', titleKey: 'who.family' },
                  { id: 'agronomist', titleKey: 'who.agronomist' },
                  { id: 'contractor', titleKey: 'who.contractor' },
                  { id: 'skip', titleKey: 'skip' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => {
                  if (id === 'skip') {
                    setStep(nextStep(step, sequence));
                    return;
                  }
                  void saveAnswer({
                    fertilisation: { decisionMaker: id, source: SOURCE },
                  });
                }
              )}
            </>
          ) : null}

          {step === 'groundCover' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('groundCover')}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {hint('multiSelect')}
              </Text>
              <OnboardingChoiceList
                multi
                selectedIds={groundMethods}
                choices={[
                  { id: 'mower_or_mulcher', title: label('ground.mower') },
                  { id: 'soil_tillage', title: label('ground.tillage') },
                  { id: 'grazing', title: label('ground.grazing') },
                  { id: 'herbicide', title: label('ground.herbicide') },
                  { id: 'no_fixed_clearing', title: label('ground.nofixed') },
                  { id: 'unknown', title: label('unsure') },
                ]}
                onSelect={(id) => {
                  setGroundMethods((prev) => {
                    if (id === 'unknown' || id === 'no_fixed_clearing') return [id];
                    const without = prev.filter((m) => m !== 'unknown' && m !== 'no_fixed_clearing');
                    return without.includes(id)
                      ? without.filter((m) => m !== id)
                      : [...without, id].slice(0, 5);
                  });
                }}
              />
              <View style={styles.actions}>
                <Button
                  title={t('tasks:fieldWork.onboarding.continue')}
                  size="large"
                  loading={saving}
                  disabled={groundMethods.length === 0}
                  onPress={() => {
                    const unsureOnly = groundMethods.includes('unknown');
                    void saveAnswer({
                      groundCover: {
                        preferenceMode: unsureOnly
                          ? 'unknown'
                          : groundMethods.includes('no_fixed_clearing')
                            ? 'disabled'
                            : 'enabled',
                        methods: groundMethods,
                        source: SOURCE,
                      },
                    });
                  }}
                />
              </View>
            </>
          ) : null}

          {step === 'groundCoverTimes' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('groundCoverTimes')}
              </Text>
              {renderChoices(
                [
                  { id: '1', titleKey: 'times.1' },
                  { id: '2', titleKey: 'times.2' },
                  { id: '3', titleKey: 'times.3' },
                  { id: 'when_needed', titleKey: 'times.whenNeeded' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => {
                  if (id === 'when_needed') {
                    void saveAnswer({
                      groundCover: { frequencyType: 'when_needed', source: SOURCE },
                    });
                  } else if (id === 'unknown') {
                    unsure({ groundCover: { frequencyType: 'unknown', source: SOURCE } });
                  } else {
                    void saveAnswer({
                      groundCover: {
                        frequencyType: 'times_per_year',
                        frequencyValue: Number(id),
                        source: SOURCE,
                      },
                    });
                  }
                }
              )}
            </>
          ) : null}

          {step === 'pest' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('pest')}
              </Text>
              {renderChoices(
                [
                  { id: 'official_warnings', titleKey: 'pest.official' },
                  { id: 'agronomist', titleKey: 'pest.agronomist' },
                  { id: 'trap_and_fruit_checks', titleKey: 'pest.traps' },
                  { id: 'combined', titleKey: 'pest.combined' },
                  { id: 'no_usual_treatments', titleKey: 'pest.none' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) =>
                  void saveAnswer({
                    pestManagement: {
                      decisionApproach: id,
                      preferenceMode:
                        id === 'no_usual_treatments'
                          ? 'disabled'
                          : id === 'unknown'
                            ? 'unknown'
                            : 'enabled',
                      source: SOURCE,
                    },
                  })
              )}
            </>
          ) : null}

          {step === 'pestTraps' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('pestTraps')}
              </Text>
              {renderChoices(
                [
                  { id: 'active', titleKey: 'traps.active' },
                  { id: 'not_yet_installed', titleKey: 'traps.notYet' },
                  { id: 'none', titleKey: 'traps.none' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) =>
                  void saveAnswer({
                    pestManagement: { trapStatus: id, source: SOURCE },
                  })
              )}
            </>
          ) : null}

          {step === 'pestWho' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('pestWho')}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {hint('optionalWho')}
              </Text>
              {renderChoices(
                [
                  { id: 'self', titleKey: 'who.self' },
                  { id: 'collaborator_or_family', titleKey: 'who.family' },
                  { id: 'agronomist', titleKey: 'who.agronomist' },
                  { id: 'skip', titleKey: 'skip' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => {
                  if (id === 'skip') {
                    setStep(nextStep(step, sequence));
                    return;
                  }
                  void saveAnswer({
                    defaultAssignments: {
                      entries: [
                        ...(profile?.defaultAssignments?.entries?.filter(
                          (e) => e.category !== 'pest'
                        ) ?? []),
                        { category: 'pest', isSelf: id === 'self' },
                      ],
                    },
                  });
                }
              )}
            </>
          ) : null}

          {step === 'analyses' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('analyses')}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {analysisKinds.some((k) => k.kind === 'none')
                  ? t('tasks:fieldWork.onboarding.hints.analysisNone')
                  : hint('multiSelect')}
              </Text>
              <OnboardingChoiceList
                multi
                selectedIds={analysisKinds.map((k) => k.kind)}
                choices={
                  analysisKinds.some((k) => k.kind === 'none')
                    ? [{ id: 'none', title: label('analysis.none') }]
                    : [
                        { id: 'soil', title: label('analysis.soil') },
                        { id: 'leaf', title: label('analysis.leaf') },
                        { id: 'water', title: label('analysis.water') },
                        { id: 'none', title: label('analysis.none') },
                      ]
                }
                onSelect={(id) => {
                  if (id === 'none') {
                    setAnalysisKinds((prev) =>
                      prev.some((k) => k.kind === 'none') ? [] : [{ kind: 'none' }]
                    );
                    return;
                  }
                  setAnalysisKinds((prev) => {
                    const cleaned = prev.filter((k) => k.kind !== 'unknown' && k.kind !== 'none');
                    if (cleaned.some((k) => k.kind === id)) {
                      return cleaned.filter((k) => k.kind !== id);
                    }
                    return [...cleaned, { kind: id, datePrecision: 'year' }];
                  });
                }}
              />
              <View style={styles.actions}>
                <Button
                  title={t('tasks:fieldWork.onboarding.continue')}
                  size="large"
                  loading={saving}
                  onPress={() => {
                    const noneOnly = analysisKinds.some((k) => k.kind === 'none');
                    const kinds = noneOnly
                      ? []
                      : analysisKinds.filter((k) => k.kind !== 'unknown' && k.kind !== 'none');
                    void saveAnswer({
                      analysis: {
                        preferenceMode: kinds.length ? 'enabled' : 'disabled',
                        kinds,
                        source: SOURCE,
                      },
                    });
                  }}
                />
                {analysisKinds.some((k) => k.kind === 'none') ? null : (
                  <Button
                    title={label('unsure')}
                    variant="outline"
                    size="large"
                    onPress={() =>
                      unsure({
                        analysis: { preferenceMode: 'unknown', kinds: [], source: SOURCE },
                      })
                    }
                  />
                )}
              </View>
            </>
          ) : null}

          {step === 'analysesYears' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('analysesYears')}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {hint('analysesYears')}
              </Text>
              {(analysisKinds.length ? analysisKinds : profile?.analysis?.kinds ?? [])
                .filter((k) => k.kind !== 'unknown')
                .map((entry) => (
                  <View key={entry.kind} style={styles.yearBlock}>
                    <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 8 }]}>
                      {label(`analysis.${entry.kind}`)}
                    </Text>
                    <OnboardingChoiceList
                      selectedId={
                        entry.lastPerformedYear != null ? String(entry.lastPerformedYear) : null
                      }
                      choices={[...yearCards.slice(0, 4), { id: 'unknown', title: label('unsure') }]}
                      onSelect={(id) => {
                        setAnalysisKinds((prev) => {
                          const base = prev.length > 0 ? prev : profile?.analysis?.kinds ?? [];
                          return base.map((k) =>
                            k.kind === entry.kind
                              ? {
                                  ...k,
                                  lastPerformedYear: id === 'unknown' ? null : Number(id),
                                  datePrecision: 'year',
                                }
                              : k
                          );
                        });
                      }}
                    />
                  </View>
                ))}
              <View style={styles.actions}>
                <Button
                  title={t('tasks:fieldWork.onboarding.continue')}
                  size="large"
                  loading={saving}
                  onPress={() => {
                    const kinds =
                      analysisKinds.length > 0 ? analysisKinds : profile?.analysis?.kinds ?? [];
                    void saveAnswer({
                      analysis: { kinds, preferenceMode: 'enabled', source: SOURCE },
                    });
                  }}
                />
              </View>
            </>
          ) : null}

          {step === 'harvestMonth' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('harvestMonth')}
              </Text>
              <OnboardingChoiceList
                choices={[
                  { id: '10', title: t('tasks:fieldWork.onboarding.months.10') },
                  { id: '11', title: t('tasks:fieldWork.onboarding.months.11') },
                  { id: '12', title: t('tasks:fieldWork.onboarding.months.12') },
                  { id: '1', title: t('tasks:fieldWork.onboarding.months.1') },
                  { id: '2', title: t('tasks:fieldWork.onboarding.months.2') },
                  { id: 'unknown', title: label('unsure') },
                ]}
                onSelect={(id) => {
                  if (id === 'unknown') {
                    unsure({ harvest: { clearExpectedStartMonth: true, source: SOURCE } });
                  } else {
                    void saveAnswer({
                      harvest: {
                        expectedStartMonth: Number(id),
                        preferenceMode: 'enabled',
                        source: SOURCE,
                      },
                    });
                  }
                }}
              />
            </>
          ) : null}

          {step === 'harvestWho' ? (
            <>
              <Text style={[styles.question, { color: colors.textPrimary }]}>
                {question('harvestWho')}
              </Text>
              {renderChoices(
                [
                  { id: 'self', titleKey: 'who.self' },
                  { id: 'collaborator_or_family', titleKey: 'who.family' },
                  { id: 'contractor', titleKey: 'who.contractor' },
                  { id: 'no_fixed_way', titleKey: 'who.nofixed' },
                  { id: 'unknown', titleKey: 'unsure' },
                ],
                (id) => void saveAnswer({ harvest: { organizer: id, source: SOURCE } })
              )}
            </>
          ) : null}

          {step === 'personalizing' ? (
            <View style={styles.personalizing} accessibilityLiveRegion="polite">
              {activating || !error ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : null}
              <Text style={[styles.question, { color: colors.textPrimary, textAlign: 'center' }]}>
                {t('tasks:fieldWork.onboarding.personalizing.title')}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary, textAlign: 'center' }]}>
                {t('tasks:fieldWork.onboarding.personalizing.body')}
              </Text>
              {error ? (
                <Button
                  title={t('tasks:fieldWork.onboarding.continue')}
                  size="large"
                  onPress={() => setFinishNonce((n) => n + 1)}
                />
              ) : null}
            </View>
          ) : null}

          {step !== 'welcome' && step !== 'personalizing' ? (
            <View style={styles.actions}>
              <Button
                title={t('common:back')}
                variant="ghost"
                size="large"
                onPress={goBack}
                disabled={saving}
              />
            </View>
          ) : null}

          {saving ? (
            <Text style={[styles.status, { color: colors.textSecondary }]}>
              {t('tasks:fieldWork.onboarding.saving')}
            </Text>
          ) : null}
          {syncNote ? (
            <Text
              style={[
                styles.status,
                { color: isOnline ? colors.textSecondary : colors.warning },
              ]}
            >
              {syncNote}
            </Text>
          ) : null}
        </View>

        {error ? (
          <Text style={[styles.status, { color: colors.error, paddingHorizontal: spacing.base }]}>
            {error}
          </Text>
        ) : null}
        {!canOwn && field ? (
          <Text style={[styles.status, { color: colors.error, paddingHorizontal: spacing.base }]}>
            {t('tasks:fieldWork.onboarding.blocked.permissionBody')}
          </Text>
        ) : null}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    minHeight: 44,
  },
  progress: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
  },
  exit: {
    ...typography.styles.body,
    fontWeight: '600',
  },
  scroll: {
    paddingBottom: spacing['3xl'],
  },
  pane: {
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  question: {
    ...typography.styles.h3,
  },
  hint: {
    ...typography.styles.body,
    marginBottom: spacing.sm,
  },
  meta: {
    ...typography.styles.body,
    marginBottom: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  yearBlock: {
    marginBottom: spacing.base,
  },
  personalizing: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing['2xl'],
  },
  status: {
    ...typography.styles.bodySmall,
    marginTop: spacing.sm,
  },
});

export default FieldWorkSetupScreen;
