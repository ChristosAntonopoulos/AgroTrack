import React, { useState } from 'react';
import type { Field } from '../../services/fieldService';
import { X } from 'lucide-react';

interface TaskContextBarProps {
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  scopeLabel: string;
  scope: 'mine' | 'everyone';
  mineLabel: string;
  everyoneLabel: string;
  onScopeChange: (scope: 'mine' | 'everyone') => void;
  fieldLabel: string;
  allFieldsLabel: string;
  fieldId: string;
  fields: Field[];
  onFieldChange: (fieldId: string) => void;
  assigneeLabel: string;
  allAssigneesLabel: string;
  assigneeId: string;
  assignees: Array<{ id: string; name: string }>;
  onAssigneeChange: (assigneeId: string) => void;
  yearLabel: string;
  year: number;
  years: number[];
  defaultYear: number;
  onYearChange: (year: number) => void;
  moreFiltersLabel: string;
  clearFieldLabel: string;
  clearAssigneeLabel: string;
  clearYearLabel: string;
}

const TaskContextBar: React.FC<TaskContextBarProps> = ({
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  scopeLabel,
  scope,
  mineLabel,
  everyoneLabel,
  onScopeChange,
  fieldLabel,
  allFieldsLabel,
  fieldId,
  fields,
  onFieldChange,
  assigneeLabel,
  allAssigneesLabel,
  assigneeId,
  assignees,
  onAssigneeChange,
  yearLabel,
  year,
  years,
  defaultYear,
  onYearChange,
  moreFiltersLabel,
  clearFieldLabel,
  clearAssigneeLabel,
  clearYearLabel,
}) => {
  const [moreOpen, setMoreOpen] = useState(year !== defaultYear || Boolean(assigneeId));
  const yearChanged = year !== defaultYear;
  const fieldChanged = Boolean(fieldId);
  const assigneeChanged = Boolean(assigneeId);
  const selectedField = fields.find((field) => field.id === fieldId);
  const selectedAssignee = assignees.find((person) => person.id === assigneeId);

  return (
    <div className="tasks-toolbar">
      <div className="tasks-toolbar-row">
        <label className="tasks-toolbar-search">
          <span className="tasks-sr-only">{searchLabel}</span>
          <input
            className="notebook-search"
            type="search"
            value={searchValue}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <div className="notebook-scope" role="group" aria-label={scopeLabel}>
          <button
            type="button"
            className={scope === 'mine' ? 'is-active' : ''}
            aria-pressed={scope === 'mine'}
            onClick={() => onScopeChange('mine')}
          >
            {mineLabel}
          </button>
          <button
            type="button"
            className={scope === 'everyone' ? 'is-active' : ''}
            aria-pressed={scope === 'everyone'}
            onClick={() => onScopeChange('everyone')}
          >
            {everyoneLabel}
          </button>
        </div>
        <label className="tasks-context-control tasks-toolbar-field">
          <span className="tasks-sr-only">{fieldLabel}</span>
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
        <button
          type="button"
          className="tasks-context-more"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          {moreFiltersLabel}
        </button>
      </div>

      {moreOpen ? (
        <div className="tasks-context-more-panel">
          <label className="tasks-context-control">
            <span className="tasks-context-label">{assigneeLabel}</span>
            <select
              value={assigneeId}
              onChange={(event) => onAssigneeChange(event.target.value)}
              aria-label={assigneeLabel}
            >
              <option value="">{allAssigneesLabel}</option>
              {assignees.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
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
        </div>
      ) : null}

      {yearChanged || fieldChanged || assigneeChanged ? (
        <div className="tasks-context-chips">
          {fieldChanged ? (
            <button type="button" className="tasks-context-chip" onClick={() => onFieldChange('')}>
              <span>{selectedField?.name || fieldId}</span>
              <X size={16} aria-hidden />
              <span className="tasks-sr-only">{clearFieldLabel}</span>
            </button>
          ) : null}
          {assigneeChanged ? (
            <button
              type="button"
              className="tasks-context-chip"
              onClick={() => onAssigneeChange('')}
            >
              <span>{selectedAssignee?.name || assigneeId}</span>
              <X size={16} aria-hidden />
              <span className="tasks-sr-only">{clearAssigneeLabel}</span>
            </button>
          ) : null}
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
        </div>
      ) : null}
    </div>
  );
};

export default TaskContextBar;
