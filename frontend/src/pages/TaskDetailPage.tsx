import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getFieldService, getTaskService } from '../services/serviceFactory';
import type { Task } from '../services/taskService';
import type { Field } from '../services/fieldService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { notebookStatus } from '../utils/taskNotebook';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatCompactTaskPeriod } from '../utils/taskDateRange';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import BackLink from '../components/Common/BackLink';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import TaskCategoryMark from '../components/Tasks/TaskCategoryMark';
import RescheduleTaskSheet from '../components/Tasks/RescheduleTaskSheet';
import '../components/Tasks/form/TaskForm.css';
import '../components/Tasks/TaskNotebookCard.css';
import './TaskDetailPage.css';

const TaskDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<Task | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipOpen, setSkipOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await getTaskService().getTask(id);
      setTask(data);
      setNote(data.note || data.notes || '');
      setTitleDraft(data.title);
      const fields = await getFieldService().getFields().catch(() => [] as Field[]);
      setField(fields.find((item) => item.id === data.fieldId) || null);
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

  const saveNote = async () => {
    if (!id || !task) return;
    const next = note.trim();
    if (next === (task.note || task.notes || '').trim()) return;
    setBusy(true);
    try {
      setTask(await getTaskService().patchTask(id, { note: next, notes: next }));
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedStatus'));
    } finally {
      setBusy(false);
    }
  };

  const saveTitle = async () => {
    if (!id || !task) return;
    const next = titleDraft.trim();
    if (!next || next === task.title) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      setTask(await getTaskService().patchTask(id, { title: next }));
      setEditing(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedStatus'));
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await getTaskService().completeTask(id);
      navigate('/tasks?view=done');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('complete.failed'));
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await getTaskService().skipTask(id, skipReason.trim() || undefined);
      navigate('/tasks?view=done');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedStatus'));
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async (plannedStart: string, plannedEnd?: string) => {
    if (!id) return;
    setBusy(true);
    try {
      setTask(
        await getTaskService().patchTask(id, {
          scheduledFor: plannedStart,
          plannedStart,
          plannedEnd: plannedEnd || plannedStart,
        })
      );
      setRescheduleOpen(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.reschedule'));
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
          <BackLink to="/tasks">{t('detail.backToTasks')}</BackLink>
        </div>
      </PageContainer>
    );
  }

  const status = notebookStatus(task.status);
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const fieldName = friendlyFieldLabel(field?.name) || task.fieldId;
  const locked = status === 'done' || status === 'skipped';
  const period = formatCompactTaskPeriod(
    task.scheduledFor || task.plannedStart,
    task.plannedEnd,
    i18n.language,
    task.resultYear
  );
  const statusLabel = t(`notebook.status.${status}`, { defaultValue: status });
  const metaParts = [fieldName, period, statusLabel].filter(Boolean);

  return (
    <PageContainer className="tasks-page-container" maxWidth="md">
      <Breadcrumbs />
      <div className="task-work-screen task-detail-slim">
        <header className="task-work-head">
          <BackLink to="/tasks">{t('detail.backToTasks')}</BackLink>
          <div className="task-work-head-row">
            <TaskCategoryMark templateCode={task.templateCode} size={22} />
            <div>
              {editing ? (
                <input
                  className="task-form-input"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={() => void saveTitle()}
                  autoFocus
                />
              ) : (
                <h1>{title}</h1>
              )}
              <p className="task-work-meta">{metaParts.join(' · ')}</p>
            </div>
          </div>
          {error ? <p role="alert">{error}</p> : null}
        </header>

        <section className="task-work-card">
          <h2>{t('detail.note')}</h2>
          <textarea
            className="task-work-note"
            value={note}
            disabled={locked || busy}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => void saveNote()}
            placeholder={t('detail.notePlaceholder')}
          />
        </section>

        {!locked ? (
          <div className="task-detail-actions">
            <Button variant="primary" size="lg" disabled={busy} onClick={() => void complete()}>
              {t('detail.markDone')}
            </Button>
            <Button variant="outline" size="lg" disabled={busy} onClick={() => setRescheduleOpen(true)}>
              {t('notebook.menu.reschedule')}
            </Button>
            <Button variant="outline" size="lg" disabled={busy} onClick={() => setEditing(true)}>
              {t('detail.editTask')}
            </Button>
            <Button variant="ghost" size="lg" disabled={busy} onClick={() => setSkipOpen((open) => !open)}>
              {t('notebook.menu.skip')}
            </Button>
          </div>
        ) : null}

        {skipOpen && !locked ? (
          <section className="task-work-card">
            <h2>{t('detail.skipReason')}</h2>
            <textarea
              className="task-work-note"
              value={skipReason}
              onChange={(event) => setSkipReason(event.target.value)}
              placeholder={t('detail.skipReasonPlaceholder')}
            />
            <Button variant="primary" size="lg" disabled={busy} onClick={() => void skip()}>
              {t('detail.confirmSkip')}
            </Button>
          </section>
        ) : null}
      </div>

      <RescheduleTaskSheet
        task={task}
        open={rescheduleOpen}
        busy={busy}
        onClose={() => setRescheduleOpen(false)}
        onConfirm={(start, end) => void reschedule(start, end)}
      />
    </PageContainer>
  );
};

export default TaskDetailPage;
