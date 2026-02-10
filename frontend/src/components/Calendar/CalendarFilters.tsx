import React from 'react';
import { CalendarFilters as CalendarFiltersType } from '../../services/calendarService';
import { Field } from '../../services/fieldService';
import { Filter, X } from 'lucide-react';
import './CalendarFilters.css';

interface CalendarFiltersProps {
  fields: Field[];
  filters: CalendarFiltersType;
  onFiltersChange: (filters: CalendarFiltersType) => void;
}

const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  fields,
  filters,
  onFiltersChange,
}) => {
  const taskTypes = ['Pruning', 'Harvesting', 'Fertilization', 'Irrigation', 'Pest Control', 'Soil Testing'];
  const statuses = ['pending', 'in_progress', 'completed'];

  const handleFieldToggle = (fieldId: string) => {
    const currentFieldIds = filters.fieldIds || [];
    const newFieldIds = currentFieldIds.includes(fieldId)
      ? currentFieldIds.filter(id => id !== fieldId)
      : [...currentFieldIds, fieldId];
    onFiltersChange({ ...filters, fieldIds: newFieldIds });
  };

  const handleTaskTypeToggle = (type: string) => {
    const currentTypes = filters.taskTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    onFiltersChange({ ...filters, taskTypes: newTypes });
  };

  const handleStatusToggle = (status: string) => {
    const currentStatuses = filters.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const clearFilters = () => {
    onFiltersChange({
      showTasks: true,
      showLifecycles: true,
      showDeadlines: true,
    });
  };

  const hasActiveFilters = 
    (filters.fieldIds && filters.fieldIds.length > 0) ||
    (filters.taskTypes && filters.taskTypes.length > 0) ||
    (filters.statuses && filters.statuses.length > 0);

  return (
    <div className="calendar-filters">
      <div className="filters-header">
        <Filter />
        <span>Filters</span>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="clear-filters-btn">
            <X /> Clear
          </button>
        )}
      </div>

      <div className="filters-section">
        <label>Fields</label>
        <div className="filter-checkboxes">
          {fields.map(field => (
            <label key={field.id} className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.fieldIds?.includes(field.id) || false}
                onChange={() => handleFieldToggle(field.id)}
              />
              <span>{field.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filters-section">
        <label>Task Types</label>
        <div className="filter-checkboxes">
          {taskTypes.map(type => (
            <label key={type} className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.taskTypes?.includes(type) || false}
                onChange={() => handleTaskTypeToggle(type)}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filters-section">
        <label>Status</label>
        <div className="filter-checkboxes">
          {statuses.map(status => (
            <label key={status} className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.statuses?.includes(status) || false}
                onChange={() => handleStatusToggle(status)}
              />
              <span>{status.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filters-section">
        <label>Event Types</label>
        <div className="filter-checkboxes">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showTasks !== false}
              onChange={(e) => onFiltersChange({ ...filters, showTasks: e.target.checked })}
            />
            <span>Tasks</span>
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showDeadlines !== false}
              onChange={(e) => onFiltersChange({ ...filters, showDeadlines: e.target.checked })}
            />
            <span>Deadlines</span>
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showLifecycles !== false}
              onChange={(e) => onFiltersChange({ ...filters, showLifecycles: e.target.checked })}
            />
            <span>Lifecycle Events</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CalendarFilters;
