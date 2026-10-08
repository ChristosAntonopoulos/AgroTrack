import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, MoreHorizontal } from 'lucide-react';
import { getFieldService, getTaskService } from '../services/serviceFactory';
import type { Task } from '../services/taskService';
import type { Field } from '../services/fieldService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { notebookStatus } from '../utils/taskNotebook';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { formatCompactTaskPeriod } from '../utils/taskDateRange';
import { formatLongTaskDate } from '../utils/taskFormDates';
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
  const menuId = useId();
  const menuRef = useRef<HTMLDetailsElement>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [noteDirty, setNoteDirty] = useState(false);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipOpen, setSkipOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await getTaskService().getTask(id);
      setTask(data);
      setNote(data.note || data.notes || '');
      setNoteDirty(false);
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

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const saveNote = async () => {
    if (!id || !task) return;
    const next = note.trim();
    if (next === (task.note || task.notes || '').trim()) {
      setNoteDirty(false);
      return;
    }
    setBusy(true);
    try {
      setTask(await getTaskService().patchTask(id, { note: next, notes: next }));
      setNoteDirty(false);
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

  const reopen = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await getTaskService().reopenTask(id);
      setTask(updated);
      navigate('/tasks?view=today', { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedReopen'));
    } finally {
      setBusy(false);
    }
  };

  const deleteTask = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await getTaskService().deleteTask(id);
      navigate('/tasks', { replace: true });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedDelete'));
      setConfirmDelete(false);
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
  const isDone = status === 'done';
  const isSkipped = status === 'skipped';
  const isClosed = isDone || isSkipped;
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const fieldName = friendlyFieldLabel(field?.name) || task.fieldId;
  const period = formatCompactTaskPeriod(
    task.scheduledFor || task.plannedStart,
    task.plannedEnd,
    i18n.language,
    task.resultYear
  );
  const statusLabel = t(`notebook.status.${status}`, { defaultValue: status });
  const completedLabel = task.completedAt
    ? formatLongTaskDate(task.completedAt, i18n.language)
    : null;
  const metaParts = [fieldName, period, statusLabel].filter(Boolean);

  return (
    <PageContainer className="tasks-page-container" maxWidth="md">
      <Breadcrumbs />
      <div className="task-work-screen task-detail-slim">
        <header className="task-work-head">
          <div className="task-detail-top-bar">
            <BackLink to="/tasks">{t('detail.backToTasks')}</BackLink>
            <details
              ref={menuRef}
              className="task-detail-more"
              open={menuOpen}
              onToggle={(event) => setMenuOpen((event.target as HTMLDetailsElement).open)}
            >
              <summary
                className="task-detail-more-btn"
                aria-label={t('detail.moreMenu')}
                aria-controls={menuId}
              >
                <MoreHorizontal size={20} strokeWidth={2.2} aria-hidden />
              </summary>
              <div id={menuId} className="task-detail-more-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                >
                  {t('detail.editTask')}
                </button>
                {!isClosed ? (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => {
                      setMenuOpen(false);
                      setRescheduleOpen(true);
                    }}
                  >
                    {t('notebook.menu.reschedule')}
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className="is-danger"
                  disabled={busy}
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                >
                  {t('detail.delete')}
                </button>
              </div>
            </details>
          </div>

          <div className="task-work-head-row">
            <TaskCategoryMark templateCode={task.templateCode} size={22} />
            <div>
              {editing ? (
                <input
                  className="task-form-input"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={() => void saveTitle()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void saveTitle();
                    }
                  }}
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

        {isClosed ? (
          <section
            className={`task-detail-outcome${isDone ? ' is-done' : ' is-skipped'}`}
            aria-label={isDone ? t('detail.doneOutcome') : t('detail.skippedOutcome')}
          >
            <div className="task-detail-outcome-icon" aria-hidden>
              {isDone ? <Check size={22} strokeWidth={2.4} /> : null}
            </div>
            <div className="task-detail-outcome-copy">
              <h2>{isDone ? t('detail.doneOutcome') : t('detail.skippedOutcome')}</h2>
              <p>
                {isDone
                  ? completedLabel
                    ? t('detail.doneOn', { date: completedLabel })
                    : t('detail.doneBody')
                  : task.skippedReason || t('detail.skippedBody')}
              </p>
            </div>
            <Button variant="outline" size="lg" disabled={busy} onClick={() => void reopen()}>
              {t('detail.restoreToTasks')}
            </Button>
          </section>
        ) : null}

        <section className="task-work-card">
          <div className="task-detail-card-head">
            <h2>{t('detail.note')}</h2>
            {noteDirty ? (
              <Button variant="primary" size="sm" disabled={busy} onClick={() => void saveNote()}>
                {t('detail.saveNote')}
              </Button>
            ) : null}
          </div>
          <textarea
            className="task-work-note"
            value={note}
            disabled={busy}
            onChange={(event) => {
              setNote(event.target.value);
              setNoteDirty(true);
            }}
            onBlur={() => {
              if (noteDirty) void saveNote();
            }}
            placeholder={t('detail.notePlaceholder')}
          />
        </section>

        {!isClosed ? (
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
        ) : (
          <div className="task-detail-actions task-detail-actions--closed">
            <Button variant="primary" size="lg" disabled={busy} onClick={() => void reopen()}>
              {t('detail.restoreToTasks')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              {t('detail.editTask')}
            </Button>
          </div>
        )}

        {skipOpen && !isClosed ? (
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

        {confirmDelete ? (
          <section className="task-work-card task-detail-delete-confirm" role="alertdialog" aria-labelledby="task-delete-title">
            <h2 id="task-delete-title">{t('detail.deleteConfirmTitle')}</h2>
            <p>{t('detail.deleteConfirmBody')}</p>
            <div className="task-detail-actions">
              <Button variant="primary" size="lg" disabled={busy} onClick={() => void deleteTask()}>
                {t('detail.delete')}
              </Button>
              <Button variant="ghost" size="lg" disabled={busy} onClick={() => setConfirmDelete(false)}>
                {t('common:cancel', { defaultValue: 'Ακύρωση' })}
              </Button>
            </div>
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
