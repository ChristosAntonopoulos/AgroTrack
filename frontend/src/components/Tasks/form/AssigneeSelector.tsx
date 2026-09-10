import React from 'react';
import { useTranslation } from 'react-i18next';

export type AssigneeOption = {
  key: string;
  label: string;
  hint?: string;
};

interface AssigneeSelectorProps {
  options: AssigneeOption[];
  value: string;
  onChange: (key: string) => void;
}

const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({ options, value, onChange }) => {
  const { t } = useTranslation('tasks');

  return (
    <div className="task-form-field">
      <p className="task-form-label" id="task-assignee-label">
        {t('fieldWork.form.whoQuestion')}
      </p>
      <div className="task-field-list" role="radiogroup" aria-labelledby="task-assignee-label">
        {options.map((option) => {
          const selected = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`task-assignee-option${selected ? ' is-selected' : ''}`}
              onClick={() => onChange(option.key)}
            >
              <strong>{option.label}</strong>
              {option.hint ? <span>{option.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AssigneeSelector;
