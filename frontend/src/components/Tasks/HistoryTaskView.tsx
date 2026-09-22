import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldTask } from '../../services/fieldWorkService';
import { resolveTaskPerson } from '../../utils/plannedTaskGroups';
import { groupWorkUnits, isRecordedWork, leadTask, type NotebookAction } from '../../utils/taskNotebook';
import TaskNotebookCard, { type NotebookMenuAction } from './TaskNotebookCard';
import TasksEmptyState from './TasksEmptyState';

interface HistoryTaskViewProps {
  tasks: FieldTask[];
  fields: Field[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  onOpen: (task: FieldTask) => void;
  onPrimary: (task: FieldTask, action: NotebookAction) => void;
  onMenu: (task: FieldTask, action: NotebookMenuAction) => void;
}

const HistoryTaskView: React.FC<HistoryTaskViewProps> = ({
  tasks,
  fields,
  fieldNames,
  personNames,
  year,
  busyId,
  onOpen,
  onPrimary,
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
        <p>{t('fieldWork.history.banner')}</p>
        <Link to="/chronologio" className="tasks-history-banner-link">
          {t('fieldWork.history.openChronologio')}
        </Link>
      </div>

      {units.length === 0 ? (
        <TasksEmptyState
          title={t('fieldWork.empty.historyTitle')}
          description={t('fieldWork.empty.historyDescription')}
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
                onPrimary={onPrimary}
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
