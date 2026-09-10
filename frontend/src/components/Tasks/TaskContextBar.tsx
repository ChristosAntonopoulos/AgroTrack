import React from 'react';
import { X } from 'lucide-react';
import type { Field } from '../../services/fieldService';

interface TaskContextBarProps {
  yearLabel: string;
  year: number;
  years: number[];
  defaultYear: number;
  fieldLabel: string;
  allFieldsLabel: string;
  fieldId: string;
  fields: Field[];
  onYearChange: (year: number) => void;
  onFieldChange: (fieldId: string) => void;
  clearYearLabel: string;
  clearFieldLabel: string;
}

const TaskContextBar: React.FC<TaskContextBarProps> = ({
  yearLabel,
  year,
  years,
  defaultYear,
  fieldLabel,
  allFieldsLabel,
  fieldId,
  fields,
  onYearChange,
  onFieldChange,
  clearYearLabel,
  clearFieldLabel,
}) => {
  const yearChanged = year !== defaultYear;
  const fieldChanged = Boolean(fieldId);
  const selectedField = fields.find((field) => field.id === fieldId);

  return (
    <div className="tasks-context-bar">
      <div className="tasks-context-controls">
        <label className="tasks-context-control">
          <span className="tasks-context-label">{yearLabel}</span>
          <select
            value={year}
            onChange={(event) => onYearChange(Number(event.target.value))}
            aria-label={yearLabel}
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="tasks-context-control">
          <span className="tasks-context-label">{fieldLabel}</span>
          <select
            value={fieldId}
            onChange={(event) => onFieldChange(event.target.value)}
            aria-label={fieldLabel}
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
      {yearChanged || fieldChanged ? (
        <div className="tasks-context-chips">
          {yearChanged ? (
            <button
              type="button"
              className="tasks-context-chip"
              onClick={() => onYearChange(defaultYear)}
            >
              <span>
                {yearLabel}: {year}
              </span>
              <X size={16} aria-hidden />
              <span className="tasks-sr-only">{clearYearLabel}</span>
            </button>
          ) : null}
          {fieldChanged ? (
            <button
              type="button"
              className="tasks-context-chip"
              onClick={() => onFieldChange('')}
            >
              <span>{selectedField?.name || fieldId}</span>
              <X size={16} aria-hidden />
              <span className="tasks-sr-only">{clearFieldLabel}</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default TaskContextBar;
