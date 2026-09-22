import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  CloudSun,
  Eye,
  Image as ImageIcon,
  LayoutGrid,
  MapPinned,
  Users,
  Wallet,
  Wheat,
} from 'lucide-react';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import FieldScopeSelector from './FieldScopeSelector';
import {
  MORE_FILTER_CATEGORIES,
  PRIMARY_RAIL_CATEGORIES,
  type MoreFilterCategory,
} from '../../chronologio/primaryCategories';
import type { LivingFilters } from '../../chronologio/livingTypes';
import type { Field } from '../../services/fieldService';
import type { RailCategory } from './CategoryFilterRail';

type Props = {
  open: boolean;
  onClose: () => void;
  fieldMode: boolean;
  fields: Field[];
  filters: LivingFilters;
  hideHarvest?: boolean;
  onSetFilters: (partial: Partial<LivingFilters>) => void;
  onClearAll: () => void;
};

const TYPE_OPTIONS: Array<{ id: RailCategory; icon: React.ReactNode }> = [
  { id: 'all', icon: <LayoutGrid size={16} aria-hidden /> },
  { id: 'work', icon: <CheckSquare size={16} aria-hidden /> },
  { id: 'observation', icon: <Eye size={16} aria-hidden /> },
  { id: 'money', icon: <Wallet size={16} aria-hidden /> },
  { id: 'harvest', icon: <Wheat size={16} aria-hidden /> },
  { id: 'weather', icon: <CloudSun size={16} aria-hidden /> },
  { id: 'photo', icon: <ImageIcon size={16} aria-hidden /> },
  { id: 'field_change', icon: <MapPinned size={16} aria-hidden /> },
  { id: 'collaborator', icon: <Users size={16} aria-hidden /> },
];

const typeLabelKey = (id: RailCategory): string => {
  if (id === 'all' || PRIMARY_RAIL_CATEGORIES.includes(id as (typeof PRIMARY_RAIL_CATEGORIES)[number])) {
    return `primaryCategories.${id}`;
  }
  if (id === 'field_change') return 'primaryCategories.field_change';
  if (id === 'photo') return 'categories.photo';
  if (id === 'collaborator') return 'categories.collaborator';
  if (MORE_FILTER_CATEGORIES.includes(id as MoreFilterCategory)) {
    return `primaryCategories.${id}`;
  }
  return `primaryCategories.${id}`;
};

const railFromFilter = (category: LivingFilters['category']): RailCategory => {
  if (category === 'task') return 'work';
  if (category === 'note') return 'observation';
  if (category === 'expense' || category === 'income') return 'money';
  if (category === 'lifecycle') return 'field_change';
  if (category === 'photo' || category === 'collaborator') return category;
  if (
    category === 'all' ||
    PRIMARY_RAIL_CATEGORIES.includes(category as (typeof PRIMARY_RAIL_CATEGORIES)[number]) ||
    MORE_FILTER_CATEGORIES.includes(category as MoreFilterCategory)
  ) {
    return category as RailCategory;
  }
  return 'all';
};

/**
 * Advanced Chronologio filters in one drawer — field, type, light/heavy year.
 */
const ChronologioFilterDrawer: React.FC<Props> = ({
  open,
  onClose,
  fieldMode,
  fields,
  filters,
  hideHarvest = false,
  onSetFilters,
  onClearAll,
}) => {
  const { t } = useTranslation('chronologio');
  const selectedType = railFromFilter(filters.category);
  const options = useMemo(
    () => TYPE_OPTIONS.filter((item) => !(hideHarvest && item.id === 'harvest')),
    [hideHarvest]
  );

  const hasActive =
    (filters.category && filters.category !== 'all') ||
    Boolean(filters.fieldId) ||
    Boolean(filters.lifecycleYear);

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      resetKey="chrono-filters"
      size="md"
      accent
      className="chrono-filter-drawer"
      title={t('filters')}
      footer={
        <div className="chrono-filter-drawer-footer">
          <Button variant="outline" onClick={onClearAll} disabled={!hasActive}>
            {t('clearAllFilters')}
          </Button>
          <Button variant="primary" onClick={onClose}>
            {t('applyFilters')}
          </Button>
        </div>
      }
    >
      {!fieldMode && fields.length > 0 ? (
        <section className="chrono-filter-section" aria-labelledby="chrono-filter-field">
          <h3 id="chrono-filter-field">{t('living.field')}</h3>
          <FieldScopeSelector
            fields={fields}
            value={filters.fieldId}
            onChange={(next) => onSetFilters({ fieldId: next })}
            id="chrono-filter-field-select"
          />
        </section>
      ) : null}

      <section className="chrono-filter-section" aria-labelledby="chrono-filter-type">
        <h3 id="chrono-filter-type">{t('filtersTitle')}</h3>
        <div className="chrono-filter-type-grid" role="radiogroup" aria-labelledby="chrono-filter-type">
          {options.map((item) => {
            const selected = selectedType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`chrono-filter-type-chip chrono-category-chip--${item.id}${selected ? ' is-selected' : ''}`}
                onClick={() =>
                  onSetFilters({ category: item.id === 'all' ? 'all' : item.id })
                }
              >
                {item.icon}
                <span>{t(typeLabelKey(item.id))}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="chrono-filter-section" aria-labelledby="chrono-filter-lifecycle">
        <h3 id="chrono-filter-lifecycle">{t('living.lifecycleYear')}</h3>
        <div
          className="chrono-filter-type-grid"
          role="radiogroup"
          aria-labelledby="chrono-filter-lifecycle"
        >
          {(
            [
              { value: '', label: t('allSeasons') },
              { value: 'low', label: t('seasonLow') },
              { value: 'high', label: t('seasonHigh') },
            ] as const
          ).map((item) => {
            const selected = (filters.lifecycleYear || '') === item.value;
            return (
              <button
                key={item.value || 'all'}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`chrono-filter-type-chip${selected ? ' is-selected' : ''}`}
                onClick={() => onSetFilters({ lifecycleYear: item.value })}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </RightDrawer>
  );
};

export default ChronologioFilterDrawer;
