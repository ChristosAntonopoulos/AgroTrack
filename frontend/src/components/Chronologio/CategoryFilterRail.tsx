import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  CloudSun,
  Eye,
  LayoutGrid,
  Wallet,
  Wheat,
} from 'lucide-react';
import { SIMPLE_PRIMARY_CATEGORIES, type ChronologioPrimaryCategory } from '../../chronologio/primaryCategories';

export type RailCategory = 'all' | ChronologioPrimaryCategory;

const RAIL: Array<{ id: RailCategory; icon: React.ReactNode }> = [
  { id: 'all', icon: <LayoutGrid size={18} aria-hidden /> },
  { id: 'work', icon: <CheckSquare size={18} aria-hidden /> },
  { id: 'observation', icon: <Eye size={18} aria-hidden /> },
  { id: 'money', icon: <Wallet size={18} aria-hidden /> },
  { id: 'harvest', icon: <Wheat size={18} aria-hidden /> },
  { id: 'weather', icon: <CloudSun size={18} aria-hidden /> },
];

type Props = {
  value: RailCategory;
  onChange: (category: RailCategory) => void;
};

const CategoryFilterRail: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation('chronologio');

  return (
    <div className="chrono-category-rail" role="group" aria-label={t('filtersTitle')}>
      {RAIL.filter((item) => item.id === 'all' || SIMPLE_PRIMARY_CATEGORIES.includes(item.id)).map(
        (item) => {
          const selected = value === item.id;
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
        }
      )}
    </div>
  );
};

export default CategoryFilterRail;
