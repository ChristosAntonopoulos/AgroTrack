import React from 'react';
import { useTranslation } from 'react-i18next';
import { TASK_FORM_TYPES, type TaskFormTypeId } from '../../../utils/taskFormTypes';

interface TaskTypeSelectorProps {
  value: TaskFormTypeId | '';
  onChange: (value: TaskFormTypeId) => void;
}

const TaskTypeSelector: React.FC<TaskTypeSelectorProps> = ({ value, onChange }) => {
  const { t } = useTranslation('tasks');

  return (
    <div className="task-form-field">
      <p className="task-form-label" id="task-type-label">
        {t('fieldWork.form.typeLabel')}
      </p>
      <div className="task-type-grid" role="group" aria-labelledby="task-type-label">
        {TASK_FORM_TYPES.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`task-type-chip${value === option.id ? ' is-selected' : ''}`}
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TaskTypeSelector;
