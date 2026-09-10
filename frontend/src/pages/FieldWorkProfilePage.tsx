import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import OnboardingChoiceList from '../components/FieldWork/OnboardingChoiceList';
import DefaultAssignmentsEditor from '../components/FieldWork/DefaultAssignmentsEditor';
import WorkProfileCopyWizard from '../components/FieldWork/WorkProfileCopyWizard';
import { useAuth } from '../context/AuthContext';
import { useFieldCapacity } from '../hooks/useFieldCapacity';
import { fieldPeopleService, type FieldMembership } from '../services/fieldPeopleService';
import { getFieldService, getFieldWorkService } from '../services/serviceFactory';
import type { Field } from '../services/fieldService';
import type {
  DefaultAssignments,
  FieldWorkLearningStatus,
  FieldWorkProfile,
  UpdateFieldWorkProfileInput,
} from '../services/fieldWorkService';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { getApiErrorMessage } from '../utils/translateApiError';
import { shouldShowDefaultAssignments } from '../utils/fieldWorkDefaultAssignments';
import '../components/FieldWork/LearningPromptSheet.css';
import './FieldWorkSetupPage.css';
import './FieldWorkProfilePage.css';

type EditSection =
  | 'purpose'
  | 'irrigation'
  | 'pruning'
  | 'fertilisation'
  | 'groundCover'
  | 'pest'
  | 'harvest'
  | null;

const SOURCE = 'user_declared_during_onboarding';

