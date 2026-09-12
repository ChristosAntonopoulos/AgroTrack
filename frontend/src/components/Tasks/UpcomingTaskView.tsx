import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldTask } from '../../services/fieldWorkService';
import { groupUpcomingTasks, type UpcomingGroupId } from '../../utils/upcomingTaskGroups';
import { resolveTaskPerson } from '../../utils/plannedTaskGroups';
import TaskWorkCard from './TaskWorkCard';
import TasksEmptyState from './TasksEmptyState';
import Button from '../Common/Button';
import { Plus } from 'lucide-react';

interface UpcomingTaskViewProps {
  tasks: FieldTask[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  createdId?: string;
  onOpen: (task: FieldTask) => void;
  onStart: (task: FieldTask) => void;
  onReschedule: (task: FieldTask) => void;
  onOverflow: (task: FieldTask, action: 'edit' | 'copy' | 'changeStatus' | 'cancel' | 'delete') => void;
}

const UpcomingTaskView: React.FC<UpcomingTaskViewProps> = ({
  tasks,
  fieldNames,
  personNames,
  year,
  busyId,
  createdId,
  onOpen,
  onStart,
  onReschedule,
  onOverflow,
}) => {
  const { t } = useTranslation('tasks');
  const [mode, setMode] = useState<'list' | 'calendar'>('list');
  const groups = groupUpcomingTasks(tasks);
  const unknownField = t('fieldWork.unknownField');

  const groupLabel = (id: UpcomingGroupId, count: number) => {
    const base = t(`fieldWork.upcomingGroups.${id}`);
    return t('fieldWork.upcomingGroups.withCount', { label: base, count });
  };

  if (groups.length === 0) {
    return (
      <TasksEmptyState
        title={t('fieldWork.empty.upcomingTitle')}
        description={t('fieldWork.empty.upcomingDescription')}
        action={
          <Button to="/tasks/new" icon={<Plus />} variant="primary" size="lg">
            {t('fieldWork.addTask')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="tasks-upcoming-view">
      <div className="tasks-view-mode" role="group" aria-label={t('fieldWork.upcomingMode.aria')}>
        <button
          type="button"
          className={`tasks-view-mode-btn${mode === 'list' ? ' is-active' : ''}`}
          aria-pressed={mode === 'list'}
          onClick={() => setMode('list')}
        >
          {t('fieldWork.upcomingMode.list')}
        </button>
        <button
          type="button"
          className={`tasks-view-mode-btn${mode === 'calendar' ? ' is-active' : ''}`}
          aria-pressed={mode === 'calendar'}
          onClick={() => setMode('calendar')}
        >
          {t('fieldWork.upcomingMode.calendar')}
        </button>
      </div>

      {mode === 'calendar' ? (
        <div className="tasks-upcoming-calendar">
          <p className="tasks-upcoming-calendar-note">{t('fieldWork.upcomingMode.calendarNote')}</p>
          <ul className="tasks-section-list">
            {groups.flatMap((g) => g.tasks).map((task) => (
              <li key={task.id}>
                <TaskWorkCard
                  task={task}
                  fieldName={fieldNames[task.fieldId] || unknownField}
                  personName={resolveTaskPerson(task, personNames) || undefined}
                  year={year}
                  busy={busyId === task.id}
                  highlighted={task.id === createdId}
                  primaryAction="start"
                  secondaryAction="reschedule"
                  onPrimary={() => onStart(task)}
                  onSecondary={() => onReschedule(task)}
                  onOpen={() => onOpen(task)}
                  onOverflow={(action) => onOverflow(task, action)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        groups.map((group) => (
          <section
            key={group.id}
            className="tasks-section"
            aria-labelledby={`tasks-upcoming-${group.id}`}
          >
            <h2 id={`tasks-upcoming-${group.id}`} className="tasks-section-title">
              {groupLabel(group.id, group.tasks.length)}
            </h2>
            <ul className="tasks-section-list">
              {group.tasks.map((task) => (
                <li key={task.id}>
                  <TaskWorkCard
                    task={task}
                    fieldName={fieldNames[task.fieldId] || unknownField}
                    personName={resolveTaskPerson(task, personNames) || undefined}
                    year={year}
                    busy={busyId === task.id}
                    highlighted={task.id === createdId}
                    primaryAction="start"
                    secondaryAction="reschedule"
                    onPrimary={() => onStart(task)}
                    onSecondary={() => onReschedule(task)}
                    onOpen={() => onOpen(task)}
                    onOverflow={(action) => onOverflow(task, action)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
};

export default UpcomingTaskView;
