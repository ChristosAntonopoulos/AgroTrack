import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, MoreHorizontal } from 'lucide-react';
import type { Task } from '../../services/taskService';
import { resolveFieldColor } from '../../utils/fieldColors';
import { formatCompactTaskPeriod } from '../../utils/taskDateRange';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import {
  leadTask,
  notebookStatus,
  whenTone,
  type NotebookMenuAction,
  type TaskUnit,
} from '../../utils/taskNotebook';
import TaskCategoryMark from './TaskCategoryMark';
import './TaskNotebookCard.css';

export type { NotebookMenuAction };

interface TaskNotebookCardProps {
  unit: TaskUnit;
  fieldName: (fieldId: string) => string;
  fieldColor?: (fieldId: string) => string | undefined;
  personName?: string;
  year: number;
  busy?: boolean;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onMenu?: (task: Task, action: NotebookMenuAction) => void;
}

const TaskNotebookCard: React.FC<TaskNotebookCardProps> = ({
  unit,
  fieldName,
  fieldColor,
  personName,
  year,
  busy,
  onOpen,
  onComplete,
  onMenu,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const menuId = useId();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const task = leadTask(unit);
  const status = notebookStatus(task.status);
  const done = status === 'done';
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const tone = whenTone(task);
  const period = formatCompactTaskPeriod(
    task.scheduledFor || task.plannedStart,
    task.plannedEnd,
    i18n.language,
    year
  );
  const when =
    tone === 'overdue'
      ? t('notebook.when.overdue')
      : tone === 'today'
        ? t('notebook.when.today')
        : tone === 'tomorrow'
          ? t('notebook.when.tomorrow')
          : tone === 'none'
            ? ''
            : period || '';

  const where = fieldName(task.fieldId);
  const who = personName || t('notebook.unassigned');
  const metaParts = [where, when, who].filter(Boolean);
  const color = resolveFieldColor(fieldColor?.(task.fieldId), task.fieldId);

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
    <article
      className={`task-row notebook-card notebook-card--${status}${
        tone === 'overdue' ? ' task-row--urgent' : ''
      }`}
      data-task-id={task.id}
    >
      <div className="notebook-card-check-block">
        <button
          type="button"
          className={`notebook-card-check${done ? ' is-done' : ''}`}
          aria-label={done ? t('notebook.actions.completed') : t('notebook.actions.markDone')}
          aria-pressed={done}
          disabled={busy || status === 'skipped'}
          onClick={() => {
            if (!done) onComplete(task);
          }}
        >
          {done ? <Check size={20} aria-hidden /> : null}
        </button>
        {!done && status === 'planned' ? (
          <span className="notebook-card-check-cue" aria-hidden>
            {t('notebook.actions.markDone')}
          </span>
        ) : null}
      </div>

      <button type="button" className="notebook-card-hit" onClick={() => onOpen(task)}>
        <TaskCategoryMark templateCode={task.templateCode} />
        <span className="notebook-card-copy">
          <span className="task-row-title notebook-card-title">{title}</span>
          <span className="task-row-meta notebook-card-where">
            {metaParts.map((part, index) => (
              <React.Fragment key={`${part}-${index}`}>
                {index > 0 ? <span aria-hidden> · </span> : null}
                <span className={index === 1 && tone === 'overdue' ? 'is-overdue' : undefined}>
                  {part}
                </span>
              </React.Fragment>
            ))}
          </span>
          <span className="notebook-card-colors" aria-hidden>
            <span style={{ background: color }} />
          </span>
        </span>
      </button>

      <div className="notebook-card-actions task-row-actions">
        {onMenu && status === 'planned' ? (
          <details
            ref={menuRef}
            className="notebook-card-more"
            open={menuOpen}
            onToggle={(event) => setMenuOpen((event.target as HTMLDetailsElement).open)}
          >
            <summary aria-label={t('fieldWork.actions.more')} aria-controls={menuId} aria-haspopup="menu">
              <MoreHorizontal size={20} aria-hidden />
            </summary>
            <div id={menuId} className="notebook-card-menu" role="menu">
              {menu('reschedule', t('notebook.menu.reschedule'))}
              {menu('assign', t('notebook.menu.assign'))}
              {menu('repeat', t('notebook.menu.repeat'))}
              {menu('edit', t('notebook.menu.edit'))}
              {menu('complete', t('notebook.menu.complete'))}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
};

export default TaskNotebookCard;