const FieldWorkProfilePage: React.FC = () => {
  const { t } = useTranslation(['tasks', 'fields', 'common']);
  const { id: fieldId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [field, setField] = useState<Field | null>(null);
  const [profile, setProfile] = useState<FieldWorkProfile | null>(null);
  const [people, setPeople] = useState<FieldMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);
  const [learningStatus, setLearningStatus] = useState<FieldWorkLearningStatus | null>(null);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

  const capacity = useFieldCapacity(field);
  const canEdit = capacity.canOwn || field?.ownerId === user?.userId;

  const load = useCallback(async () => {
    if (!fieldId) return;
    try {
      setLoading(true);
      setError(null);
      const fieldData = await getFieldService().getField(fieldId);
      setField(fieldData);
      const workProfile = await getFieldWorkService().getWorkProfile(fieldId);
      if (!workProfile) {
        navigate(`/fields/${fieldId}/work-setup`, { replace: true });
        return;
      }
      if (workProfile.status === 'draft') {
        navigate(`/fields/${fieldId}/work-setup`, { replace: true });
        return;
      }
      setProfile(workProfile);
      try {
        const members = await fieldPeopleService.getPeople(fieldId);
        setPeople(members);
      } catch {
        setPeople([]);
      }
      try {
        const status = await getFieldWorkService().getLearningStatus(fieldId);
        setLearningStatus(status);
      } catch {
        setLearningStatus(null);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:fieldWork.profile.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [fieldId, navigate, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePatch = async (patch: UpdateFieldWorkProfileInput) => {
    if (!fieldId || !canEdit) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await getFieldWorkService().updateWorkProfile(fieldId, patch);
      setProfile(updated);
      setEditSection(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:fieldWork.profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const saveAssignments = async (next: DefaultAssignments) => {
    await savePatch({ defaultAssignments: next });
  };

  const markReviewed = async () => {
    if (!fieldId || !canEdit) return;
    try {
      setReviewBusy(true);
      const updated = await getFieldWorkService().markWorkProfileReviewed(fieldId);
      setProfile(updated);
      setLearningStatus((prev) =>
        prev
          ? { ...prev, annualReviewDue: false, lastReviewedAt: updated.lastReviewedAt }
          : prev
      );
      setReviewDismissed(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('tasks:fieldWork.profile.learning.applyFailed'));
    } finally {
      setReviewBusy(false);
    }
  };

  const prefLabel = (mode: string) =>
    t(`tasks:fieldWork.profile.pref.${mode}`, {
      defaultValue: mode,
    });

  if (loading) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (!field || !profile || !fieldId) {
    return (
      <PageContainer>
        <p className="fw-setup-status is-error">{error || t('tasks:fieldWork.profile.loadFailed')}</p>
        <Button to="/fields" icon={<ArrowLeft />} variant="outline">
          {t('fields:controlRoom.backToFields', { defaultValue: 'Πίσω' })}
        </Button>
      </PageContainer>
    );
  }

  if (showCopy) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <div className="fw-setup">
          <WorkProfileCopyWizard
            sourceFieldId={fieldId}
            profile={profile}
            onCancel={() => setShowCopy(false)}
            onDone={() => {
              setShowCopy(false);
              void load();
            }}
          />
        </div>
      </PageContainer>
    );
  }

  const rows: Array<{
    key: EditSection;
    title: string;
    summary: string;
  }> = [
    {
      key: 'purpose',
      title: t('tasks:fieldWork.profile.sections.purpose'),
      summary: profile.productionPurposeLabel || prefLabel(profile.productionPurpose),
    },
    {
      key: 'irrigation',
      title: t('tasks:fieldWork.profile.categories.irrigation'),
      summary: profile.irrigation.preferenceModeLabel || prefLabel(profile.irrigation.preferenceMode),
    },
    {
      key: 'pruning',
      title: t('tasks:fieldWork.profile.categories.pruning'),
      summary: profile.pruning.preferenceModeLabel || prefLabel(profile.pruning.preferenceMode),
    },
    {
      key: 'fertilisation',
      title: t('tasks:fieldWork.profile.categories.fertilisation'),
      summary:
        profile.fertilisation.preferenceModeLabel ||
        prefLabel(profile.fertilisation.preferenceMode),
    },
    {
      key: 'groundCover',
      title: t('tasks:fieldWork.profile.categories.ground_cover'),
      summary:
        profile.groundCover.preferenceModeLabel || prefLabel(profile.groundCover.preferenceMode),
    },
    {
      key: 'pest',
      title: t('tasks:fieldWork.profile.categories.monitoring'),
      summary:
        profile.pestManagement.preferenceModeLabel ||
        prefLabel(profile.pestManagement.preferenceMode),
    },
    {
      key: 'harvest',
      title: t('tasks:fieldWork.profile.categories.harvest'),
      summary: profile.harvest.preferenceModeLabel || prefLabel(profile.harvest.preferenceMode),
    },
  ];

  const showDefaults = shouldShowDefaultAssignments(
    profile.defaultAssignments,
    people.some((p) => p.userId !== user?.userId && p.status === 'active')
  );

  return (
    <PageContainer>
      <Breadcrumbs />
      <div className="fw-setup fw-profile">
        <button
          type="button"
          className="fw-setup-exit"
          onClick={() => navigate(`/fields/${fieldId}`)}
        >
          {t('tasks:fieldWork.onboarding.exit')}
        </button>

        <h1 className="fw-setup-question">{t('tasks:fieldWork.profile.title')}</h1>
        <p className="fw-setup-field-meta">{friendlyFieldLabel(field.name)}</p>
        <p className="fw-setup-hint">{t('tasks:fieldWork.profile.subtitle')}</p>

        {learningStatus?.annualReviewDue && !reviewDismissed && canEdit ? (
          <div className="fw-learning-banner" role="status">
            <strong>{t('tasks:fieldWork.profile.learning.reviewTitle')}</strong>
            <p>{t('tasks:fieldWork.profile.learning.reviewBody')}</p>
            <div className="fw-learning-banner-actions">
              <button
                type="button"
                className="is-primary"
                disabled={reviewBusy}
                onClick={() => void markReviewed()}
              >
                {t('tasks:fieldWork.profile.learning.reviewNow')}
              </button>
              <button
                type="button"
                className="is-ghost"
                disabled={reviewBusy}
                onClick={() => setReviewDismissed(true)}
              >
                {t('tasks:fieldWork.profile.learning.reviewLater')}
              </button>
            </div>
          </div>
        ) : null}

        {!canEdit ? (
          <p className="fw-setup-status is-error">
            {t('tasks:fieldWork.onboarding.blocked.permissionBody')}
          </p>
        ) : null}

        <ul className="fw-profile-list">
          {rows.map((row) => (
            <li key={row.key!} className="fw-profile-row">
              <div className="fw-profile-row-text">
                <strong>{row.title}</strong>
                <span>{row.summary}</span>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  className="fw-profile-change"
                  onClick={() => setEditSection(row.key)}
                >
                  {t('tasks:fieldWork.profile.change')}
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {showDefaults || (profile.defaultAssignments.entries?.length ?? 0) > 0 ? (
          <section className="fw-profile-section">
            <div className="fw-profile-row">
              <div className="fw-profile-row-text">
                <strong>{t('tasks:fieldWork.profile.assignments.title')}</strong>
                <span>{t('tasks:fieldWork.profile.assignments.summary')}</span>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  className="fw-profile-change"
                  onClick={() => setShowAssignments((v) => !v)}
                >
                  {t('tasks:fieldWork.profile.change')}
                </button>
              ) : null}
            </div>
            {showAssignments && canEdit ? (
              <DefaultAssignmentsEditor
                value={profile.defaultAssignments}
                people={people}
                currentUserId={user?.userId}
                disabled={saving}
                onChange={(next) => {
                  void saveAssignments(next);
                }}
              />
            ) : null}
          </section>
        ) : canEdit ? (
          <section className="fw-profile-section">
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={() => setShowAssignments(true)}
            >
              {t('tasks:fieldWork.profile.assignments.add')}
            </Button>
            {showAssignments ? (
              <DefaultAssignmentsEditor
                value={profile.defaultAssignments}
                people={people}
                currentUserId={user?.userId}
                disabled={saving}
                onChange={(next) => {
                  void saveAssignments(next);
                }}
              />
            ) : null}
          </section>
        ) : null}

        {canEdit ? (
          <div className="fw-setup-actions" style={{ marginTop: '1.5rem' }}>
            <Button variant="primary" size="lg" fullWidth onClick={() => setShowCopy(true)}>
              {t('tasks:fieldWork.profile.copy.open')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onClick={() => navigate(`/fields/${fieldId}/work-setup?edit=1`)}
            >
              {t('tasks:fieldWork.profile.revisitSetup')}
            </Button>
          </div>
        ) : null}

        {editSection ? (
          <div className="fw-profile-panel" role="dialog" aria-modal="true">
            <h2 className="fw-setup-question">
              {rows.find((r) => r.key === editSection)?.title}
            </h2>
            {editSection === 'purpose' ? (
              <OnboardingChoiceList
                onSelect={(id) => {
                  const map: Record<string, string> = {
                    oil: 'olive_oil',
                    table: 'table_olives',
                    both: 'both',
                  };
                  void savePatch({ productionPurpose: map[id] || id, });
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
                onSelect={(id) => {
                  const mode =
                    id === 'yes' ? 'enabled' : id === 'no' ? 'disabled' : 'ask_first';
                  void savePatch({
                    irrigation: { preferenceMode: mode, source: SOURCE },
                  });
                }}
                choices={[
                  {
                    id: 'yes',
                    title: t('tasks:fieldWork.onboarding.choices.irrigation.yes'),
                  },
                  {
                    id: 'no',
                    title: t('tasks:fieldWork.onboarding.choices.irrigation.no'),
                  },
                  {
                    id: 'ask',
                    title: t('tasks:fieldWork.onboarding.choices.irrigation.ask'),
                  },
                ]}
              />
            ) : null}
            {editSection === 'pruning' ||
            editSection === 'fertilisation' ||
            editSection === 'groundCover' ||
            editSection === 'harvest' ? (
              <OnboardingChoiceList
                onSelect={(id) => {
                  const mode =
                    id === 'yes' ? 'enabled' : id === 'no' ? 'disabled' : 'ask_first';
                  const practice = { preferenceMode: mode, source: SOURCE };
                  if (editSection === 'pruning') void savePatch({ pruning: practice });
                  if (editSection === 'fertilisation')
                    void savePatch({ fertilisation: practice });
                  if (editSection === 'groundCover') void savePatch({ groundCover: practice });
                  if (editSection === 'harvest') void savePatch({ harvest: practice });
                }}
                choices={[
                  { id: 'yes', title: t('tasks:fieldWork.onboarding.choices.yes') },
                  { id: 'no', title: t('tasks:fieldWork.onboarding.choices.no') },
                  {
                    id: 'ask',
                    title: t('tasks:fieldWork.onboarding.choices.unsure'),
                  },
                ]}
              />
            ) : null}
            {editSection === 'pest' ? (
              <OnboardingChoiceList
                onSelect={(id) => {
                  void savePatch({
                    pestManagement: {
                      preferenceMode:
                        id === 'no_usual_treatments' ? 'disabled' : 'enabled',
                      decisionApproach: id,
                      source: SOURCE,
                    },
                  });
                }}
                choices={[
                  {
                    id: 'official_warnings',
                    title: t('tasks:fieldWork.onboarding.choices.pest.official'),
                  },
                  {
                    id: 'agronomist',
                    title: t('tasks:fieldWork.onboarding.choices.pest.agronomist'),
                  },
                  {
                    id: 'trap_and_fruit_checks',
                    title: t('tasks:fieldWork.onboarding.choices.pest.traps'),
                  },
                  {
                    id: 'combined',
                    title: t('tasks:fieldWork.onboarding.choices.pest.combined'),
                  },
                  {
                    id: 'no_usual_treatments',
                    title: t('tasks:fieldWork.onboarding.choices.pest.none'),
                  },
                ]}
              />
            ) : null}
            <Button variant="ghost" size="lg" fullWidth onClick={() => setEditSection(null)}>
              {t('common:cancel', { defaultValue: 'Άκυρο' })}
            </Button>
            {saving ? (
              <p className="fw-setup-status">{t('tasks:fieldWork.onboarding.saving')}</p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="fw-setup-status is-error">{error}</p> : null}
      </div>
    </PageContainer>
  );
};

export default FieldWorkProfilePage;
