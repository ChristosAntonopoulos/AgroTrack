import React from 'react';
import { Plus } from 'lucide-react';
import Button from '../Common/Button';
import type { Field } from '../../services/fieldService';

interface TasksPageHeaderProps {
  title: string;
  newTaskLabel: string;
  canCreateTasks?: boolean;
  onNewTask: () => void;
  fieldLabel: string;
  allFieldsLabel: string;
  fieldId: string;
  fields: Field[];
  onFieldChange: (fieldId: string) => void;
}

const TasksPageHeader: React.FC<TasksPageHeaderProps> = ({
  title,
  newTaskLabel,
  canCreateTasks = true,
  onNewTask,
  fieldLabel,
  allFieldsLabel,
  fieldId,
  fields,
  onFieldChange,
}) => (
  <header className="tasks-shell-header">
    <div className="tasks-shell-header-text">
      <h1 className="tasks-shell-title">{title}</h1>
      <label className="tasks-header-field">
        <span className="tasks-sr-only">{fieldLabel}</span>
        <select
          aria-label={fieldLabel}
          value={fieldId}
          onChange={(event) => onFieldChange(event.target.value)}
        >
          <option value="">{allFieldsLabel}</option>
          {fields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name}
            </option>
          ))}
        </select>
      </label>
    </div>
    {canCreateTasks ? (
      <div className="tasks-shell-header-actions">
        <Button icon={<Plus />} variant="primary" size="lg" onClick={onNewTask}>
          {newTaskLabel}
        </Button>
      </div>
    ) : null}
  </header>
);

export default TasksPageHeader;
