import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldTask } from '../../services/fieldWorkService';
import { resolveTaskPerson } from '../../utils/plannedTaskGroups';
import { formatTaskDay } from '../../utils/taskDateRange';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import TaskWorkCard from './TaskWorkCard';
import TasksEmptyState from './TasksEmptyState';

interface HistoryTaskViewProps {
  tasks: FieldTask[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  onOpen: (task: FieldTask) => void;
  onRestore: (task: FieldTask) => void;
  onRepeat: (task: FieldTask) => void;
}

const HistoryTaskView: React.FC<HistoryTaskViewProps> = ({
  tasks,
  fieldNames,
  personNames,
  year,
  busyId,
  onOpen,
  onRestore,
  onRepeat,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const unknownField = t('fieldWork.unknownField');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((task) => {
        const status = String(task.status).toLowerCase();
        return status === 'completed' || status === 'cancelled';
      })
      .filter((task) => {
        if (typeFilter && (task.templateCode || '').toUpperCase() !== typeFilter.toUpperCase()) {
          return false;
        }
        if (!q) return true;
        const title = taskDisplayTitle(task.title, task.templateCode, i18n.language).toLowerCase();
        const field = (fieldNames[task.fieldId] || '').toLowerCase();
        return title.includes(q) || field.includes(q);
      })
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }, [tasks, query, typeFilter, fieldNames, i18n.language]);

  const templateOptions = useMemo(() => {
    const codes = new Set(
      tasks.map((task) => (task.templateCode || '').toUpperCase()).filter(Boolean)
    );
    return [...codes].sort();
  }, [tasks]);

  return (
    <div className="tasks-history-view">
      <div className="tasks-history-banner">
        <p>{t('fieldWork.history.banner')}</p>
        <Link to="/chronologio" className="tasks-history-banner-link">
          {t('fieldWork.history.openChronologio')}
        </Link>
      </div>

      <div className="tasks-history-filters">
        <label className="tasks-context-control">
          <span className="tasks-context-label">{t('fieldWork.history.search')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('fieldWork.history.searchPlaceholder')}
          />
        </label>
        <label className="tasks-context-control">
          <span className="tasks-context-label">{t('fieldWork.history.type')}</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">{t('fieldWork.history.allTypes')}</option>
            {templateOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <TasksEmptyState
          title={t('fieldWork.empty.historyTitle')}
          description={t('fieldWork.empty.historyDescription')}
        />
      ) : (
        <ul className="tasks-section-list">
          {filtered.map((task) => {
            const completed = String(task.status).toLowerCase() === 'completed';
            const when = formatTaskDay(task.updatedAt, i18n.language, year);
            return (
              <li key={task.id}>
                <TaskWorkCard
                  task={task}
                  fieldName={fieldNames[task.fieldId] || unknownField}
                  personName={resolveTaskPerson(task, personNames) || undefined}
                  year={year}
                  busy={busyId === task.id}
                  progressSentence={
                    completed
                      ? t('fieldWork.history.completedOn', { date: when })
                      : t('fieldWork.history.cancelledOn', { date: when })
                  }
                  primaryAction={completed ? 'viewResult' : 'restore'}
                  secondaryAction={null}
                  onPrimary={() => (completed ? onOpen(task) : onRestore(task))}
                  onOpen={() => onOpen(task)}
                  showOverflow={completed}
                  onOverflow={
                    completed
                      ? (action) => {
                          if (action === 'copy') onRepeat(task);
                        }
                      : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default HistoryTaskView;
