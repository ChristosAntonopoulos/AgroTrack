import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, GitCompare, Plus, SlidersHorizontal, X } from 'lucide-react';
import Button from '../Common/Button';
import ChronologioViewTabs from './ChronologioViewTabs';
import ChronologioFilterDrawer from './ChronologioFilterDrawer';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useAuth } from '../../context/AuthContext';
import { useActiveFieldAccess } from '../../hooks/useActiveFieldAccess';
import { getHarvestCapabilities } from '../../harvestCampaign/harvestCapabilities';
import type { Field } from '../../services/fieldService';
import {
  preferredCaptureTypeFromCategory,
  resolveChronologioCaptureDate,
} from '../../chronologio/captureContext';
import {
  viewFromZoom,
  VIEW_TO_ZOOM,
  type ChronologioView,
  type ChronologioZoom,
  type LivingFilters,
} from '../../chronologio/livingTypes';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { isListedGrove } from '../../utils/fieldDisplay';

type Props = {
  fieldMode: boolean;
  fieldName?: string;
  fieldId?: string;
  fields: Field[];
  filters: LivingFilters;
  zoom: ChronologioZoom;
  focusDate: string;
  compareOpen: boolean;
  embedded?: boolean;
  onBack?: () => void;
  onSetZoom: (z: ChronologioZoom) => void;
  onSetFilters: (f: Partial<LivingFilters>) => void;
  onCompareToggle: () => void;
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
 * Chronologio page chrome: title, capture, view tabs, jump-to-date, filter drawer.
 */
const ChronologioChrome: React.FC<Props> = ({
  fieldMode,
  fieldName,
  fieldId,
  fields,
  filters,
  zoom,
  focusDate,
  compareOpen,
  embedded = false,
  onBack,
  onSetZoom,
  onSetFilters,
  onCompareToggle,
  onJumpToDate,
}) => {
  const { t } = useTranslation(['chronologio', 'capture']);
  const { user } = useAuth();
  const activeField = useActiveFieldAccess();
  const capture = useCaptureOptional();
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
    if (filters.category && filters.category !== 'all') {
      chips.push({
        id: `type:${filters.category}`,
        label: t(`chronologio:${typeLabelKey(filters.category)}`),
        onRemove: () => onSetFilters({ category: 'all' }),
      });
    }
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

  const openCapture = () => {
    if (!capture) return;
    const { occurredAt, dateDefaultedToToday } = resolveChronologioCaptureDate({
      zoom,
      focusDate,
    });
    capture.openCapture({
      fieldId: filters.fieldId || fieldId || undefined,
      preferredType: preferredCaptureTypeFromCategory(filters.category),
      occurredAt,
      dateDefaultedToToday,
    });
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

          <div className="chrono-header-actions">
            {capture ? (
              <button type="button" className="chrono-capture-cta" onClick={openCapture}>
                <Plus size={18} aria-hidden />
                {t('chronologio:captureNew')}
              </button>
            ) : null}

            {zoom === 'years' ? (
              <Button
                variant="outline"
                size="sm"
                icon={<GitCompare size={15} />}
                aria-pressed={compareOpen}
                onClick={onCompareToggle}
              >
                {t('chronologio:living.compare')}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="chronologio-sticky chrono-locked-toolbar">
        <div className="chrono-toolbar-row">
          <ChronologioViewTabs view={view} onChange={setView} />
          <div className="chrono-toolbar-tools">
            {onJumpToDate ? (
              <label className="chrono-jump-date">
                <span className="chrono-control-label">{t('chronologio:living.jumpToDate')}</span>
                <span className="chrono-control-hint">{t('chronologio:dateControl.jumpNavigates')}</span>
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
