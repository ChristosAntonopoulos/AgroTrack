import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import Button from '../Common/Button';
import ChronologioViewTabs from './ChronologioViewTabs';
import ChronologioFilterDrawer from './ChronologioFilterDrawer';
import { useAuth } from '../../context/AuthContext';
import { useActiveFieldAccess } from '../../hooks/useActiveFieldAccess';
import { getHarvestCapabilities } from '../../harvestCampaign/harvestCapabilities';
import type { Field } from '../../services/fieldService';
import { selectedChronologioTypes } from '../../chronologio/categorySelection';
import {
  viewFromZoom,
  VIEW_TO_ZOOM,
  type ChronologioView,
  type ChronologioZoom,
  type LivingFilters,
} from '../../chronologio/livingTypes';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { isListedGrove } from '../../utils/fieldDisplay';
import {
  agriculturalYearFor,
  agriculturalYearSlashLabel,
} from '../../chronologio/agriculturalYear';
import { focusDateForPeriod } from '../../chronologio/livingTypes';
import type { ChronologioAxis } from '../../services/chronologioService';

type Props = {
  fieldMode: boolean;
  fieldName?: string;
  fieldId?: string;
  fields: Field[];
  filters: LivingFilters;
  zoom: ChronologioZoom;
  focusDate: string;
  periodYear: number;
  axis: ChronologioAxis;
  embedded?: boolean;
  onBack?: () => void;
  onSetZoom: (z: ChronologioZoom) => void;
  onSetFilters: (f: Partial<LivingFilters>) => void;
  onJumpToDate?: (isoDate: string) => void;
};

type ActiveChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

const typeLabelKey = (category: LivingFilters['category']): string => {
  if (category === 'all') return 'primaryCategories.all';
  if (category === 'task' || category === 'work') return 'primaryCategories.work';
  if (category === 'note' || category === 'observation') return 'primaryCategories.observation';
  if (category === 'expense' || category === 'income' || category === 'money') {
    return 'primaryCategories.money';
  }
  if (category === 'lifecycle' || category === 'field_change') return 'primaryCategories.field_change';
  if (category === 'photo') return 'categories.photo';
  if (category === 'collaborator') return 'categories.collaborator';
  if (category === 'harvest') return 'primaryCategories.harvest';
  if (category === 'weather') return 'primaryCategories.weather';
  return `categories.${category}`;
};

/**
 * Chronologio page chrome: title, view tabs, jump-to-date, filter drawer.
 */
