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
import {
  MORE_FILTER_CATEGORIES,
  PRIMARY_RAIL_CATEGORIES,
  type MoreFilterCategory,
} from '../../chronologio/primaryCategories';
import type { LivingFilters } from '../../chronologio/livingTypes';
import {
  CHRONOLOGIO_TYPE_IDS,
  chronologioTypesParam,
  selectedChronologioTypes,
  type ChronologioTypeId,
} from '../../chronologio/categorySelection';
import type { Field } from '../../services/fieldService';
import { isListedGrove } from '../../utils/fieldDisplay';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { resolveFieldColor } from '../../utils/fieldColors';

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

const TYPE_OPTIONS: Array<{ id: ChronologioTypeId | 'all'; icon: React.ReactNode }> = [
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

const typeLabelKey = (id: string): string => {
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

/**
 * Advanced Chronologio filters — field scope and record types.
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
  const selectedTypes = selectedChronologioTypes(filters.category);
  const options = useMemo(
    () => TYPE_OPTIONS.filter((item) => item.id === 'all' || !(hideHarvest && item.id === 'harvest')),
    [hideHarvest]
  );
  const typeIds = CHRONOLOGIO_TYPE_IDS.filter((id) => !(hideHarvest && id === 'harvest'));
  const groveOptions = useMemo(() => {
    const listed = fields.filter(isListedGrove);
    if (filters.fieldId && !listed.some((field) => field.id === filters.fieldId)) {
      const selected = fields.find((field) => field.id === filters.fieldId);
      if (selected) return [selected, ...listed];
    }
    return listed;
  }, [fields, filters.fieldId]);

  const toggleType = (id: ChronologioTypeId | 'all') => {
    if (id === 'all') {
      onSetFilters({ category: 'all' });
      return;
    }
    const current = selectedTypes.includes(id)
      ? selectedTypes.filter((item) => item !== id)
      : [...selectedTypes, id];
    onSetFilters({ category: chronologioTypesParam(current) });
  };

  const hasActive = selectedTypes.length > 0 || Boolean(filters.fieldId);

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
      {!fieldMode && groveOptions.length > 0 ? (
        <section className="chrono-filter-section" aria-label={t('allFields')}>
          <div className="chrono-filter-type-grid" role="group">
            <button
              type="button"
              role="radio"
              aria-checked={!filters.fieldId}
              className={`chrono-filter-type-chip${!filters.fieldId ? ' is-selected' : ''}`}
              onClick={() => onSetFilters({ fieldId: '' })}
            >
              <span>{t('allFields')}</span>
            </button>
            {groveOptions.map((field) => {
              const selected = filters.fieldId === field.id;
              const color = resolveFieldColor(field.color, field.id);
              return (
                <button
                  key={field.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`chrono-filter-type-chip${selected ? ' is-selected' : ''}`}
                  onClick={() => onSetFilters({ fieldId: field.id })}
                >
                  <span className="chrono-filter-field-dot" style={{ background: color }} aria-hidden />
                  <span>{friendlyFieldLabel(field.name)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="chrono-filter-section" aria-labelledby="chrono-filter-type">
        <div className="chrono-filter-type-head">
          <h3 id="chrono-filter-type">{t('filtersTitle')}</h3>
          <div className="chrono-filter-type-actions">
            <button type="button" onClick={() => onSetFilters({ category: 'all' })}>
              {t('living.selectAllTypes')}
            </button>
            <button type="button" onClick={() => onSetFilters({ category: 'all' })}>
              {t('living.clearTypes')}
            </button>
          </div>
        </div>
        <p className="chrono-filter-type-note">
          {t('living.typesHint', { defaultValue: 'Pick what appears in History.' })}
        </p>
        <div className="chrono-filter-type-grid" role="group" aria-labelledby="chrono-filter-type">
          {options.map((item) => {
            const selected =
              item.id === 'all' ? selectedTypes.length === 0 : selectedTypes.includes(item.id as ChronologioTypeId);
            return (
              <button
                key={item.id}
                type="button"
                role="checkbox"
                aria-checked={selected}
                className={`chrono-filter-type-chip${selected ? ' is-selected' : ''}`}
                onClick={() => toggleType(item.id === 'all' ? 'all' : (item.id as ChronologioTypeId))}
              >
                {item.icon}
                <span>{t(typeLabelKey(item.id))}</span>
              </button>
            );
          })}
        </div>
        <p className="chrono-filter-type-note">
          {selectedTypes.length === 0
            ? t('living.allTypesOn')
            : t('living.typesOn', { count: selectedTypes.length, total: typeIds.length })}
        </p>
      </section>
    </RightDrawer>
  );
};

export default ChronologioFilterDrawer;
