import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import {
  TaskTemplateFilters as Filters,
  TaskTemplateCategory,
  TaskTemplatePriority,
  TaskTemplateSeason,
} from '../../types/oliveTaskTemplate';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_SEASONS } from '../../utils/taskTemplateUtils';
import { useTaskTemplateLabels } from '../../hooks/useLocalizedTaskTemplate';
import './TaskTemplateFilters.css';

interface TaskTemplateFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  recommendedCount: number;
}

const TaskTemplateFilters: React.FC<TaskTemplateFiltersProps> = ({
  filters,
  onChange,
  recommendedCount,
}) => {
  const { t } = useTranslation('taskTemplates');
  const labels = useTaskTemplateLabels();
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="tt-filters">
      <div className="tt-filters-row tt-filters-search-row">
        <div className="tt-search-wrap">
          <Search className="tt-search-icon" size={18} />
          <input
            type="search"
            className="tt-search-input"
            placeholder={t('filters.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            aria-label={t('filters.searchPlaceholder')}
          />
        </div>
        {recommendedCount > 0 && (
          <span className="tt-recommended-count">
            {t('filters.recommendedCount', { count: recommendedCount })}
          </span>
        )}
      </div>

      <div className="tt-filters-row tt-filters-controls">
        <label className="tt-filter-field">
          <span>{t('filters.category')}</span>
          <select
            value={filters.category}
            onChange={(e) => update({ category: e.target.value as TaskTemplateCategory | 'All' })}
          >
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labels.categoryLabel(c)}
              </option>
            ))}
          </select>
        </label>

        <label className="tt-filter-field">
          <span>{t('filters.season')}</span>
          <select
            value={filters.season}
            onChange={(e) => update({ season: e.target.value as TaskTemplateSeason })}
          >
            {TASK_SEASONS.map((s) => (
              <option key={s} value={s}>
                {labels.seasonLabel(s)}
              </option>
            ))}
          </select>
        </label>

        <label className="tt-filter-field">
          <span>{t('filters.priority')}</span>
          <select
            value={filters.priority}
            onChange={(e) => update({ priority: e.target.value as TaskTemplatePriority | 'All' })}
          >
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {labels.priorityLabel(p)}
              </option>
            ))}
          </select>
        </label>

        <label className="tt-filter-toggle">
          <input
            type="checkbox"
            checked={filters.recommendedOnly}
            onChange={(e) => update({ recommendedOnly: e.target.checked })}
          />
          <span>{t('filters.recommendedOnly')}</span>
        </label>

        <label className="tt-filter-toggle">
          <input
            type="checkbox"
            checked={filters.fieldSuitableOnly}
            onChange={(e) => update({ fieldSuitableOnly: e.target.checked })}
          />
          <span>{t('filters.fieldSuitableOnly')}</span>
        </label>
      </div>
    </div>
  );
};

export default TaskTemplateFilters;
