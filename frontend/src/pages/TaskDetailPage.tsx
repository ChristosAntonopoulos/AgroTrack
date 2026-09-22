import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
} from '../services/serviceFactory';
import type { FieldTask, FieldTaskChecklistItem } from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import type { TaskFinancialSummary } from '../services/financialSummaryService';
import { useCaptureOptional } from '../context/CaptureContext';
import { getApiErrorMessage } from '../utils/translateApiError';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { notebookStatus, requiredChecksRemaining } from '../utils/taskNotebook';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatOfficialAmount } from '../finance/format';
import { taskExpenseCaptureContext } from '../utils/taskExpenseContext';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import '../components/Tasks/form/TaskForm.css';
import '../components/Tasks/TaskNotebookCard.css';
import './TaskDetailPage.css';

const checkLabel = (item: FieldTaskChecklistItem, language: string) => {
  if (language.toLowerCase().startsWith('el')) return item.greekLabel || item.label;
  return item.englishLabel || item.label;
};

const TaskDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors', 'money']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const capture = useCaptureOptional();

  const [task, setTask] = useState<FieldTask | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [money, setMoney] = useState<TaskFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [explaining, setExplaining] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await getFieldWorkService().getFieldTask(id);
      setTask(data);
      setNote(data.notes || '');
      const [fields, taskMoney] = await Promise.all([
        getFieldService().getFields().catch(() => [] as Field[]),
        getFinancialSummaryService().getTaskSummary(id).catch(() => null),
      ]);
      setField(fields.find((item) => item.id === data.fieldId) || null);
      setMoney(taskMoney);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedLoad'));
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStart = async () => {
    if (!id) return;
    setBusy(true);
    try {
      setTask(await getFieldWorkService().startFieldTask(id));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.start'));
    } finally {
      setBusy(false);
    }
  };

  const toggleCheck = async (item: FieldTaskChecklistItem) => {
    if (!id || !task) return;
    const status = notebookStatus(task.status);
    if (status === 'completed' || status === 'cancelled' || status === 'skipped') return;
    setBusy(true);
    try {
      let current = task;
      if (status === 'todo') {
        current = await getFieldWorkService().startFieldTask(id);
      }
      const updated = await getFieldWorkService().setChecklistItem(id, item.key, !item.isAnswered);
      setTask({ ...updated, startedAt: updated.startedAt || current.startedAt });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedStatus'));
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async (value: string) => {
    if (!id || !task) return;
    if ((value.trim() || '') === (task.notes || '').trim()) return;
    setBusy(true);
    try {
      setTask(await getFieldWorkService().updateFieldTask(id, { notes: value.trim() }));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedStatus'));
    } finally {
      setBusy(false);
    }
  };

  const confirmComplete = async (allowIncomplete: boolean) => {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await getFieldWorkService().completeFieldTask(id, {
        outcome: 'completed',
        notes: note.trim() || undefined,
        allowIncomplete,
      });
      navigate('/tasks?view=done');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.complete'));
    } finally {
      setBusy(false);
    }
  };

  const blockTask = async () => {
    if (!id) return;
    setBusy(true);
    try {
      setTask(await getFieldWorkService().blockFieldTask(id, note.trim() || undefined));
      setConfirming(false);
      setExplaining(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.complete'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PageContainer className="tasks-page-container">
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer className="tasks-page-container">
        <Breadcrumbs />
        <div className="task-detail-page">
          <p className="task-form-help">{error || t('detail.notFound')}</p>
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline" size="lg">
            {t('detail.backToTasks')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  const status = notebookStatus(task.status);
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const fieldName = friendlyFieldLabel(field?.name) || task.fieldId;
  const started = task.startedAt
    ? new Date(task.startedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })
    : '';
  const locked = status === 'completed' || status === 'cancelled' || status === 'skipped';
  const checks = [...(task.checklist || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const remaining = requiredChecksRemaining(task);
  const needsExplanation = confirming && remaining > 0 && !explaining;
  const actualCost = formatOfficialAmount(
    money?.actualCost,
    task.estimatedCostCurrency || 'EUR',
    i18n.language,
    t('fieldWork.detail.noActual')
  );
  const activityLine = (action: string, occurredAt: string) => {
    const key = `notebook.work.activityActions.${action}`;
    const label = t(key, { defaultValue: action });
    const when = new Date(occurredAt).toLocaleString(i18n.language, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${label} · ${when}`;
  };

  return (
    <PageContainer className="tasks-page-container" maxWidth="md">
      <Breadcrumbs />
      <div className="task-work-screen">
        <header className="task-work-head">
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline" size="lg">
            {t('detail.backToTasks')}
          </Button>
          <h1>{title}</h1>
          <p className="task-work-meta">
            {fieldName}
            {started ? ` · ${t('notebook.work.started', { time: started })}` : ''}
            {status !== 'todo' ? ` · ${t(`notebook.status.${status}`)}` : ''}
          </p>
          {error ? <p role="alert">{error}</p> : null}
        </header>

        <section aria-label={t('notebook.work.checks')}>
          <h2>{t('notebook.work.checks')}</h2>
          {checks.length === 0 ? (
            <p className="task-form-help">{t('notebook.work.noChecks')}</p>
          ) : (
            <ul className="task-check-list">
              {checks.map((item) => (
                <li key={item.key}>
                  <label className={`task-check${item.isAnswered ? ' is-done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={item.isAnswered}
                      disabled={busy || locked}
                      onChange={() => void toggleCheck(item)}
                    />
                    <span>{checkLabel(item, i18n.language)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2>{t('notebook.work.note')}</h2>
          <textarea
            className="task-work-note"
            value={note}
            disabled={locked || busy}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => void saveNote(note)}
          />
        </section>

        <section>
          <h2>{t('fieldWork.detail.money')}</h2>
          <p>{t('fieldWork.detail.actual')}</p>
          <p>{actualCost}</p>
          <p>{t('fieldWork.detail.estimateHint')}</p>
          {!locked ? (
            <div className="task-detail-actions">
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  capture?.openCapture({
                    preferredType: 'photo',
                    fieldId: task.fieldId,
                    taskId: task.id,
                  })
                }
              >
                {t('notebook.work.addPhoto')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  capture?.openCapture(taskExpenseCaptureContext(task))
                }
              >
                {t('fieldWork.detail.addExpense')}
              </Button>
            </div>
          ) : null}
        </section>

        {(task.activity || []).length > 0 ? (
          <section>
            <h2>{t('notebook.work.activity')}</h2>
            <ul>
              {task.activity?.map((event, index) => (
                <li key={`${event.action}-${event.occurredAt}-${index}`}>
                  {activityLine(event.action, event.occurredAt)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {confirming ? (
          <section>
            <h2>{t('notebook.work.doneNow')}</h2>
            {needsExplanation ? (
              <p role="status">{t('notebook.work.incomplete', { open: remaining })}</p>
            ) : null}
            {needsExplanation ? (
              <div className="task-detail-actions">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setConfirming(false);
                    setExplaining(false);
                  }}
                >
                  {t('notebook.work.backToChecks')}
                </Button>
                <Button variant="outline" size="lg" onClick={() => setExplaining(true)}>
                  {t('notebook.work.completeAnyway')}
                </Button>
                <Button variant="outline" size="lg" onClick={() => void blockTask()} disabled={busy}>
                  {t('notebook.menu.block')}
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                disabled={busy}
                onClick={() => void confirmComplete(remaining > 0)}
              >
                {t('notebook.work.confirm')}
              </Button>
            )}
          </section>
        ) : null}

        {!confirming ? (
          <div className="task-detail-actions">
            {status === 'todo' ? (
              <Button variant="primary" size="lg" onClick={() => void handleStart()} disabled={busy}>
                {t('fieldWork.actions.start')}
              </Button>
            ) : null}
            {status === 'blocked' ? (
              <Button
                variant="primary"
                size="lg"
                disabled={busy}
                onClick={() => {
                  if (!id) return;
                  setBusy(true);
                  void getFieldWorkService()
                    .resolveFieldTask(id)
                    .then(setTask)
                    .catch((err: unknown) =>
                      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.start'))
                    )
                    .finally(() => setBusy(false));
                }}
              >
                {t('notebook.actions.resolve')}
              </Button>
            ) : null}
            {status === 'in_progress' ? (
              <Button variant="primary" size="lg" disabled={busy} onClick={() => setConfirming(true)}>
                {t('notebook.work.complete')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
};

export default TaskDetailPage;
