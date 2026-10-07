import React from 'react';
import { Plus } from 'lucide-react';
import Button from '../Common/Button';

interface TasksPageHeaderProps {
  title: string;
  subtitle: string;
  newTaskLabel: string;
  newTaskTo: string;
  /** When false, hide create — Family/view seats must not start new tasks. */
  canCreateTasks?: boolean;
}

const TasksPageHeader: React.FC<TasksPageHeaderProps> = ({
  title,
  subtitle,
  newTaskLabel,
  newTaskTo,
  canCreateTasks = true,
}) => (
  <header className="tasks-shell-header">
    <div className="tasks-shell-header-text">
      <h1 className="tasks-shell-title">{title}</h1>
      <p className="tasks-shell-subtitle">{subtitle}</p>
    </div>
    {canCreateTasks ? (
      <div className="tasks-shell-header-actions">
        <Button to={newTaskTo} icon={<Plus />} variant="primary" size="lg">
          {newTaskLabel}
        </Button>
      </div>
    ) : null}
  </header>
);

export default TasksPageHeader;