const ChronologioChrome: React.FC<Props> = ({
  fieldMode,
  fieldName,
  fields,
  filters,
  zoom,
  focusDate,
  periodYear,
  axis,
  embedded = false,
  onBack,
  onSetZoom,
  onSetFilters,
  onJumpToDate,
}) => {
  const { t } = useTranslation(['chronologio']);
  const { user } = useAuth();
  const activeField = useActiveFieldAccess();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const view = viewFromZoom(zoom);

  const hideHarvest = useMemo(() => {
    const caps = getHarvestCapabilities({
      hasAnyFieldAccess: fields.length > 0 || Boolean(activeField.fieldId),
      canOwn:
        user?.role === 'FieldOwner' ||
        user?.role === 'Administrator' ||
        activeField.ownsAnyField,
      canWork:
        user?.role === 'Producer' ||
        user?.role === 'FieldOwner' ||
        user?.role === 'Administrator' ||
        activeField.isCollaboratorOnActive,
      familyModules: activeField.modules,
      accessLevel: activeField.accessLevel,
      harvestModuleGranted:
        !activeField.modules ||
        activeField.modules.size === 0 ||
        activeField.modules.has('harvest') ||
        activeField.isAdminOnActive,
    });
    return !caps.canUseChronologioHarvest;
  }, [fields.length, user, activeField]);

  const activeChips = useMemo((): ActiveChip[] => {
    const chips: ActiveChip[] = [];
    selectedChronologioTypes(filters.category).forEach((typeId) => {
      chips.push({
        id: `type:${typeId}`,
        label: t(`chronologio:${typeLabelKey(typeId)}`),
        onRemove: () => {
          const next = selectedChronologioTypes(filters.category).filter((id) => id !== typeId);
          onSetFilters({ category: next.length ? next.join(',') : 'all' });
        },
      });
    });
    if (!fieldMode && filters.fieldId) {
      const field = fields.find((f) => f.id === filters.fieldId);
      chips.push({
        id: `field:${filters.fieldId}`,
        label: field ? friendlyFieldLabel(field.name) : t('chronologio:living.field'),
        onRemove: () => onSetFilters({ fieldId: '' }),
      });
    }
    if (filters.lifecycleYear === 'low' || filters.lifecycleYear === 'high') {
      chips.push({
        id: `lifecycle:${filters.lifecycleYear}`,
        label:
          filters.lifecycleYear === 'low'
            ? t('chronologio:seasonLow')
            : t('chronologio:seasonHigh'),
        onRemove: () => onSetFilters({ lifecycleYear: '' }),
      });
    }
    return chips;
  }, [fieldMode, fields, filters, onSetFilters, t]);

  const activeFilterCount = activeChips.length;

  const setView = (next: ChronologioView) => {
    onSetZoom(VIEW_TO_ZOOM[next]);
  };

  const clearAllFilters = () => {
    onSetFilters({ category: 'all', fieldId: '', lifecycleYear: '' });
  };

  const TitleTag = embedded ? 'h2' : 'h1';
  const listedFields = fields.filter(isListedGrove);

  return (
    <>
      <header className="chronologio-header chrono-locked-header">
        {fieldMode && onBack && !embedded ? (
          <div className="chronologio-header-back">
            <Button variant="outline" size="sm" icon={<ArrowLeft size={16} />} onClick={onBack}>
              {fieldName || t('chronologio:backToField')}
            </Button>
          </div>
        ) : null}

        <div className="chrono-header-top">
          <div className="chrono-header-copy">
            <TitleTag>{t('chronologio:title')}</TitleTag>
            <p className="chronologio-tagline">
              {fieldMode ? t('chronologio:taglineField') : t('chronologio:taglineGlobal')}
            </p>
            {fieldMode && !embedded && fieldName ? (
              <p className="chrono-field-locked">{fieldName}</p>
            ) : null}
          </div>
        </div>
        {zoom === 'year' ? (
          <div className="chrono-year-mode-tabs">
            <ChronologioViewTabs view={view} onChange={setView} />
          </div>
        ) : null}
      </header>

      <div className={`chronologio-sticky chrono-locked-toolbar${zoom === 'year' ? ' is-year-nav' : ''}`}>
        <div className="chrono-toolbar-row">
          {zoom === 'year' ? (
            <span className="chrono-year-nav-label">{t('chronologio:living.views.months')}</span>
          ) : (
            <ChronologioViewTabs view={view} onChange={setView} />
          )}
          <div className="chrono-toolbar-tools">
            {zoom === 'year' && onJumpToDate ? (
              <div className="chrono-year-stepper" role="group" aria-label={t('chronologio:dateControl.agriYearOpens')}>
                <button
                  type="button"
                  onClick={() => onJumpToDate(focusDateForPeriod(periodYear - 1, axis))}
                  aria-label={t('chronologio:timeline.jumpToMonth', {
                    month: String(periodYear - 1),
                  })}
                >
                  <ChevronLeft size={18} aria-hidden />
                </button>
                <strong>
                  {axis === 'agricultural'
                    ? agriculturalYearSlashLabel(periodYear).replace('/', '–')
                    : periodYear}
                </strong>
                <button
                  type="button"
                  disabled={
                    periodYear >=
                    (axis === 'agricultural' ? agriculturalYearFor(new Date()) : new Date().getFullYear())
                  }
                  onClick={() => onJumpToDate(focusDateForPeriod(periodYear + 1, axis))}
                  aria-label={t('chronologio:timeline.jumpToMonth', {
                    month: String(periodYear + 1),
                  })}
                >
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>
            ) : null}
            {zoom === 'year' && !fieldMode && listedFields.length > 1 ? (
              <label className="chrono-year-field">
                <span className="sr-only">{t('chronologio:allFields')}</span>
                <select
                  value={filters.fieldId}
                  aria-label={t('chronologio:allFields')}
                  onChange={(event) => onSetFilters({ fieldId: event.target.value })}
                >
                  <option value="">{t('chronologio:allFields')}</option>
                  {listedFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {friendlyFieldLabel(field.name)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {zoom !== 'year' && onJumpToDate ? (
              <label className="chrono-jump-date">
                <span className="chrono-control-label">{t('chronologio:living.jumpToDate')}</span>
                <input
                  type="date"
                  value={focusDate.slice(0, 10)}
                  aria-label={t('chronologio:living.jumpToDate')}
                  aria-describedby="chrono-jump-date-hint"
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next) onJumpToDate(next);
                  }}
                />
                <span id="chrono-jump-date-hint" className="sr-only">
                  {t('chronologio:dateControl.jumpNavigates')}
                </span>
              </label>
            ) : null}

            <button
              type="button"
              className={`chrono-filters-trigger${activeFilterCount > 0 ? ' is-active' : ''}`}
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={18} aria-hidden />
              <span>
                {activeFilterCount > 0
                  ? t('chronologio:filtersCount', { count: activeFilterCount })
                  : t('chronologio:filters')}
              </span>
            </button>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="chrono-active-filters" role="group" aria-label={t('chronologio:activeFilters')}>
            <ul className="chrono-active-filter-list">
              {activeChips.map((chip) => (
                <li key={chip.id}>
                  <button
                    type="button"
                    className="chrono-active-filter-chip"
                    onClick={chip.onRemove}
                    aria-label={t('chronologio:removeFilter', { label: chip.label })}
                  >
                    <span>{chip.label}</span>
                    <X size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="chrono-clear-all-filters" onClick={clearAllFilters}>
              {t('chronologio:clearAllFilters')}
            </button>
          </div>
        ) : null}
      </div>

      <ChronologioFilterDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        fieldMode={fieldMode}
        fields={listedFields}
        filters={filters}
        hideHarvest={hideHarvest}
        onSetFilters={onSetFilters}
        onClearAll={() => {
          clearAllFilters();
        }}
      />
    </>
  );
};

export default ChronologioChrome;
