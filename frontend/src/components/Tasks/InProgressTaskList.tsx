import React from 'react';
import type { FieldTask } from '../../services/fieldWorkService';
import { resolveTaskPerson } from '../../utils/plannedTaskGroups';
import CompletedWorkLink from './CompletedWorkLink';
import InProgressTaskRow from './InProgressTaskRow';
import TasksEmptyState from './TasksEmptyState';

interface InProgressTaskListProps {
  tasks: FieldTask[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  unknownField: string;
  emptyTitle: string;
  emptyDescription: string;
  completedLinkLabel: string;
  year: number;
  busyId: string | null;
  onContinue: (task: FieldTask) => void;
}

const InProgressTaskList: React.FC<InProgressTaskListProps> = ({
  tasks,
  fieldNames,
  personNames,
  unknownField,
  emptyTitle,
  emptyDescription,
  completedLinkLabel,
  year,
  busyId,
  onContinue,
}) => {
  if (tasks.length === 0) {
    return (
      <>
        <TasksEmptyState title={emptyTitle} description={emptyDescription} />
        <CompletedWorkLink>{completedLinkLabel}</CompletedWorkLink>
      </>
    );
  }

  const sorted = [...tasks].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  return (
    <div className="tasks-active-list">
      <div className="tasks-view-items">
        {sorted.map((task) => (
          <InProgressTaskRow
            key={task.id}
            task={task}
            fieldName={fieldNames[task.fieldId] || unknownField}
            personName={resolveTaskPerson(task, personNames)}
            year={year}
            busy={busyId === task.id}
            onContinue={() => onContinue(task)}
          />
        ))}
      </div>
      <CompletedWorkLink>{completedLinkLabel}</CompletedWorkLink>
    </div>
  );
};

export default InProgressTaskList;
