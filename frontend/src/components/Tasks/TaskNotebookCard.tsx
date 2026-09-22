import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import type { FieldTask } from '../../services/fieldWorkService';
import { resolveFieldColor } from '../../utils/fieldColors';
import { formatCompactTaskPeriod } from '../../utils/taskDateRange';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import {
  checklistCount,
  leadTask,
  notebookStatus,
  primaryActionFor,
  weatherChangesDecision,
  whenTone,
  type NotebookAction,
  type TaskUnit,
} from '../../utils/taskNotebook';
import { resolveWeatherKind } from '../../utils/taskWeather';
import './TaskNotebookCard.css';

export type NotebookMenuAction = 'reschedule' | 'block' | 'skip' | 'cancel' | 'reopen';

interface TaskNotebookCardProps {
  unit: TaskUnit;
  fieldName: (fieldId: string) => string;
  fieldColor?: (fieldId: string) => string | undefined;
  personName?: string;
  year: number;
  busy?: boolean;
  onOpen: (task: FieldTask) => void;
  onPrimary: (task: FieldTask, action: NotebookAction) => void;
  onMenu?: (task: FieldTask, action: NotebookMenuAction) => void;
}

const TaskNotebookCard: React.FC<TaskNotebookCardProps> = ({
  unit,
  fieldName,
  fieldColor,
  personName,
  year,
  busy,
  onOpen,
  onPrimary,
  onMenu,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const menuId = useId();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const task = leadTask(unit);
  const status = notebookStatus(task.status);
  const action = primaryActionFor(status);
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const several = unit.tasks.length > 1;
  const doneFields = unit.tasks.filter((item) => notebookStatus(item.status) === 'completed').length;
  const checks = checklistCount(task);
  const tone = whenTone(task);
  const period = formatCompactTaskPeriod(task.plannedStart, task.plannedEnd, i18n.language, year);
  const when =
    tone === 'overdue'
      ? t('notebook.when.overdue')
      : tone === 'today'
        ? t('notebook.when.today')
        : tone === 'tomorrow'
          ? t('notebook.when.tomorrow')
          : tone === 'progress'
            ? t('notebook.when.today')
            : tone === 'none'
              ? t('notebook.when.noDate')
              : period || t('notebook.when.noDate');

  const where = several
    ? t('notebook.fieldCount', { n: unit.tasks.length })
    : fieldName(task.fieldId);

  const progress = several
    ? t('notebook.fieldProgress', { done: doneFields, total: unit.tasks.length })
    : checks.total > 0
      ? t('notebook.checks', { done: checks.done, total: checks.total })
      : null;

  const showWeather = weatherChangesDecision(task);
  const weatherKind = resolveWeatherKind(task.weatherSuitability);
  const colors = unit.tasks.slice(0, 3).map((item) => resolveFieldColor(fieldColor?.(item.fieldId), item.fieldId));

  const actionLabel =
    action === 'start'
      ? t('fieldWork.actions.start')
      : action === 'continue'
        ? t('fieldWork.actions.continueIt')
        : action === 'resolve'
          ? t('notebook.actions.resolve')
          : t('fieldWork.actions.viewResult');

  const statusLabel =
    status === 'in_progress'
      ? t('notebook.status.in_progress')
      : status === 'blocked'
        ? t('notebook.status.blocked')
        : status === 'completed'
          ? t('notebook.status.completed')
          : status === 'skipped'
            ? t('notebook.status.skipped')
            : status === 'cancelled'
              ? t('notebook.status.cancelled')
              : t('notebook.status.todo');

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const menu = (id: NotebookMenuAction, label: string) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setMenuOpen(false);
        onMenu?.(task, id);
      }}
    >
      {label}
    </button>
  );

  return (
    <article className={`notebook-card notebook-card--${status}`} data-task-id={task.id}>
      <button type="button" className="notebook-card-hit" onClick={() => onOpen(task)}>
        <span className="notebook-card-colors" aria-hidden>
          {colors.map((color, index) => (
            <span key={`${color}-${index}`} style={{ background: color }} />
          ))}
        </span>
        <span className="notebook-card-copy">
          <span className="notebook-card-title">{title}</span>
          <span className="notebook-card-where">
            {where}
            <span aria-hidden> · </span>
            <span className={tone === 'overdue' ? 'is-overdue' : undefined}>{when}</span>
          </span>
          <span className="notebook-card-who">
            {personName ? <span>{personName}</span> : <span>{t('notebook.unassigned')}</span>}
            {progress ? (
              <>
                <span aria-hidden> · </span>
                <span>{progress}</span>
              </>
            ) : null}
          </span>
          {status !== 'todo' || showWeather ? (
            <span className="notebook-card-status">
              {status !== 'todo' ? statusLabel : null}
              {showWeather ? (
                <span className={`notebook-weather notebook-weather--${weatherKind}`}>
                  {weatherKind === 'unsuitable'
                    ? t('notebook.weather.unsuitable')
                    : t('notebook.weather.caution')}
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
      </button>
      <div className="notebook-card-actions">
        <button
          type="button"
          className="notebook-card-primary"
          disabled={busy}
          onClick={() => onPrimary(task, action)}
        >
          {actionLabel}
        </button>
        {onMenu ? (
          <details
            ref={menuRef}
            className="notebook-card-more"
            open={menuOpen}
            onToggle={(event) => setMenuOpen((event.target as HTMLDetailsElement).open)}
          >
            <summary aria-label={t('fieldWork.actions.more')} aria-controls={menuId}>
              <MoreHorizontal size={20} aria-hidden />
            </summary>
            <div id={menuId} className="notebook-card-menu" role="menu">
              {status !== 'completed' && status !== 'cancelled' && status !== 'skipped'
                ? menu('reschedule', t('notebook.menu.reschedule'))
                : null}
              {status === 'todo' || status === 'in_progress'
                ? menu('block', t('notebook.menu.block'))
                : null}
              {status === 'todo' || status === 'in_progress' || status === 'blocked'
                ? menu('skip', t('notebook.menu.skip'))
                : null}
              {status !== 'completed' && status !== 'cancelled' && status !== 'skipped'
                ? menu('cancel', t('notebook.menu.cancel'))
                : null}
              {status === 'completed' || status === 'cancelled' || status === 'skipped'
                ? menu('reopen', t('notebook.menu.reopen'))
                : null}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
};

export default TaskNotebookCard;
