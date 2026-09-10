import React from 'react';
import EmptyState from '../Common/EmptyState';

interface TasksEmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

const TasksEmptyState: React.FC<TasksEmptyStateProps> = ({ title, description, action }) => (
  <EmptyState title={title} description={description} action={action} className="tasks-empty-state" />
);

export default TasksEmptyState;
