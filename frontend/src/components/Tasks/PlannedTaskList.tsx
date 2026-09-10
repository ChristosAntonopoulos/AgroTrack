import React from 'react';
import type { FieldTask } from '../../services/fieldWorkService';
import { groupPlannedTasks, resolveTaskPerson } from '../../utils/plannedTaskGroups';
import CompletedWorkLink from './CompletedWorkLink';
import PlannedTaskRow from './PlannedTaskRow';
import TasksEmptyState from './TasksEmptyState';

interface PlannedTaskListProps {
  tasks: FieldTask[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  unknownField: string;
  title: string;
  groupLabels: Record<'today' | 'thisWeek' | 'later', string>;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  completedLinkLabel: string;
  year: number;
  busyId: string | null;
  highlightedId?: string;
  now?: Date;
  onStart: (task: FieldTask) => void;
  onOpen: (task: FieldTask) => void;
}

const PlannedTaskList: React.FC<PlannedTaskListProps> = ({
  tasks,
  fieldNames,
  personNames,
  unknownField,
  title,
  groupLabels,
  emptyTitle,
  emptyDescription,
  emptyAction,
  completedLinkLabel,
  year,
  busyId,
  highlightedId,
  now,
  onStart,
  onOpen,
}) => {
  if (tasks.length === 0) {
    return (
      <>
        <TasksEmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        <CompletedWorkLink>{completedLinkLabel}</CompletedWorkLink>
      </>
    );
  }

  const groups = groupPlannedTasks(tasks, now);

  return (
    <div className="tasks-planned-list">
      <h2 className="tasks-view-intro-title">{title}</h2>
      {groups.map((group) => (
        <section key={group.id} className="tasks-proposal-group" aria-labelledby={`tasks-planned-${group.id}`}>
          <h3 id={`tasks-planned-${group.id}`} className="tasks-proposal-group-title">
            {groupLabels[group.id]}
          </h3>
          <div className="tasks-view-items">
            {group.tasks.map((task) => (
              <PlannedTaskRow
                key={task.id}
                task={task}
                fieldName={fieldNames[task.fieldId] || unknownField}
                personName={resolveTaskPerson(task, personNames)}
                year={year}
                busy={busyId === task.id}
                highlighted={highlightedId === task.id}
                onStart={() => onStart(task)}
                onOpen={() => onOpen(task)}
              />
            ))}
          </div>
        </section>
      ))}
      <CompletedWorkLink>{completedLinkLabel}</CompletedWorkLink>
    </div>
  );
};

export default PlannedTaskList;
