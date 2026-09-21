import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, GitCompare, Plus } from 'lucide-react';
import Button from '../Common/Button';
import ChronologioViewTabs from './ChronologioViewTabs';
import CategoryFilterRail, { type RailCategory } from './CategoryFilterRail';
import FieldScopeSelector from './FieldScopeSelector';
import { useCaptureOptional } from '../../context/CaptureContext';
import { useAuth } from '../../context/AuthContext';
import { useActiveFieldAccess } from '../../hooks/useActiveFieldAccess';
import { getHarvestCapabilities } from '../../harvestCampaign/harvestCapabilities';
import type { Field } from '../../services/fieldService';
import {
  preferredCaptureTypeFromCategory,
  resolveChronologioCaptureDate,
} from '../../chronologio/captureContext';
import { isMoreFilterCategory, isPrimaryRailCategory } from '../../chronologio/primaryCategories';
import {
  viewFromZoom,
  VIEW_TO_ZOOM,
  type ChronologioView,
  type ChronologioZoom,
  type LivingFilters,
} from '../../chronologio/livingTypes';

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

const railFromFilter = (category: LivingFilters['category']): RailCategory => {
  if (category === 'task') return 'work';
  if (category === 'note') return 'observation';
  if (category === 'expense' || category === 'income') return 'money';
  if (category === 'lifecycle') return 'field_change';
  if (category === 'photo' || category === 'collaborator') return category;
  if (isMoreFilterCategory(category) || isPrimaryRailCategory(category) || category === 'all') {
    return category;
  }
  return 'all';
};

/**
 * Chronologio page chrome: title, field scope, capture, view tabs, category rail.
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
  const view = viewFromZoom(zoom);
  const railCategory = railFromFilter(filters.category);
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

  const setView = (next: ChronologioView) => {
    onSetZoom(VIEW_TO_ZOOM[next]);
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
          </div>

          <div className="chrono-header-actions">
            {!fieldMode ? (
              <FieldScopeSelector
                fields={fields}
                value={filters.fieldId}
                onChange={(next) => onSetFilters({ fieldId: next })}
              />
            ) : embedded ? null : (
              <p className="chrono-field-locked">{fieldName}</p>
            )}

            {capture ? (
              <button type="button" className="chrono-capture-cta" onClick={openCapture}>
                <Plus size={18} aria-hidden />
                {t('chronologio:captureNew')}
              </button>
            ) : null}

            {zoom === 'years' ? (
              <Button
                variant={compareOpen ? 'primary' : 'outline'}
                size="sm"
                icon={<GitCompare size={15} />}
                onClick={onCompareToggle}
              >
                {t('chronologio:living.compare')}
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="chronologio-sticky chrono-locked-toolbar">
        <ChronologioViewTabs view={view} onChange={setView} />
        {onJumpToDate ? (
          <label className="chrono-jump-date">
            <span className="sr-only">{t('chronologio:living.jumpToDate')}</span>
            <input
              type="date"
              value={focusDate.slice(0, 10)}
              aria-label={t('chronologio:living.jumpToDate')}
              onChange={(e) => {
                const next = e.target.value;
                if (next) onJumpToDate(next);
              }}
            />
          </label>
        ) : null}
        <CategoryFilterRail
          value={railCategory}
          hideHarvest={hideHarvest}
          onChange={(category) => onSetFilters({ category: category === 'all' ? 'all' : category })}
        />
      </div>
    </>
  );
};

export default ChronologioChrome;
