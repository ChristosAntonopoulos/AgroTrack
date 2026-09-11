import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { getFieldWorkService } from '../services/serviceFactory';
import type {
  CompletionFrequencyChoice,
  FieldTask,
  FieldTaskChecklistItem,
  TaskExecution,
} from '../services/fieldWorkService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { shouldPromptCompletionFrequency } from '../utils/fieldWorkLearning';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import LearningPromptSheet from '../components/FieldWork/LearningPromptSheet';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import { useCaptureOptional } from '../context/CaptureContext';
import '../components/FieldWork/FieldWorkCards.css';

type Outcome = 'completed' | 'partially_completed' | 'not_done';
type Step = 'outcome' | 'checks' | 'cost' | 'confirm';

type CompletionDraft = {
  outcome: Outcome;
  notes: string;
  answers: Record<string, { boolValue?: boolean; textValue?: string; numberValue?: number }>;
  createFollowUp: boolean;
  hadCost: boolean | null;
};

const draftKey = (taskId: string) => `oleachron.fieldTaskCompletion.v1.${taskId}`;

const readDraft = (taskId: string): CompletionDraft | null => {
  try {
    const raw = localStorage.getItem(draftKey(taskId));
    return raw ? (JSON.parse(raw) as CompletionDraft) : null;
  } catch {
    return null;
  }
};

const checklistLabel = (item: FieldTaskChecklistItem, lang: string) => {
  if (lang.toLowerCase().startsWith('el')) return item.greekLabel || item.label;
  return item.englishLabel || item.label;
};

