import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { getFieldService, getFieldWorkService } from '../services/serviceFactory';
import type {
  CompletionFrequencyChoice,
  FieldTask,
  FieldTaskChecklistItem,
  TaskExecution,
} from '../services/fieldWorkService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { shouldPromptCompletionFrequency } from '../utils/fieldWorkLearning';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatTaskDay } from '../utils/taskDateRange';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import LearningPromptSheet from '../components/FieldWork/LearningPromptSheet';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import { useCaptureOptional } from '../context/CaptureContext';
import './TaskCompletionPage.css';

type Outcome = 'completed' | 'partially_completed' | 'not_done';
type Step = 'checks' | 'result' | 'cost' | 'confirm';
type CheckDisposition = 'done' | 'not_needed' | 'could_not';

type AnswerDraft = {
  boolValue?: boolean;
  textValue?: string;
  numberValue?: number;
};

type CompletionDraft = {
  outcome: Outcome;
  notes: string;
  answers: Record<string, AnswerDraft>;
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

const itemType = (item: FieldTaskChecklistItem) => String(item.itemType || 'checkbox').toLowerCase();

const isBooleanCheck = (item: FieldTaskChecklistItem) => {
  const type = itemType(item);
  return type === 'checkbox' || type === 'confirmation';
};

const isResultField = (item: FieldTaskChecklistItem) => {
  const type = itemType(item);
  return type === 'number' || type === 'quantity_with_unit' || type === 'text' || type === 'choice';
};

const isDateLike = (item: FieldTaskChecklistItem) => {
  const key = item.key.toLowerCase();
  return /date|start|end|next_check|install/.test(key) && itemType(item) === 'text';
};

const dispositionOf = (answer?: AnswerDraft): CheckDisposition | null => {
  if (!answer) return null;
  if (answer.boolValue === true) return 'done';
  if (answer.textValue === 'not_needed') return 'not_needed';
  if (answer.textValue === 'could_not') return 'could_not';
  if (answer.boolValue === false) return 'could_not';
  return null;
};

const choiceOptions = (item: FieldTaskChecklistItem, lang: string): string[] => {
  if (item.choices?.length) return item.choices;
  if (item.key === 'output') {
    return lang.toLowerCase().startsWith('el')
      ? ['Λάδι', 'Επιτραπέζιες']
      : ['Oil', 'Table olives'];
  }
  const label = checklistLabel(item, lang);
  const colon = label.includes(':') ? label.split(':').slice(1).join(':').trim() : label;
  const parts = colon
    .split(/\s*(?:[/|·]|\s(?:ή|or|o)\s)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part.length < 40);
  return parts.length >= 2 ? parts : [];
};

const TaskCompletionPage: React.FC = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const capture = useCaptureOptional();

  const [task, setTask] = useState<FieldTask | null>(null);
  const [fieldName, setFieldName] = useState('');
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
  const [step, setStep] = useState<Step>('checks');
  const [showOptional, setShowOptional] = useState(false);
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
        const fields = await getFieldService()
          .getFields()
          .catch(() => []);
        if (!cancelled) {
          const field = fields.find((f) => f.id === data.fieldId);
          setFieldName(friendlyFieldLabel(field?.name) || data.fieldId);
        }
        const saved = readDraft(id);
        if (saved) {
          setDraft(saved);
        } else {
          const answers: CompletionDraft['answers'] = {};
          data.checklist.forEach((c) => {
            answers[c.key] = {
              boolValue: c.boolValue,
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
        const hasChecks = data.checklist.some(isBooleanCheck);
        setStep(hasChecks ? 'checks' : 'result');
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

  const booleanChecks = useMemo(
    () =>
      (task?.checklist || [])
        .filter(isBooleanCheck)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [task]
  );

  const resultFields = useMemo(
    () =>
      (task?.checklist || [])
        .filter(isResultField)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [task]
  );

  const essentialResults = resultFields.filter((item) => item.isEssential);
  const optionalResults = resultFields.filter((item) => !item.isEssential);
  const essentialChecks = booleanChecks.filter((item) => item.isEssential);
  const optionalChecks = booleanChecks.filter((item) => !item.isEssential);

  const steps = useMemo((): Step[] => {
    const list: Step[] = [];
    if (booleanChecks.length > 0) list.push('checks');
    list.push('result', 'cost', 'confirm');
    return list;
  }, [booleanChecks.length]);

  const stepIndex = Math.max(0, steps.indexOf(step));
  const stepLabels: Record<Step, string> = {
    checks: t('fieldWork.completion.steps.checks'),
    result: t('fieldWork.completion.steps.result'),
    cost: t('fieldWork.completion.steps.cost'),
    confirm: t('fieldWork.completion.steps.confirm'),
  };

  const unansweredEssentialChecks = essentialChecks.filter((item) => !dispositionOf(draft.answers[item.key]));
  const missingEssentialResults = essentialResults.filter((item) => {
    const answer = draft.answers[item.key] || {};
    const type = itemType(item);
    if (type === 'number' || type === 'quantity_with_unit') {
      return answer.numberValue === undefined || Number.isNaN(answer.numberValue);
    }
    return !(answer.textValue || '').trim();
  });

  const setAnswer = (key: string, patch: AnswerDraft) => {
    setDraft((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [key]: { ...prev.answers[key], ...patch },
      },
    }));
  };

  const setDisposition = (key: string, disposition: CheckDisposition) => {
    if (disposition === 'done') {
      setAnswer(key, { boolValue: true, textValue: undefined });
      return;
    }
    setAnswer(key, {
      boolValue: false,
      textValue: disposition === 'not_needed' ? 'not_needed' : 'could_not',
    });
  };

  const goNext = () => {
    const next = steps[stepIndex + 1];
    if (next) setStep(next);
  };

  const goBack = () => {
    const prev = steps[stepIndex - 1];
    if (prev) setStep(prev);
    else if (task) navigate(`/tasks/${task.id}`);
  };

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

  const renderResultField = (item: FieldTaskChecklistItem) => {
    const answer = draft.answers[item.key] || {};
    const type = itemType(item);
    const label = checklistLabel(item, i18n.language);
    const options = choiceOptions(item, i18n.language);

    if (type === 'choice' && options.length > 0) {
      return (
        <div key={item.key} className="task-complete-field">
          <label id={`result-${item.key}`}>{label}</label>
          <div className="task-complete-choices" role="group" aria-labelledby={`result-${item.key}`}>
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className={`task-complete-choice${answer.textValue === option ? ' is-selected' : ''}`}
                onClick={() => setAnswer(item.key, { textValue: option, boolValue: true })}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'number' || type === 'quantity_with_unit') {
      return (
        <div key={item.key} className="task-complete-field">
          <label htmlFor={`result-${item.key}`}>{label}</label>
          <div className="task-complete-unit">
            <input
              id={`result-${item.key}`}
              className="task-complete-input"
              type="number"
              inputMode="decimal"
              value={answer.numberValue ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                setAnswer(item.key, {
                  numberValue: raw === '' ? undefined : Number(raw),
                  boolValue: raw !== '',
                });
              }}
            />
            {item.unit ||
            type === 'quantity_with_unit' ||
            /kg|kilo|κιλά/i.test(item.key + checklistLabel(item, i18n.language)) ? (
              <span className="task-complete-unit-label">{item.unit || 'kg'}</span>
            ) : null}
          </div>
        </div>
      );
    }

    if (isDateLike(item)) {
      return (
        <div key={item.key} className="task-complete-field">
          <label htmlFor={`result-${item.key}`}>{label}</label>
          <input
            id={`result-${item.key}`}
            className="task-complete-input"
            type="date"
            value={answer.textValue || ''}
            onChange={(e) =>
              setAnswer(item.key, { textValue: e.target.value, boolValue: Boolean(e.target.value) })
            }
          />
        </div>
      );
    }

    return (
      <div key={item.key} className="task-complete-field">
        <label htmlFor={`result-${item.key}`}>{label}</label>
        <input
          id={`result-${item.key}`}
          className="task-complete-input"
          type="text"
          value={answer.textValue || ''}
          onChange={(e) =>
            setAnswer(item.key, { textValue: e.target.value, boolValue: Boolean(e.target.value.trim()) })
          }
        />
      </div>
    );
  };

  const renderCheckList = (items: FieldTaskChecklistItem[]) => (
    <ul className="task-complete-checks">
      {items.map((item) => {
        const disposition = dispositionOf(draft.answers[item.key]);
        return (
          <li key={item.key} className="task-complete-check">
            <p className="task-complete-check-title">
              {checklistLabel(item, i18n.language)}
              {item.isEssential ? (
                <span className="req">{t('fieldWork.completion.required')}</span>
              ) : null}
            </p>
            <div className="task-complete-triad" role="group">
              {(
                [
                  ['done', 'done'],
                  ['not_needed', 'notNeeded'],
                  ['could_not', 'couldNot'],
                ] as const
              ).map(([value, key]) => (
                <button
                  key={value}
                  type="button"
                  className={`${disposition === value ? 'is-selected' : ''}${
                    value === 'could_not' && disposition === value ? ' is-warn' : ''
                  }`}
                  onClick={() => setDisposition(item.key, value)}
                >
                  {t(`fieldWork.completion.check.${key}`)}
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );

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
        <p className="task-complete-lead">{error || t('detail.notFound')}</p>
        <Button to="/tasks" icon={<ArrowLeft />} variant="outline" size="lg">
          {t('detail.backToTasks')}
        </Button>
      </PageContainer>
    );
  }

  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const whenLabel = formatTaskDay(
    task.plannedStart || task.startedAt || new Date().toISOString(),
    i18n.language,
    task.resultYear
  );

  if (undoToast) {
    return (
      <PageContainer maxWidth="md">
        <Breadcrumbs />
        <div className="task-complete-page">
          <div className="task-complete-success">
            <p className="task-complete-kicker">{t('fieldWork.completion.title')}</p>
            <h1>{t('fieldWork.completion.savedTitle')}</h1>
            <p>{t('fieldWork.completion.savedBody')}</p>
            <div className="task-complete-success-actions">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/chronologio')}
                disabled={busy}
              >
                {t('fieldWork.seeCompletedInChronologio')}
              </Button>
              {undoToast.followUpTaskId ? (
                <Button to={`/tasks/${undoToast.followUpTaskId}`} variant="outline" size="lg">
                  {t('fieldWork.completion.openFollowUp')}
                </Button>
              ) : null}
              {draft.hadCost ? (
                <Button
                  variant="outline"
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
              ) : null}
              <Button variant="ghost" size="lg" onClick={() => void handleUndo()} disabled={busy}>
                {t('fieldWork.completion.undo')}
              </Button>
              <Button to="/tasks" variant="ghost" size="lg">
                {t('detail.backToTasks')}
              </Button>
            </div>
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

  return (
    <PageContainer maxWidth="md">
      <Breadcrumbs />
      <div className="task-complete-page">
        <header className="task-complete-header">
          <p className="task-complete-kicker">{t('fieldWork.completion.title')}</p>
          <h1>{title}</h1>
          <p className="task-complete-meta">
            {fieldName}
            {whenLabel ? ` · ${whenLabel}` : ''}
          </p>
        </header>

        {error ? (
          <div className="task-form-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="task-complete-card">
          <div className="task-complete-steps" aria-label={t('fieldWork.completion.step', {
            current: stepIndex + 1,
            total: steps.length,
          })}>
            {steps.map((idStep, index) => (
              <span
                key={idStep}
                className={`task-complete-step-pill${index === stepIndex ? ' is-active' : ''}${
                  index < stepIndex ? ' is-done' : ''
                }`}
              >
                <span className="n">{index + 1}</span>
                {stepLabels[idStep]}
              </span>
            ))}
          </div>

          {step === 'checks' ? (
            <>
              <div>
                <h2>{t('fieldWork.completion.checksTitle')}</h2>
                <p className="task-complete-lead">{t('fieldWork.completion.incompleteOnly')}</p>
              </div>
              {renderCheckList(essentialChecks)}
              {optionalChecks.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="task-complete-more"
                    onClick={() => setShowOptional((v) => !v)}
                  >
                    {showOptional
                      ? t('fieldWork.detail.hideMoreChecks')
                      : t('fieldWork.detail.moreChecks')}
                  </button>
                  {showOptional ? renderCheckList(optionalChecks) : null}
                </>
              ) : null}
              {unansweredEssentialChecks.length > 0 ? (
                <p className="task-complete-block" role="status">
                  {t('fieldWork.completion.blockEssential', {
                    count: unansweredEssentialChecks.length,
                  })}
                </p>
              ) : null}
            </>
          ) : null}

          {step === 'result' ? (
            <>
              <div>
                <h2>{t('fieldWork.completion.resultTitle')}</h2>
                <p className="task-complete-lead">{t('fieldWork.completion.resultLead')}</p>
              </div>
              <div className="task-complete-fields">
                {essentialResults.map(renderResultField)}
                {optionalResults.length > 0 ? (
                  <>
                    <button
                      type="button"
                      className="task-complete-more"
                      onClick={() => setShowOptional((v) => !v)}
                    >
                      {showOptional
                        ? t('fieldWork.completion.hideOptional')
                        : t('fieldWork.completion.showOptional', { count: optionalResults.length })}
                    </button>
                    {showOptional ? optionalResults.map(renderResultField) : null}
                  </>
                ) : null}
                {resultFields.length === 0 ? (
                  <div className="task-complete-outcomes">
                    {(
                      [
                        ['completed', 'completed', 'completedHint'],
                        ['partially_completed', 'partial', 'partialHint'],
                        ['not_done', 'notDone', 'notDoneHint'],
                      ] as const
                    ).map(([value, key, hint]) => (
                      <button
                        key={value}
                        type="button"
                        className={`task-complete-outcome${draft.outcome === value ? ' is-selected' : ''}`}
                        onClick={() => setDraft((prev) => ({ ...prev, outcome: value }))}
                      >
                        <span className="mark" aria-hidden />
                        <span>
                          <strong>{t(`fieldWork.completion.outcomes.${key}`)}</strong>
                          <span>{t(`fieldWork.completion.outcomes.${hint}`)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="task-complete-field">
                    <label htmlFor="fw-complete-notes">{t('fieldWork.form.notes')}</label>
                    <textarea
                      id="fw-complete-notes"
                      rows={3}
                      value={draft.notes}
                      onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder={t('fieldWork.completion.notesPlaceholder')}
                    />
                  </div>
                )}
                {resultFields.length > 0 ? (
                  <div className="task-complete-field">
                    <label>{t('fieldWork.completion.whatHappened')}</label>
                    <div className="task-complete-outcomes">
                      {(
                        [
                          ['completed', 'completed', 'completedHint'],
                          ['partially_completed', 'partial', 'partialHint'],
                          ['not_done', 'notDone', 'notDoneHint'],
                        ] as const
                      ).map(([value, key, hint]) => (
                        <button
                          key={value}
                          type="button"
                          className={`task-complete-outcome${draft.outcome === value ? ' is-selected' : ''}`}
                          onClick={() => setDraft((prev) => ({ ...prev, outcome: value }))}
                        >
                          <span className="mark" aria-hidden />
                          <span>
                            <strong>{t(`fieldWork.completion.outcomes.${key}`)}</strong>
                            <span>{t(`fieldWork.completion.outcomes.${hint}`)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {draft.outcome === 'partially_completed' ? (
                  <label className="task-complete-field">
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
                ) : null}
              </div>
              {missingEssentialResults.length > 0 && draft.outcome === 'completed' ? (
                <p className="task-complete-block" role="status">
                  {t('fieldWork.completion.blockResults', { count: missingEssentialResults.length })}
                </p>
              ) : null}
            </>
          ) : null}

          {step === 'cost' ? (
            <>
              <div>
                <h2>{t('fieldWork.completion.hadCost')}</h2>
                <p className="task-complete-lead">{t('fieldWork.completion.hadCostHint')}</p>
              </div>
              <div className="task-complete-cost-row">
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
            </>
          ) : null}

          {step === 'confirm' ? (
            <>
              <div>
                <h2>{t('fieldWork.completion.confirm')}</h2>
              </div>
              <div className="task-complete-confirm">
                <p>
                  {t('fieldWork.completion.chronologioConfirm', {
                    field: fieldName,
                    date: whenLabel,
                  })}
                </p>
              </div>
              <ul className="task-complete-summary">
                <li>
                  <strong>{t('fieldWork.completion.whatHappened')}: </strong>
                  {t(
                    `fieldWork.completion.outcomes.${
                      draft.outcome === 'partially_completed'
                        ? 'partial'
                        : draft.outcome === 'not_done'
                          ? 'notDone'
                          : 'completed'
                    }`
                  )}
                </li>
                <li>
                  <strong>{t('fieldWork.completion.hadCost')}: </strong>
                  {draft.hadCost
                    ? t('fieldWork.completion.hadCostYes')
                    : t('fieldWork.completion.hadCostNo')}
                </li>
                {draft.notes ? (
                  <li>
                    <strong>{t('fieldWork.form.notes')}: </strong>
                    {draft.notes}
                  </li>
                ) : null}
              </ul>
            </>
          ) : null}
        </div>

        <div className="task-complete-actions">
          <Button variant="outline" size="lg" onClick={goBack} disabled={busy}>
            {stepIndex === 0 ? t('common:back') : t('fieldWork.completion.return')}
          </Button>
          {step === 'confirm' ? (
            <Button
              variant="success"
              size="lg"
              onClick={() => void submit()}
              disabled={busy}
              loading={busy}
            >
              {t('fieldWork.completion.saveYes')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={goNext}
              disabled={
                (step === 'checks' && unansweredEssentialChecks.length > 0) ||
                (step === 'result' &&
                  draft.outcome === 'completed' &&
                  missingEssentialResults.length > 0) ||
                (step === 'cost' && draft.hadCost === null)
              }
            >
              {t('common:next')}
            </Button>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default TaskCompletionPage;
