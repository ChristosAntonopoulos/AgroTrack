import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarFilters as CalendarFiltersType } from '../../services/calendarService';
import { Field } from '../../services/fieldService';
import './CalendarFilterBar.css';

interface CalendarFilterBarProps {
  fields: Field[];
  filters: CalendarFiltersType;
  selectedFieldId: string;
  onFieldChange: (fieldId: string) => void;
  onFiltersChange: (filters: CalendarFiltersType) => void;
}

const STATUS_OPTIONS = ['planned', 'ready', 'in_progress', 'blocked', 'completed', 'overdue'];

const CalendarFilterBar: React.FC<CalendarFilterBarProps> = ({
  fields,
  filters,
  selectedFieldId,
  onFieldChange,
  onFiltersChange,
}) => {
  const { t } = useTranslation('calendar');

  const handleMultiSelect = (key: 'statuses', value: string) => {
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

      {filters.statuses?.length ? (
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
      ) : null}
    </div>
  );
};

export default CalendarFilterBar;
