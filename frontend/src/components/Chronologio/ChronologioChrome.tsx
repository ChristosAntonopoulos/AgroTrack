import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, GitCompare, Plus } from 'lucide-react';
import Button from '../Common/Button';
import ChronologioViewTabs from './ChronologioViewTabs';
import CategoryFilterRail, { type RailCategory } from './CategoryFilterRail';
import FieldScopeSelector from './FieldScopeSelector';
import { useCaptureOptional } from '../../context/CaptureContext';
import type { Field } from '../../services/fieldService';
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
  compareOpen: boolean;
  embedded?: boolean;
  onBack?: () => void;
  onSetZoom: (z: ChronologioZoom) => void;
  onOpenJournal?: () => void;
  onSetFilters: (f: Partial<LivingFilters>) => void;
  onCompareToggle: () => void;
};

const railFromFilter = (category: LivingFilters['category']): RailCategory => {
  if (category === 'task') return 'work';
  if (category === 'note' || category === 'photo') return 'observation';
  if (category === 'expense' || category === 'income') return 'money';
  if (
    category === 'all' ||
    category === 'work' ||
    category === 'observation' ||
    category === 'money' ||
    category === 'harvest' ||
    category === 'weather'
  ) {
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
  compareOpen,
  embedded = false,
  onBack,
  onSetZoom,
  onOpenJournal,
  onSetFilters,
  onCompareToggle,
}) => {
  const { t } = useTranslation(['chronologio', 'capture']);
  const capture = useCaptureOptional();
  const view = viewFromZoom(zoom);
  const railCategory = railFromFilter(filters.category);

  const setView = (next: ChronologioView) => {
    if (next === 'days' && onOpenJournal) {
      onOpenJournal();
      return;
    }
    onSetZoom(VIEW_TO_ZOOM[next]);
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
              <button
                type="button"
                className="chrono-capture-cta"
                onClick={() =>
                  capture.openCapture({
                    fieldId: filters.fieldId || fieldId || undefined,
                  })
                }
              >
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
        <CategoryFilterRail
          value={railCategory}
          onChange={(category) => onSetFilters({ category: category === 'all' ? 'all' : category })}
        />
      </div>
    </>
  );
};

export default ChronologioChrome;
