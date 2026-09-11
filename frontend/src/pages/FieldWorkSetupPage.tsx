import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import OnboardingChoiceList from '../components/FieldWork/OnboardingChoiceList';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { useFieldCapacity } from '../hooks/useFieldCapacity';
import { getFieldService, getFieldWorkService } from '../services/serviceFactory';
import type { Field } from '../services/fieldService';
import type {
  AnalysisKindEntry,
  CurrentYearDeclaredWork,
  FieldWorkPlanPreview,
  FieldWorkProfile,
  UpdateFieldWorkProfileInput,
} from '../services/fieldWorkService';
import { athensCalendarYear } from '../utils/athensDate';
import { formatFieldArea } from '../utils/fieldGeo';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { getApiErrorMessage } from '../utils/translateApiError';
import { isDeviceOnline, isNetworkError } from '../utils/networkStatus';
import { OfflineQueue } from '../utils/offlineQueue';
import {
  buildStepSequence,
  inferResumeStep,
  nextStep,
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
import WorkProfileCopyWizard from '../components/FieldWork/WorkProfileCopyWizard';
import FieldWorkPlanReview from '../components/FieldWork/FieldWorkPlanReview';
import './FieldWorkSetupPage.css';
import './FieldWorkProfilePage.css';

const SOURCE = 'user_declared_during_onboarding';

const FieldWorkSetupPage: React.FC = () => {
  const { t } = useTranslation(['tasks', 'fields', 'common']);
  const { id: fieldId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const allowActiveEdit = searchParams.get('edit') === '1';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline, refreshGeneration } = useOfflineMode();

  const [field, setField] = useState<Field | null>(null);
  const [profile, setProfile] = useState<FieldWorkProfile | null>(null);
  const [step, setStep] = useState<OnboardingStepId>('welcome');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<'draft' | 'permission' | 'active' | null>(null);
  const [planPreview, setPlanPreview] = useState<FieldWorkPlanPreview | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [returnToPlanAfterSave, setReturnToPlanAfterSave] = useState(false);
  const [copyFromSimilar, setCopyFromSimilar] = useState(false);

  // Local UI state for multi-select / follow-ups
  const [groundMethods, setGroundMethods] = useState<string[]>([]);
  const [analysisKinds, setAnalysisKinds] = useState<AnalysisKindEntry[]>([]);
  const [pendingMonths, setPendingMonths] = useState<number[]>([]);
  const [fertilisationAnnual, setFertilisationAnnual] = useState(false);

  const capacity = useFieldCapacity(field);
  const canOwn = capacity.canOwn || field?.ownerId === user?.userId;
  const resultYear = profile?.resultYearCreated ?? athensCalendarYear(new Date());

  const sequence = useMemo(
    () =>
      buildStepSequence({
        irrigationEnabled: profile?.irrigation.preferenceMode === 'enabled',
        pruningEnabled: profile?.pruning.preferenceMode === 'enabled',
        fertilisationEnabled: profile?.fertilisation.preferenceMode === 'enabled',
        fertilisationAnnual,
        pestMonitoring:
          profile?.pestManagement.decisionApproach === 'trap_and_fruit_checks' ||
          profile?.pestManagement.decisionApproach === 'combined',
        analysisKindsSelected:
          analysisKinds.length > 0 || (profile?.analysis.kinds.length ?? 0) > 0,
      }),
    [profile, fertilisationAnnual, analysisKinds]
  );

  const progress = primaryIndexForStep(step);

  const exitToField = useCallback(() => {
    if (fieldId) navigate(`/fields/${fieldId}`);
    else navigate('/fields');
  }, [fieldId, navigate]);

  const persistLocal = useCallback(
    (nextStep: OnboardingStepId, pending: UpdateFieldWorkProfileInput, needsSync: boolean) => {
      if (!fieldId) return;
      const existing = readWorkProfileDraft(fieldId);
      writeWorkProfileDraft({
        fieldId,
        stepId: nextStep,
        pendingUpdate: mergePendingUpdates(existing?.pendingUpdate ?? {}, pending),
        needsSync: needsSync || Boolean(existing?.needsSync),
        updatedAt: new Date().toISOString(),
      });
    },
    [fieldId]
  );

  const saveAnswer = useCallback(
    async (patch: UpdateFieldWorkProfileInput, advanceTo?: OnboardingStepId) => {
      if (!fieldId) return;
      setSaving(true);
      setError(null);
      setSyncNote(null);

      const resumePlan = returnToPlanAfterSave && !advanceTo;
      const targetStep =
        advanceTo ??
        (resumePlan
          ? 'planPreview'
          : nextStep(step, buildStepSequence({
          irrigationEnabled:
            patch.irrigation?.preferenceMode === 'enabled' ||
            profile?.irrigation.preferenceMode === 'enabled',
          pruningEnabled:
            patch.pruning?.preferenceMode === 'enabled' ||
            profile?.pruning.preferenceMode === 'enabled',
          fertilisationEnabled:
            patch.fertilisation?.preferenceMode === 'enabled' ||
            profile?.fertilisation.preferenceMode === 'enabled',
          fertilisationAnnual:
            fertilisationAnnual ||
            patch.fertilisation?.frequencyType === 'times_per_year',
          pestMonitoring:
            patch.pestManagement?.decisionApproach === 'trap_and_fruit_checks' ||
            patch.pestManagement?.decisionApproach === 'combined' ||
            profile?.pestManagement.decisionApproach === 'trap_and_fruit_checks' ||
            profile?.pestManagement.decisionApproach === 'combined',
          analysisKindsSelected:
            Boolean(patch.analysis?.kinds?.length) ||
            analysisKinds.length > 0 ||
            (profile?.analysis.kinds.length ?? 0) > 0,
        })));

      if (resumePlan) {
        setReturnToPlanAfterSave(false);
      }
      try {
        if (!isDeviceOnline()) {
          persistLocal(targetStep, patch, true);
          setSyncNote(t('tasks:fieldWork.onboarding.savedOffline'));
          // Optimistic local merge for UI
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  productionPurpose: patch.productionPurpose ?? prev.productionPurpose,
                  irrigation: { ...prev.irrigation, ...patch.irrigation },
                  pruning: { ...prev.pruning, ...patch.pruning },
                  fertilisation: { ...prev.fertilisation, ...patch.fertilisation },
                  groundCover: {
                    ...prev.groundCover,
                    ...patch.groundCover,
                    methods: patch.groundCover?.methods ?? prev.groundCover.methods,
                  },
                  pestManagement: { ...prev.pestManagement, ...patch.pestManagement },
                  analysis: {
                    ...prev.analysis,
                    ...patch.analysis,
                    kinds: patch.analysis?.kinds ?? prev.analysis.kinds,
                  },
                  harvest: { ...prev.harvest, ...patch.harvest },
                  notificationPreference: {
                    ...prev.notificationPreference,
                    ...patch.notificationPreference,
                  },
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
        persistLocal(targetStep, {}, false);
        const draft = readWorkProfileDraft(fieldId);
        if (draft) {
          writeWorkProfileDraft({ ...draft, stepId: targetStep, needsSync: false, pendingUpdate: {} });
        }
        setStep(targetStep);
      } catch (err: unknown) {
        if (isNetworkError(err)) {
          persistLocal(targetStep, patch, true);
          await OfflineQueue.addOperation({
            method: 'put',
            endpoint: `/api/v1/fields/${fieldId}/work-profile`,
            data: patch,
          });
          setSyncNote(t('tasks:fieldWork.onboarding.savedOffline'));
          setStep(targetStep);
        } else {
          setError(getApiErrorMessage(err, t) || t('tasks:fieldWork.onboarding.saveFailed'));
        }
      } finally {
        setSaving(false);
      }
    },
    [fieldId, step, profile, fertilisationAnnual, analysisKinds, persistLocal, returnToPlanAfterSave, t]
  );

  // Load field + profile; create draft if needed; resume
  useEffect(() => {
    if (!fieldId) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const fieldData = await getFieldService().getField(fieldId);
        if (cancelled) return;
        setField(fieldData);

        const own =
          fieldData.ownerId === user?.userId ||
          (fieldData.memberships || []).some(
            (m) =>
              m.userId === user?.userId &&
              m.status === 'active' &&
              m.capacities?.includes('own')
          );
        if (fieldData.status === 'Draft') {
          setBlocked('draft');
          return;
        }
        if (!own && user?.role !== 'FieldOwner' && user?.role !== 'Administrator') {
          setBlocked('permission');
          return;
        }

        let workProfile = await getFieldWorkService().getWorkProfile(fieldId).catch(() => null);
        if (cancelled) return;

        if (workProfile?.status === 'active' && !allowActiveEdit) {
          navigate(`/fields/${fieldId}/work-profile`, { replace: true });
          return;
        }

        if (!workProfile) {
          if (!isDeviceOnline()) {
            setError(t('tasks:fieldWork.onboarding.needOnlineFirst'));
            return;
          }
          workProfile = await getFieldWorkService().createWorkProfile(fieldId, {
            resultYearCreated: athensCalendarYear(new Date()),
          });
        }

        const local = readWorkProfileDraft(fieldId);
        if (local?.needsSync && local.pendingUpdate && isDeviceOnline() && workProfile) {
          try {
            workProfile = await getFieldWorkService().updateWorkProfile(
              fieldId,
              local.pendingUpdate
            );
            writeWorkProfileDraft({
              ...local,
              needsSync: false,
              pendingUpdate: {},
              updatedAt: new Date().toISOString(),
            });
          } catch {
            // keep offline draft
          }
        }

        if (cancelled) return;
        setProfile(workProfile);

        if (workProfile?.groundCover.methods?.length) {
          setGroundMethods(workProfile.groundCover.methods);
        }
        if (workProfile?.analysis.kinds?.length) {
          setAnalysisKinds(workProfile.analysis.kinds);
        }
        if (workProfile?.fertilisation.frequencyType === 'times_per_year') {
          setFertilisationAnnual(true);
        }

        // Prefill irrigation from field if still unknown
        if (
          workProfile &&
          workProfile.irrigation.preferenceMode === 'unknown' &&
          fieldData.irrigationStatus === true
        ) {
          // leave unknown so user confirms; no auto-write
        }

        const resumeRaw =
          local?.stepId && local.stepId !== 'welcome'
            ? local.stepId
            : inferResumeStep(workProfile);
        const resume: OnboardingStepId =
          resumeRaw === 'finished' ? 'planPreview' : (resumeRaw as OnboardingStepId);
        setStep(resume === 'welcome' && workProfile ? inferResumeStep(workProfile) : resume);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, t) || t('tasks:fieldWork.onboarding.loadFailed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId, refreshGeneration, user?.userId, allowActiveEdit, navigate]);

  // Load plan preview when entering preview step
  useEffect(() => {
    if (!fieldId || step !== 'planPreview') return;
    let cancelled = false;

    const loadPreview = async () => {
      try {
        setPlanLoading(true);
        setError(null);
        const preview = await getFieldWorkService().getPlanPreview(fieldId, resultYear);
        if (!cancelled) setPlanPreview(preview);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(err, t) || t('tasks:fieldWork.onboarding.planPreview.loadFailed')
          );
        }
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [fieldId, step, resultYear, t]);

  const goBack = () => {
    if (returnToPlanAfterSave) {
      setReturnToPlanAfterSave(false);
      setStep('planPreview');
      if (fieldId) {
        const draft = readWorkProfileDraft(fieldId);
        writeWorkProfileDraft({
          fieldId,
          stepId: 'planPreview',
          pendingUpdate: draft?.pendingUpdate ?? {},
          needsSync: Boolean(draft?.needsSync),
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }
    if (step === 'planPreview') {
      setStep('reminders');
      if (fieldId) {
        const draft = readWorkProfileDraft(fieldId);
        writeWorkProfileDraft({
          fieldId,
          stepId: 'reminders',
          pendingUpdate: draft?.pendingUpdate ?? {},
          needsSync: Boolean(draft?.needsSync),
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }
    const back = prevStep(step, sequence);
    if (back) {
      setStep(back);
      if (fieldId) {
        const draft = readWorkProfileDraft(fieldId);
        writeWorkProfileDraft({
          fieldId,
          stepId: back,
          pendingUpdate: draft?.pendingUpdate ?? {},
          needsSync: Boolean(draft?.needsSync),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  };

  const jumpToPreference = (target: OnboardingStepId) => {
    setReturnToPlanAfterSave(true);
    setStep(target);
    if (fieldId) {
      const draft = readWorkProfileDraft(fieldId);
      writeWorkProfileDraft({
        fieldId,
        stepId: target,
        pendingUpdate: draft?.pendingUpdate ?? {},
        needsSync: Boolean(draft?.needsSync),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const acceptPlan = async () => {
    if (!fieldId) return;
    try {
      setActivating(true);
      setError(null);
      const activated = await getFieldWorkService().activateWorkProfile(fieldId);
      setProfile(activated);
      // Evaluate proposals for the field — creates TaskProposals only, never FieldTasks.
      try {
        await getFieldWorkService().evaluateFieldProposals(fieldId, {
          resultYear: planPreview?.resultYear ?? resultYear,
        });
      } catch {
        // Activation succeeded; proposals can refresh later from Chronologio.
      }
      clearWorkProfileDraft(fieldId);
      setStep('similarFields');
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, t) || t('tasks:fieldWork.onboarding.planPreview.activateFailed')
      );
    } finally {
      setActivating(false);
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

  const monthChoices = [3, 4, 5, 6, 9, 10].map((m) => ({
    id: String(m),
    title: t(`tasks:fieldWork.onboarding.months.${m}`),
  }));

  const yearCards = resultYearOptions(resultYear).map((opt) => ({
    id: String(opt.value),
    title: t(`tasks:fieldWork.onboarding.years.${opt.key}`, { year: opt.value }),
  }));

  if (loading) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <LoadingSpinner className="page-inline-loading" />
      </PageContainer>
    );
  }

  if (blocked === 'draft') {
    return (
      <PageContainer>
        <Breadcrumbs />
        <div className="fw-setup">
          <h1 className="fw-setup-question">{t('tasks:fieldWork.onboarding.blocked.draftTitle')}</h1>
          <p className="fw-setup-hint">{t('tasks:fieldWork.onboarding.blocked.draftBody')}</p>
          <Button variant="primary" size="lg" onClick={exitToField}>
            {t('tasks:fieldWork.onboarding.backToField')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (blocked === 'permission') {
    return (
      <PageContainer>
        <Breadcrumbs />
        <div className="fw-setup">
          <h1 className="fw-setup-question">
            {t('tasks:fieldWork.onboarding.blocked.permissionTitle')}
          </h1>
          <p className="fw-setup-hint">{t('tasks:fieldWork.onboarding.blocked.permissionBody')}</p>
          <Button variant="primary" size="lg" onClick={exitToField}>
            {t('tasks:fieldWork.onboarding.backToField')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (blocked === 'active') {
    return (
      <PageContainer>
        <Breadcrumbs />
        <div className="fw-setup">
          <h1 className="fw-setup-question">{t('tasks:fieldWork.onboarding.blocked.activeTitle')}</h1>
          <p className="fw-setup-hint">{t('tasks:fieldWork.onboarding.blocked.activeBody')}</p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => fieldId && navigate(`/fields/${fieldId}/work-profile`)}
          >
            {t('tasks:fieldWork.profile.open')}
          </Button>
          <Button variant="ghost" size="lg" onClick={exitToField}>
            {t('tasks:fieldWork.onboarding.backToField')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (error && !field) {
    return (
      <PageContainer>
        <div className="error-container">
          <div className="error-message">{error}</div>
          <Button to="/fields" icon={<ArrowLeft />} variant="outline">
            {t('fields:controlRoom.backToFields')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  const fieldName = field ? friendlyFieldLabel(field.name) : '';
  const fieldArea = field ? formatFieldArea(field) : '';

  return (
    <PageContainer>
      <div className="fw-setup">
        <Breadcrumbs />
        <div className="fw-setup-top">
          {progress != null ? (
            <span className="fw-setup-progress">
              {t('tasks:fieldWork.onboarding.progress', {
                current: progress,
                total: PRIMARY_TOTAL,
              })}
            </span>
          ) : (
            <span className="fw-setup-progress" />
          )}
          <button type="button" className="fw-setup-exit" onClick={exitToField}>
            {t('tasks:fieldWork.onboarding.exit')}
          </button>
        </div>

        {returnToPlanAfterSave &&
        step !== 'planPreview' &&
        step !== 'finished' &&
        step !== 'similarFields' &&
        step !== 'completion' ? (
          <p className="fw-setup-return-note">{t('tasks:fieldWork.onboarding.planPreview.returnNote')}</p>
        ) : null}

        <div key={step} className="fw-setup-pane">
        {step === 'welcome' && (
          <>
            <h1 className="fw-setup-question">{t('tasks:fieldWork.onboarding.welcome.title')}</h1>
            <p className="fw-setup-field-meta">
              {fieldName}
              {fieldArea ? ` · ${fieldArea}` : ''}
            </p>
            <p className="fw-setup-hint">{t('tasks:fieldWork.onboarding.welcome.body')}</p>
            <div className="fw-setup-actions">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={saving}
                onClick={() => {
                  if (fieldId) {
                    writeWorkProfileDraft({
                      fieldId,
                      stepId: 'purpose',
                      pendingUpdate: readWorkProfileDraft(fieldId)?.pendingUpdate ?? {},
                      needsSync: Boolean(readWorkProfileDraft(fieldId)?.needsSync),
                      updatedAt: new Date().toISOString(),
                    });
                  }
                  setStep('purpose');
                }}
              >
                {t('tasks:fieldWork.onboarding.welcome.start')}
              </Button>
              <Button variant="outline" size="lg" fullWidth onClick={exitToField}>
                {t('tasks:fieldWork.onboarding.welcome.later')}
              </Button>
            </div>
          </>
        )}

        {step === 'purpose' && (
          <>
            <h1 className="fw-setup-question">{question('purpose')}</h1>
            {hint('purpose') ? <p className="fw-setup-hint">{hint('purpose')}</p> : null}
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
        )}

        {step === 'irrigation' && (
          <>
            <h1 className="fw-setup-question">{question('irrigation')}</h1>
            {field?.irrigationStatus ? (
              <p className="fw-setup-hint">{t('tasks:fieldWork.onboarding.hints.irrigationPrefill')}</p>
            ) : (
              <p className="fw-setup-hint">{hint('irrigation')}</p>
            )}
            {renderChoices(
              [
                { id: 'enabled', titleKey: 'irrigation.yes' },
                { id: 'disabled', titleKey: 'irrigation.no' },
                { id: 'ask_first', titleKey: 'irrigation.ask' },
                { id: 'unknown', titleKey: 'unsure' },
              ],
              (id) =>
                void saveAnswer({
                  irrigation: { preferenceMode: id, source: SOURCE },
                })
            )}
          </>
        )}

        {step === 'irrigationMethod' && (
          <>
            <h1 className="fw-setup-question">{question('irrigationMethod')}</h1>
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
        )}

        {step === 'irrigationWho' && (
          <>
            <h1 className="fw-setup-question">{question('irrigationWho')}</h1>
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
                            ...(profile?.defaultAssignments.entries.filter(
                              (e) => e.category !== 'irrigation'
                            ) ?? []),
                            { category: 'irrigation', isSelf: true },
                          ],
                        }
                      : undefined,
                })
            )}
          </>
        )}

        {step === 'pruning' && (
          <>
            <h1 className="fw-setup-question">{question('pruning')}</h1>
            <p className="fw-setup-hint">{hint('pruning')}</p>
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
                  void saveAnswer({
                    pruning: { preferenceMode: id, source: SOURCE },
                  });
                }
              }
            )}
          </>
        )}

        {step === 'pruningLastYear' && (
          <>
            <h1 className="fw-setup-question">{question('pruningLastYear')}</h1>
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
        )}

        {step === 'pruningWho' && (
          <>
            <h1 className="fw-setup-question">{question('pruningWho')}</h1>
            <p className="fw-setup-hint">{hint('optionalWho')}</p>
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
                      ...(profile?.defaultAssignments.entries.filter(
                        (e) => e.category !== 'pruning'
                      ) ?? []),
                      { category: 'pruning', isSelf: id === 'self' },
                    ],
                  },
                });
              }
            )}
          </>
        )}

        {step === 'fertilisation' && (
          <>
            <h1 className="fw-setup-question">{question('fertilisation')}</h1>
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
        )}

        {step === 'fertilisationFrequency' && (
          <>
            <h1 className="fw-setup-question">{question('fertilisationFrequency')}</h1>
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
        )}

        {step === 'fertilisationDone' && (
          <>
            <h1 className="fw-setup-question">
              {t('tasks:fieldWork.onboarding.questions.fertilisationDone', { year: resultYear })}
            </h1>
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
                  profile?.currentYearDeclaredWork.filter((w) => w.category !== 'fertilisation') ??
                  [];
                void saveAnswer({ currentYearDeclaredWork: [...rest, entry] });
              }
            )}
          </>
        )}

        {step === 'fertilisationWho' && (
          <>
            <h1 className="fw-setup-question">{question('fertilisationWho')}</h1>
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
        )}

        {step === 'groundCover' && (
          <>
            <h1 className="fw-setup-question">{question('groundCover')}</h1>
            <p className="fw-setup-hint">{hint('multiSelect')}</p>
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
            <div className="fw-setup-actions">
              <Button
                variant="primary"
                size="lg"
                loading={saving}
                disabled={groundMethods.length === 0}
                onClick={() => {
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
              >
                {t('tasks:fieldWork.onboarding.continue')}
              </Button>
            </div>
          </>
        )}

        {step === 'groundCoverTimes' && (
          <>
            <h1 className="fw-setup-question">{question('groundCoverTimes')}</h1>
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
                  unsure({
                    groundCover: { frequencyType: 'unknown', source: SOURCE },
                  });
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
        )}

        {step === 'groundCoverMonths' && (
          <>
            <h1 className="fw-setup-question">{question('groundCoverMonths')}</h1>
            <p className="fw-setup-hint">{hint('optionalMonths')}</p>
            <OnboardingChoiceList
              multi
              selectedIds={pendingMonths.map(String)}
              choices={monthChoices}
              onSelect={(id) => {
                const m = Number(id);
                setPendingMonths((prev) =>
                  prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
                );
              }}
            />
            <div className="fw-setup-actions">
              <Button
                variant="primary"
                size="lg"
                loading={saving}
                onClick={() =>
                  void saveAnswer({
                    groundCover: { preferredMonths: pendingMonths, source: SOURCE },
                  })
                }
              >
                {t('tasks:fieldWork.onboarding.continue')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  void saveAnswer({
                    groundCover: { preferredMonths: [], source: SOURCE },
                  })
                }
              >
                {label('skip')}
              </Button>
            </div>
          </>
        )}

        {step === 'pest' && (
          <>
            <h1 className="fw-setup-question">{question('pest')}</h1>
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
        )}

        {step === 'pestTraps' && (
          <>
            <h1 className="fw-setup-question">{question('pestTraps')}</h1>
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
        )}

        {step === 'pestWho' && (
          <>
            <h1 className="fw-setup-question">{question('pestWho')}</h1>
            <p className="fw-setup-hint">{hint('optionalWho')}</p>
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
                      ...(profile?.defaultAssignments.entries.filter(
                        (e) => e.category !== 'pest'
                      ) ?? []),
                      { category: 'pest', isSelf: id === 'self' },
                    ],
                  },
                });
              }
            )}
          </>
        )}

        {step === 'analyses' && (
          <>
            <h1 className="fw-setup-question">{question('analyses')}</h1>
            <p className="fw-setup-hint">{hint('multiSelect')}</p>
            <OnboardingChoiceList
              multi
              selectedIds={analysisKinds.map((k) => k.kind)}
              choices={[
                { id: 'soil', title: label('analysis.soil') },
                { id: 'leaf', title: label('analysis.leaf') },
                { id: 'water', title: label('analysis.water') },
                { id: 'none', title: label('analysis.none') },
                { id: 'unknown', title: label('unsure') },
              ]}
              onSelect={(id) => {
                if (id === 'none') {
                  setAnalysisKinds([]);
                  return;
                }
                if (id === 'unknown') {
                  setAnalysisKinds([{ kind: 'unknown' }]);
                  return;
                }
                setAnalysisKinds((prev) => {
                  const cleaned = prev.filter((k) => k.kind !== 'unknown');
                  if (cleaned.some((k) => k.kind === id)) {
                    return cleaned.filter((k) => k.kind !== id);
                  }
                  return [...cleaned, { kind: id, datePrecision: 'year' }];
                });
              }}
            />
            <div className="fw-setup-actions">
              <Button
                variant="primary"
                size="lg"
                loading={saving}
                onClick={() => {
                  const kinds = analysisKinds.filter((k) => k.kind !== 'unknown');
                  void saveAnswer({
                    analysis: {
                      preferenceMode: kinds.length ? 'enabled' : 'disabled',
                      kinds,
                      source: SOURCE,
                    },
                  });
                }}
              >
                {t('tasks:fieldWork.onboarding.continue')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  unsure({
                    analysis: { preferenceMode: 'unknown', kinds: [], source: SOURCE },
                  })
                }
              >
                {label('unsure')}
              </Button>
            </div>
          </>
        )}

        {step === 'analysesYears' && (
          <>
            <h1 className="fw-setup-question">{question('analysesYears')}</h1>
            <p className="fw-setup-hint">{hint('analysesYears')}</p>
            {(analysisKinds.length ? analysisKinds : profile?.analysis.kinds ?? [])
              .filter((k) => k.kind !== 'unknown')
              .map((entry) => (
                <div key={entry.kind} style={{ marginBottom: '1.25rem' }}>
                  <p className="fw-setup-hint" style={{ marginBottom: '0.5rem' }}>
                    {label(`analysis.${entry.kind}`)}
                  </p>
                  <OnboardingChoiceList
                    selectedId={
                      entry.lastPerformedYear != null ? String(entry.lastPerformedYear) : null
                    }
                    choices={[
                      ...yearCards.slice(0, 4),
                      { id: 'unknown', title: label('unsure') },
                    ]}
                    onSelect={(id) => {
                      setAnalysisKinds((prev) => {
                        const base =
                          prev.length > 0 ? prev : profile?.analysis.kinds ?? [];
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
                </div>
              ))}
            <div className="fw-setup-actions">
              <Button
                variant="primary"
                size="lg"
                loading={saving}
                onClick={() => {
                  const kinds =
                    analysisKinds.length > 0 ? analysisKinds : profile?.analysis.kinds ?? [];
                  void saveAnswer({
                    analysis: { kinds, preferenceMode: 'enabled', source: SOURCE },
                  });
                }}
              >
                {t('tasks:fieldWork.onboarding.continue')}
              </Button>
            </div>
          </>
        )}

        {step === 'harvestMonth' && (
          <>
            <h1 className="fw-setup-question">{question('harvestMonth')}</h1>
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
                  unsure({
                    harvest: { clearExpectedStartMonth: true, source: SOURCE },
                  });
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
        )}

        {step === 'harvestWho' && (
          <>
            <h1 className="fw-setup-question">{question('harvestWho')}</h1>
            {renderChoices(
              [
                { id: 'self', titleKey: 'who.self' },
                { id: 'collaborator_or_family', titleKey: 'who.family' },
                { id: 'contractor', titleKey: 'who.contractor' },
                { id: 'no_fixed_way', titleKey: 'who.nofixed' },
                { id: 'unknown', titleKey: 'unsure' },
              ],
              (id) =>
                void saveAnswer({
                  harvest: { organizer: id, source: SOURCE },
                })
            )}
          </>
        )}

        {step === 'harvestMill' && (
          <>
            <h1 className="fw-setup-question">{question('harvestMill')}</h1>
            {renderChoices(
              [
                { id: 'yes', titleKey: 'yes' },
                { id: 'no', titleKey: 'no' },
                { id: 'unknown', titleKey: 'unsure' },
              ],
              (id) =>
                void saveAnswer({
                  harvest: { needsMillBooking: id, source: SOURCE },
                })
            )}
          </>
        )}

        {step === 'reminders' && (
          <>
            <h1 className="fw-setup-question">{question('reminders')}</h1>
            <p className="fw-setup-hint">{hint('reminders')}</p>
            {renderChoices(
              [
                { id: 'decisions_only', titleKey: 'reminders.decisions' },
                { id: 'decisions_and_upcoming', titleKey: 'reminders.upcoming' },
                { id: 'all_proposals', titleKey: 'reminders.all' },
                { id: 'configure_later', titleKey: 'reminders.later' },
                { id: 'unknown', titleKey: 'unsure' },
              ],
              (id) =>
                void saveAnswer(
                  {
                    notificationPreference: {
                      intensity: id,
                      acceptedTaskReminderDaysBefore: 3,
                    },
                  },
                  'planPreview'
                )
            )}
          </>
        )}

        {(step === 'finished' || step === 'planPreview') && (
          <>
            {planLoading && !planPreview ? (
              <LoadingSpinner />
            ) : planPreview ? (
              <FieldWorkPlanReview
                profile={profile}
                preview={planPreview}
                activating={activating}
                onChangeAnswer={jumpToPreference}
                onAccept={() => void acceptPlan()}
              />
            ) : null}
          </>
        )}

        {step === 'similarFields' && profile && fieldId ? (
          copyFromSimilar ? (
            <WorkProfileCopyWizard
              sourceFieldId={fieldId}
              profile={profile}
              onCancel={() => setCopyFromSimilar(false)}
              onDone={() => {
                setCopyFromSimilar(false);
                setStep('completion');
              }}
            />
          ) : (
            <>
              <h1 className="fw-setup-question">
                {t('tasks:fieldWork.profile.similar.title')}
              </h1>
              <p className="fw-setup-hint">{t('tasks:fieldWork.profile.similar.body')}</p>
              <div className="fw-setup-choices">
                <button
                  type="button"
                  className="fw-setup-choice"
                  onClick={() => setCopyFromSimilar(true)}
                >
                  <span className="fw-setup-choice-body">
                    <span className="fw-setup-choice-title">
                      {t('tasks:fieldWork.profile.similar.copy')}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="fw-setup-choice"
                  onClick={() => navigate('/fields')}
                >
                  <span className="fw-setup-choice-body">
                    <span className="fw-setup-choice-title">
                      {t('tasks:fieldWork.profile.similar.separate')}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="fw-setup-choice"
                  onClick={() => setStep('completion')}
                >
                  <span className="fw-setup-choice-body">
                    <span className="fw-setup-choice-title">
                      {t('tasks:fieldWork.profile.similar.later')}
                    </span>
                  </span>
                </button>
              </div>
            </>
          )
        ) : null}

        {step === 'completion' && (
          <>
            <h1 className="fw-setup-question">
              {t('tasks:fieldWork.onboarding.completion.title')}
            </h1>
            <p className="fw-setup-hint">{t('tasks:fieldWork.onboarding.completion.body')}</p>
            <div className="fw-setup-choices">
              <button
                type="button"
                className="fw-setup-choice"
                onClick={() => navigate('/chronologio')}
              >
                <span className="fw-setup-choice-body">
                  <span className="fw-setup-choice-title">
                    {t('tasks:fieldWork.onboarding.completion.openChronologio')}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="fw-setup-choice"
                onClick={() => navigate('/chronologio')}
              >
                <span className="fw-setup-choice-body">
                  <span className="fw-setup-choice-title">
                    {t('tasks:fieldWork.onboarding.completion.reviewProposal')}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="fw-setup-choice"
                onClick={() => navigate(`/fields/${fieldId}?tab=people`)}
              >
                <span className="fw-setup-choice-body">
                  <span className="fw-setup-choice-title">
                    {t('tasks:fieldWork.onboarding.completion.addCollaborator')}
                  </span>
                </span>
              </button>
            </div>
            <div className="fw-setup-actions">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate('/chronologio')}
              >
                {t('tasks:fieldWork.onboarding.completion.openChronologio')}
              </Button>
              <Button variant="ghost" size="lg" fullWidth onClick={exitToField}>
                {t('tasks:fieldWork.onboarding.completion.backToField')}
              </Button>
            </div>
          </>
        )}

        {step !== 'welcome' &&
        step !== 'finished' &&
        step !== 'planPreview' &&
        step !== 'similarFields' &&
        step !== 'completion' ? (
          <div className="fw-setup-actions">
            <Button variant="ghost" size="lg" onClick={goBack} disabled={saving}>
              {returnToPlanAfterSave
                ? t('tasks:fieldWork.onboarding.planPreview.backToPlan')
                : t('common:back', { defaultValue: 'Πίσω' })}
            </Button>
          </div>
        ) : null}

        {saving ? (
          <p className="fw-setup-status">{t('tasks:fieldWork.onboarding.saving')}</p>
        ) : null}
        {syncNote ? (
          <p className={`fw-setup-status${!isOnline ? ' is-offline' : ''}`}>{syncNote}</p>
        ) : null}
        </div>

        {error ? <p className="fw-setup-status is-error">{error}</p> : null}
        {!canOwn && field ? (
          <p className="fw-setup-status is-error">
            {t('tasks:fieldWork.onboarding.blocked.permissionBody')}
          </p>
        ) : null}
      </div>
    </PageContainer>
  );
};

export default FieldWorkSetupPage;
