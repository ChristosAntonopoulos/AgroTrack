import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { Task } from '../../services/taskService';
import {
  groupWorkUnits,
  isRecordedWork,
  leadTask,
  resolveTaskPerson,
  type NotebookMenuAction,
} from '../../utils/taskNotebook';
import TaskNotebookCard from './TaskNotebookCard';
import TasksEmptyState from './TasksEmptyState';

interface HistoryTaskViewProps {
  tasks: Task[];
  fields: Field[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onMenu: (task: Task, action: NotebookMenuAction) => void;
}

const HistoryTaskView: React.FC<HistoryTaskViewProps> = ({
  tasks,
  fields,
  fieldNames,
  personNames,
  year,
  busyId,
  onOpen,
  onComplete,
  onMenu,
}) => {
  const { t } = useTranslation('tasks');
  const colorByField = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.color])),
    [fields]
  );
  const units = useMemo(() => groupWorkUnits(tasks.filter(isRecordedWork)), [tasks]);

  return (
    <div className="tasks-history-view">
      <div className="tasks-history-banner">
        <p>{t('notebook.done.banner')}</p>
        <Link to="/chronologio" className="tasks-history-banner-link">
          {t('notebook.done.openChronologio')}
        </Link>
      </div>

      {units.length === 0 ? (
        <TasksEmptyState
          title={t('notebook.empty.doneTitle')}
          description={t('notebook.empty.doneDescription')}
        />
      ) : (
        <ul className="notebook-section-list">
          {units.map((unit) => (
            <li key={unit.key}>
              <TaskNotebookCard
                unit={unit}
                fieldName={(id) => fieldNames[id] || t('fieldWork.unknownField')}
                fieldColor={(id) => colorByField[id]}
                personName={resolveTaskPerson(leadTask(unit), personNames) || undefined}
                year={year}
                busy={unit.tasks.some((task) => task.id === busyId)}
                onOpen={onOpen}
                onComplete={onComplete}
                onMenu={onMenu}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HistoryTaskView;