const TaskCompletionPage: React.FC = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const capture = useCaptureOptional();

  const [task, setTask] = useState<FieldTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<TaskExecution | null>(null);
  const [completionPrompt, setCompletionPrompt] = useState<{
    message: string;
    resultYear: number;
    suggestNextYear: number;
  } | null>(null);
  const completionDrawer = useDrawerPresence(completionPrompt);
  const [learningBusy, setLearningBusy] = useState(false);
  const [step, setStep] = useState<Step>('outcome');
  const [draft, setDraft] = useState<CompletionDraft>({
    outcome: 'completed',
    notes: '',
    answers: {},
    createFollowUp: true,
    hadCost: null,
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getFieldWorkService().getFieldTask(id);
        if (cancelled) return;
        setTask(data);
        const saved = readDraft(id);
        if (saved) {
          setDraft(saved);
        } else {
          const answers: CompletionDraft['answers'] = {};
          data.checklist.forEach((c) => {
            answers[c.key] = {
              boolValue: c.boolValue ?? (c.isAnswered ? true : undefined),
              textValue: c.textValue,
              numberValue: c.numberValue,
            };
          });
          setDraft({
            outcome: 'completed',
            notes: data.notes || '',
            answers,
            createFollowUp: true,
            hadCost: null,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) setError(getApiErrorMessage(err, t) || t('detail.failedLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  useEffect(() => {
    if (!id || loading) return;
    localStorage.setItem(draftKey(id), JSON.stringify(draft));
  }, [draft, id, loading]);

  const essential = useMemo(
    () =>
      (task?.checklist || [])
        .filter((c) => c.isEssential)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 5),
    [task]
  );

  const extra = useMemo(
    () =>
      (task?.checklist || []).filter((c) => !essential.some((e) => e.key === c.key)),
    [task, essential]
  );

  const [showMore, setShowMore] = useState(false);

  const submit = async () => {
    if (!id || !task) return;
    setBusy(true);
    setError(null);
    try {
      const execution = await getFieldWorkService().completeFieldTask(id, {
        outcome: draft.outcome,
        notes: draft.notes || undefined,
        createFollowUpForRemainder: draft.outcome === 'partially_completed' && draft.createFollowUp,
        checklistAnswers: Object.entries(draft.answers).map(([key, value]) => ({
          key,
          ...value,
        })),
      });
      localStorage.removeItem(draftKey(id));
      setUndoToast(execution);
      if (
        shouldPromptCompletionFrequency(task.templateCode, draft.outcome) &&
        task.templateCode
      ) {
        try {
          const evalResult = await getFieldWorkService().evaluateCompletionLearning(task.fieldId, {
            templateCode: task.templateCode,
            outcome: draft.outcome,
            resultYear: task.resultYear,
          });
          if (evalResult.shouldPrompt) {
            setCompletionPrompt({
              message:
                evalResult.promptMessage ||
                t('fieldWork.profile.learning.completionMessage', {
                  year: evalResult.resultYear,
                  nextYear: evalResult.suggestNextYear,
                }),
              resultYear: evalResult.resultYear,
              suggestNextYear: evalResult.suggestNextYear,
            });
          }
        } catch {
          // Optional learning prompt.
        }
      }
      if (draft.hadCost) {
        capture?.openCapture({
          preferredType: 'expense',
          fieldId: task.fieldId,
          taskId: task.id,
        });
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.complete'));
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    setBusy(true);
    try {
      await getFieldWorkService().undoCompletion(undoToast.id);
      setUndoToast(null);
      setCompletionPrompt(null);
      navigate(`/tasks/${id}`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.completion.undoFailed'));
    } finally {
      setBusy(false);
    }
  };

  const applyCompletionLearning = async (choice: CompletionFrequencyChoice) => {
    if (!task?.templateCode || !completionPrompt) return;
    try {
      setLearningBusy(true);
      await getFieldWorkService().applyCompletionLearning(task.fieldId, {
        templateCode: task.templateCode,
        resultYear: completionPrompt.resultYear,
        choice,
      });
      setCompletionPrompt(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.profile.learning.applyFailed'));
    } finally {
      setLearningBusy(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <p className="fw-empty">{error || t('detail.notFound')}</p>
        <Button to="/tasks" icon={<ArrowLeft />} variant="outline" size="lg">
          {t('detail.backToTasks')}
        </Button>
      </PageContainer>
    );
  }

  if (undoToast) {
    return (
      <PageContainer maxWidth="md">
        <Breadcrumbs />
        <div className="fw-detail-sections">
          <h1>{t('fieldWork.completion.savedTitle')}</h1>
          <p className="tasks-subtitle">{t('fieldWork.completion.savedBody')}</p>
          {undoToast.followUpTaskId && (
            <p>
              <Button to={`/tasks/${undoToast.followUpTaskId}`} variant="outline" size="lg">
                {t('fieldWork.completion.openFollowUp')}
              </Button>
            </p>
          )}
          {draft.hadCost && (
            <p>
              <Button
                variant="primary"
                size="lg"
                onClick={() =>
                  capture?.openCapture({
                    preferredType: 'expense',
                    fieldId: task.fieldId,
                    taskId: task.id,
                  })
                }
              >
                {t('fieldWork.completion.recordCost')}
              </Button>
            </p>
          )}
          <div className="fw-card-actions">
            <Button variant="outline" size="lg" onClick={() => void handleUndo()} disabled={busy}>
              {t('fieldWork.completion.undo')}
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/chronologio')}
              disabled={busy}
            >
              {t('fieldWork.seeCompletedInChronologio')}
            </Button>
            <Button to="/tasks" variant="ghost" size="lg">
              {t('detail.backToTasks')}
            </Button>
          </div>
        </div>
        {completionDrawer.mounted && completionDrawer.value ? (
          <LearningPromptSheet
            open={completionDrawer.open}
            title={t('fieldWork.profile.learning.completionTitle')}
            message={completionDrawer.value.message}
            busy={learningBusy}
            onClose={() => setCompletionPrompt(null)}
            onAction={(actionId) => void applyCompletionLearning(actionId as CompletionFrequencyChoice)}
            actions={[
              { id: 'every_2_years', label: t('fieldWork.profile.learning.everyTwoYears') },
              { id: 'every_year', label: t('fieldWork.profile.learning.everyYear') },
              { id: 'when_needed', label: t('fieldWork.profile.learning.whenNeeded') },
              {
                id: 'no_change',
                label: t('fieldWork.profile.learning.noChange'),
                variant: 'outline',
              },
            ]}
          />
        ) : null}
      </PageContainer>
    );
  }

  const renderChecks = (items: FieldTaskChecklistItem[]) => (
    <ul className="fw-checklist">
      {items.map((item) => {
        const answer = draft.answers[item.key] || {};
        return (
          <li key={item.key}>
            <input
              type="checkbox"
              checked={Boolean(answer.boolValue)}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  answers: {
                    ...prev.answers,
                    [item.key]: { ...prev.answers[item.key], boolValue: e.target.checked },
                  },
                }))
              }
            />
            <span>{checklistLabel(item, i18n.language)}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <PageContainer maxWidth="md">
      <Breadcrumbs />
      <div className="fw-detail-sections">
        <header className="tasks-page-header">
          <div className="tasks-page-header-text">
            <h1>{t('fieldWork.completion.title')}</h1>
            <p className="tasks-subtitle">{task.title}</p>
          </div>
          <Button to={`/tasks/${task.id}`} icon={<ArrowLeft />} variant="outline" size="lg">
            {t('common:back')}
          </Button>
        </header>

        {error && <div className="tasks-error">{error}</div>}

        <p className="fw-card-status">
          {t('fieldWork.completion.step', {
            current: step === 'outcome' ? 1 : step === 'checks' ? 2 : step === 'cost' ? 3 : 4,
            total: 4,
          })}
        </p>

        {step === 'outcome' && (
          <section className="fw-detail-section">
            <h2>{t('fieldWork.completion.whatHappened')}</h2>
            <div className="fw-card-actions" style={{ flexDirection: 'column' }}>
              {(
                [
                  ['completed', 'completed'],
                  ['partially_completed', 'partial'],
                  ['not_done', 'notDone'],
                ] as const
              ).map(([value, key]) => (
                <Button
                  key={value}
                  size="lg"
                  variant={draft.outcome === value ? 'primary' : 'outline'}
                  onClick={() => setDraft((prev) => ({ ...prev, outcome: value }))}
                  fullWidth
                >
                  {t(`fieldWork.completion.outcomes.${key}`)}
                </Button>
              ))}
            </div>
            <Button
              variant="primary"
              size="lg"
              className="fw-primary-action"
              onClick={() => setStep('checks')}
              fullWidth
            >
              {t('common:next')}
            </Button>
          </section>
        )}

        {step === 'checks' && (
          <section className="fw-detail-section">
            <h2>{t('fieldWork.detail.checklist')}</h2>
            {renderChecks(essential)}
            {extra.length > 0 && (
              <>
                <button
                  type="button"
                  className="fw-advanced-toggle"
                  onClick={() => setShowMore((v) => !v)}
                >
                  {showMore
                    ? t('fieldWork.detail.hideMoreChecks')
                    : t('fieldWork.detail.moreChecks')}
                </button>
                {showMore && renderChecks(extra)}
              </>
            )}
            <div className="fw-form-row">
              <label htmlFor="fw-complete-notes">{t('fieldWork.form.notes')}</label>
              <textarea
                id="fw-complete-notes"
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            {draft.outcome === 'partially_completed' && (
              <label className="fw-form-row">
                <span>
                  <input
                    type="checkbox"
                    checked={draft.createFollowUp}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, createFollowUp: e.target.checked }))
                    }
                  />{' '}
                  {t('fieldWork.completion.createFollowUp')}
                </span>
              </label>
            )}
            <div className="fw-card-actions">
              <Button variant="outline" size="lg" onClick={() => setStep('outcome')}>
                {t('common:back')}
              </Button>
              <Button variant="primary" size="lg" onClick={() => setStep('cost')}>
                {t('common:next')}
              </Button>
            </div>
          </section>
        )}

        {step === 'cost' && (
          <section className="fw-detail-section">
            <h2>{t('fieldWork.completion.hadCost')}</h2>
            <p className="tasks-subtitle">{t('fieldWork.completion.hadCostHint')}</p>
            <div className="fw-card-actions" style={{ flexDirection: 'column' }}>
              <Button
                size="lg"
                variant={draft.hadCost === true ? 'primary' : 'outline'}
                onClick={() => setDraft((prev) => ({ ...prev, hadCost: true }))}
                fullWidth
              >
                {t('fieldWork.completion.hadCostYes')}
              </Button>
              <Button
                size="lg"
                variant={draft.hadCost === false ? 'primary' : 'outline'}
                onClick={() => setDraft((prev) => ({ ...prev, hadCost: false }))}
                fullWidth
              >
                {t('fieldWork.completion.hadCostNo')}
              </Button>
            </div>
            <div className="fw-card-actions">
              <Button variant="outline" size="lg" onClick={() => setStep('checks')}>
                {t('common:back')}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setStep('confirm')}
                disabled={draft.hadCost === null}
              >
                {t('common:next')}
              </Button>
            </div>
          </section>
        )}

        {step === 'confirm' && (
          <section className="fw-detail-section">
            <h2>{t('fieldWork.completion.confirm')}</h2>
            <p>
              {t(`fieldWork.completion.outcomes.${
                draft.outcome === 'partially_completed'
                  ? 'partial'
                  : draft.outcome === 'not_done'
                    ? 'notDone'
                    : 'completed'
              }`)}
            </p>
            {draft.notes && <p>{draft.notes}</p>}
            <p>
              {draft.hadCost
                ? t('fieldWork.completion.hadCostYes')
                : t('fieldWork.completion.hadCostNo')}
            </p>
            <div className="fw-sticky-complete">
              <div className="fw-card-actions">
                <Button variant="outline" size="lg" onClick={() => setStep('cost')} disabled={busy}>
                  {t('common:back')}
                </Button>
                <Button
                  variant="success"
                  size="lg"
                  onClick={() => void submit()}
                  disabled={busy}
                  loading={busy}
                >
                  {t('fieldWork.completion.save')}
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
};

export default TaskCompletionPage;
