import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Filter, GitCompare, X } from 'lucide-react';
import Button from '../Common/Button';
import ChronologioZoomBar from './ChronologioZoomBar';
import type { ChronologioAxis, ChronologioCategory } from '../../services/chronologioService';
import type { Field } from '../../services/fieldService';
import type { ChronologioZoom, LivingFilters } from '../../chronologio/livingTypes';

const FILTER_CATEGORIES: Array<ChronologioCategory | 'all'> = [
  'all',
  'task',
  'expense',
  'harvest',
  'note',
  'weather',
  'intelligence',
  'lifecycle',
];

type Props = {
  fieldMode: boolean;
  fieldName?: string;
  fields: Field[];
  filters: LivingFilters;
  axis: ChronologioAxis;
  zoom: ChronologioZoom;
  compareOpen: boolean;
  embedded?: boolean;
  onBack?: () => void;
  onSetZoom: (z: ChronologioZoom) => void;
  onOpenJournal?: () => void;
  onSetAxis: (a: ChronologioAxis) => void;
  onSetFilters: (f: Partial<LivingFilters>) => void;
  onClearFilters: () => void;
  onCompareToggle: () => void;
};

/**
 * Locked shell: title → tagline → field → zoom | filters | contextual Compare.
 * No persistent Capture (global header owns Καταγραφή).
 */
const ChronologioChrome: React.FC<Props> = ({
  fieldMode,
  fieldName,
  fields,
  filters,
  axis,
  zoom,
  compareOpen,
  embedded = false,
  onBack,
  onSetZoom,
  onOpenJournal,
  onSetAxis,
  onSetFilters,
  onClearFilters,
  onCompareToggle,
}) => {
  const { t } = useTranslation(['chronologio', 'capture']);
  const reduceMotion = useReducedMotion();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [filtersOpen]);

  const filtersDirty = Boolean(
    (!fieldMode && filters.fieldId) || filters.lifecycleYear || filters.category !== 'all'
  );

  const showCompare = zoom === 'years';

  const categoryChip =
    filters.category !== 'all' ? (
      <button
        type="button"
        className="chrono-active-chip"
        onClick={() => onSetFilters({ category: 'all' })}
      >
        {t(`chronologio:categories.${filters.category}`)}
        <X size={12} aria-hidden />
      </button>
    ) : null;

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
        <TitleTag>{t('chronologio:title')}</TitleTag>
        <p className="chronologio-tagline">
          {fieldMode ? t('chronologio:taglineField') : t('chronologio:taglineGlobal')}
        </p>

        {!fieldMode ? (
          <div className="chrono-field-row">
            <label className="sr-only" htmlFor="chrono-field-select">
              {t('chronologio:allFields')}
            </label>
            <select
              id="chrono-field-select"
              className="chronologio-select chrono-field-select"
              value={filters.fieldId || ''}
              onChange={(e) => onSetFilters({ fieldId: e.target.value })}
            >
              <option value="">{t('chronologio:allFields')}</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        ) : embedded ? null : (
          <p className="chrono-field-locked">{fieldName}</p>
        )}
      </header>

      <div className="chronologio-sticky chrono-locked-toolbar">
        <div className="chrono-toolbar-row">
          <ChronologioZoomBar
            zoom={zoom}
            onSetZoom={(z) => (z === 'month' && onOpenJournal ? onOpenJournal() : onSetZoom(z))}
          />

          <div className="chrono-toolbar-actions">
            <div className="chronologio-filter-popover" ref={filterPanelRef}>
              <button
                type="button"
                className={`chronologio-filter-btn${filtersOpen || filtersDirty ? ' is-active' : ''}`}
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
              >
                <Filter size={15} aria-hidden />
                {t('chronologio:filters')}
              </button>
              <AnimatePresence>
                {filtersOpen ? (
                  <motion.div
                    className="chronologio-filter-panel chrono-filter-wide"
                    role="dialog"
                    aria-label={t('chronologio:filtersTitle')}
                    initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  >
                    <p className="chrono-filter-label">{t('chronologio:living.yearAxis')}</p>
                    <div className="chrono-chip-row">
                      <button
                        type="button"
                        className={`chronologio-chip${axis === 'calendar' ? ' is-active' : ''}`}
                        onClick={() => onSetAxis('calendar')}
                      >
                        {t('chronologio:living.axisCalendar')}
                      </button>
                      <button
                        type="button"
                        className={`chronologio-chip${axis === 'season' ? ' is-active' : ''}`}
                        onClick={() => onSetAxis('season')}
                      >
                        {t('chronologio:living.axisSeason')}
                      </button>
                    </div>

                    <p className="chrono-filter-label">{t('chronologio:living.lifecycleYear')}</p>
                    <div className="chrono-chip-row">
                      <button
                        type="button"
                        className={`chronologio-chip${!filters.lifecycleYear ? ' is-active' : ''}`}
                        onClick={() => onSetFilters({ lifecycleYear: '' })}
                      >
                        {t('chronologio:allSeasons')}
                      </button>
                      <button
                        type="button"
                        className={`chronologio-chip${filters.lifecycleYear === 'low' ? ' is-active' : ''}`}
                        onClick={() => onSetFilters({ lifecycleYear: 'low' })}
                      >
                        {t('chronologio:seasonLow')}
                      </button>
                      <button
                        type="button"
                        className={`chronologio-chip${filters.lifecycleYear === 'high' ? ' is-active' : ''}`}
                        onClick={() => onSetFilters({ lifecycleYear: 'high' })}
                      >
                        {t('chronologio:seasonHigh')}
                      </button>
                    </div>

                    <p className="chrono-filter-label">{t('chronologio:filtersTitle')}</p>
                    <div className="chrono-chip-row">
                      {FILTER_CATEGORIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`chronologio-chip${filters.category === c ? ' is-active' : ''}`}
                          onClick={() => {
                            onSetFilters({ category: c });
                            setFiltersOpen(false);
                          }}
                        >
                          {t(`chronologio:categories.${c}`)}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {showCompare ? (
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

        {filtersDirty ? (
          <div className="chrono-active-chips">
            {categoryChip}
            {filters.lifecycleYear ? (
              <button
                type="button"
                className="chrono-active-chip"
                onClick={() => onSetFilters({ lifecycleYear: '' })}
              >
                {filters.lifecycleYear === 'low'
                  ? t('chronologio:seasonLow')
                  : t('chronologio:seasonHigh')}
                <X size={12} aria-hidden />
              </button>
            ) : null}
            <button type="button" className="chronologio-clear-btn" onClick={onClearFilters}>
              {t('chronologio:clearFilters')}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default ChronologioChrome;
