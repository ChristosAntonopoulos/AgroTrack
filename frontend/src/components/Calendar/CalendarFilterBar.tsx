import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarFilters as CalendarFiltersType } from '../../services/calendarService';
import { Field } from '../../services/fieldService';
import { TASK_CATEGORIES, TASK_PRIORITIES } from '../../utils/taskTemplateUtils';
import './CalendarFilterBar.css';

interface CalendarFilterBarProps {
  fields: Field[];
  filters: CalendarFiltersType;
  selectedFieldId: string;
  onFieldChange: (fieldId: string) => void;
  onFiltersChange: (filters: CalendarFiltersType) => void;
}

const STATUS_OPTIONS = ['pending', 'in_progress', 'completed', 'overdue'];

const CalendarFilterBar: React.FC<CalendarFilterBarProps> = ({
  fields,
  filters,
  selectedFieldId,
  onFieldChange,
  onFiltersChange,
}) => {
  const { t } = useTranslation('calendar');

  const handleMultiSelect = (
    key: 'statuses' | 'priorities' | 'categories',
    value: string
  ) => {
    const current = filters[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: next.length ? next : undefined });
  };

  return (
    <div className="cal-filter-bar" role="group" aria-label={t('filters')}>
      <label className="cal-filter-bar-item">
        <span>{t('filterField')}</span>
        <select
          value={selectedFieldId}
          onChange={(e) => onFieldChange(e.target.value)}
          aria-label={t('fieldLabel')}
        >
          <option value="">{t('allFields')}</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>

      <label className="cal-filter-bar-item">
        <span>{t('filterStatus')}</span>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) handleMultiSelect('statuses', e.target.value);
            e.target.value = '';
          }}
          aria-label={t('filterStatus')}
        >
          <option value="">{filters.statuses?.length ? filters.statuses.join(', ') : t('allStatuses')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`, { defaultValue: s.replace('_', ' ') })}
            </option>
          ))}
        </select>
      </label>

      <label className="cal-filter-bar-item">
        <span>{t('filterPriority')}</span>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) handleMultiSelect('priorities', e.target.value);
            e.target.value = '';
          }}
          aria-label={t('filterPriority')}
        >
          <option value="">{filters.priorities?.length ? filters.priorities.join(', ') : t('allPriorities')}</option>
          {TASK_PRIORITIES.filter((p) => p !== 'All').map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label className="cal-filter-bar-item">
        <span>{t('filterCategory')}</span>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) handleMultiSelect('categories', e.target.value);
            e.target.value = '';
          }}
          aria-label={t('filterCategory')}
        >
          <option value="">{filters.categories?.length ? filters.categories.join(', ') : t('allCategories')}</option>
          {TASK_CATEGORIES.filter((c) => c !== 'All').map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {(filters.statuses?.length || filters.priorities?.length || filters.categories?.length) && (
        <button
          type="button"
          className="cal-filter-bar-clear"
          onClick={() =>
            onFiltersChange({
              ...filters,
              statuses: undefined,
              priorities: undefined,
              categories: undefined,
            })
          }
        >
          {t('clearFilters')}
        </button>
      )}
    </div>
  );
};

export default CalendarFilterBar;
