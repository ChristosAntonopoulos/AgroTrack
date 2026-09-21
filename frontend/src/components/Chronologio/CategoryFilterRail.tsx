import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  CloudSun,
  Eye,
  LayoutGrid,
  SlidersHorizontal,
  Users,
  Wallet,
  Wheat,
  Image as ImageIcon,
  MapPinned,
} from 'lucide-react';
import {
  MORE_FILTER_CATEGORIES,
  PRIMARY_RAIL_CATEGORIES,
  isMoreFilterCategory,
  isPrimaryRailCategory,
  type MoreFilterCategory,
} from '../../chronologio/primaryCategories';

export type RailCategory = 'all' | (typeof PRIMARY_RAIL_CATEGORIES)[number] | MoreFilterCategory;

const PRIMARY_RAIL: Array<{ id: 'all' | (typeof PRIMARY_RAIL_CATEGORIES)[number]; icon: React.ReactNode }> = [
  { id: 'all', icon: <LayoutGrid size={18} aria-hidden /> },
  { id: 'work', icon: <CheckSquare size={18} aria-hidden /> },
  { id: 'observation', icon: <Eye size={18} aria-hidden /> },
  { id: 'money', icon: <Wallet size={18} aria-hidden /> },
  { id: 'harvest', icon: <Wheat size={18} aria-hidden /> },
];

const MORE_ICONS: Record<MoreFilterCategory, React.ReactNode> = {
  weather: <CloudSun size={16} aria-hidden />,
  photo: <ImageIcon size={16} aria-hidden />,
  field_change: <MapPinned size={16} aria-hidden />,
  collaborator: <Users size={16} aria-hidden />,
};

type Props = {
  value: RailCategory;
  onChange: (category: RailCategory) => void;
  /** Hide harvest chip when the user cannot use harvest (collaborator without module). */
  hideHarvest?: boolean;
};

const moreFilterLabelKey = (id: MoreFilterCategory): string => {
  if (id === 'field_change') return 'primaryCategories.field_change';
  if (id === 'photo') return 'categories.photo';
  if (id === 'collaborator') return 'categories.collaborator';
  return `primaryCategories.${id}`;
};

const CategoryFilterRail: React.FC<Props> = ({ value, onChange, hideHarvest }) => {
  const { t } = useTranslation('chronologio');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreActive = isMoreFilterCategory(value);
  const primaryValue =
    value === 'all' || isPrimaryRailCategory(value) ? value : ('all' as const);
  const activeMoreCount = moreActive ? 1 : 0;

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  return (
    <div className="chrono-category-rail" role="group" aria-label={t('filtersTitle')}>
      {PRIMARY_RAIL.filter((item) => !(hideHarvest && item.id === 'harvest')).map((item) => {
        const selected = !moreActive && primaryValue === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`chrono-category-chip chrono-category-chip--${item.id}${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            <span>{t(`primaryCategories.${item.id}`)}</span>
          </button>
        );
      })}

      <div className={`chrono-more-filters${moreOpen ? ' is-open' : ''}`} ref={moreRef}>
        <button
          type="button"
          className={`chrono-category-chip chrono-category-chip--more${moreActive ? ' is-selected' : ''}`}
          aria-pressed={moreActive}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((next) => !next)}
        >
          <SlidersHorizontal size={18} aria-hidden />
          <span>
            {activeMoreCount > 0
              ? t('filtersCount', { count: activeMoreCount })
              : t('moreFilters')}
          </span>
        </button>

        {moreOpen ? (
          <div className="chrono-more-filters-menu" role="menu">
            <p className="chrono-more-filters-title">{t('moreFilters')}</p>
            {MORE_FILTER_CATEGORIES.map((id) => {
              const selected = value === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  className={`chrono-more-filters-item chrono-more-filters-item--${id}${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(id);
                    setMoreOpen(false);
                  }}
                >
                  {MORE_ICONS[id]}
                  <span>{t(moreFilterLabelKey(id))}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CategoryFilterRail;
