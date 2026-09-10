import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Droplets,
  FlaskConical,
  Fuel,
  MoreHorizontal,
  Shield,
  Sprout,
  Wallet,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import {
  categoriesForType,
  financialCategoryLabel,
  type FinancialCategory,
  type FinancialTransactionType,
} from '../../finance/display';
import { FEATURED_EXPENSE_CATEGORIES, FEATURED_INCOME_CATEGORIES } from '../../finance/moneyUi';

const ICONS: Partial<Record<FinancialCategory, LucideIcon>> = {
  labor: Wheat,
  fertilizers: Sprout,
  fuel_and_energy: Fuel,
  plant_protection: Shield,
  irrigation: Droplets,
  olive_oil_sale: Droplets,
  olive_sale: Wheat,
  subsidy: Wallet,
  compensation: Wallet,
  other_income: Wallet,
  mill: FlaskConical,
};

type Props = {
  type: FinancialTransactionType;
  value: string;
  onChange: (category: FinancialCategory) => void;
};

const MoneyCategorySelector: React.FC<Props> = ({ type, value, onChange }) => {
  const { t, i18n } = useTranslation('capture');
  const [showAll, setShowAll] = useState(false);
  const featured = type === 'income' ? FEATURED_INCOME_CATEGORIES : FEATURED_EXPENSE_CATEGORIES;
  const all = categoriesForType(type);
  const options = showAll ? all : featured;
  const extraSelected = value && !featured.includes(value as FinancialCategory);

  return (
    <div>
      <div className="money-form-label">{t('money.whatAbout')}</div>
      <div className="money-category-grid" role="listbox" aria-label={t('money.whatAbout')}>
        {options.map((category) => {
          const Icon = ICONS[category] || Wallet;
          return (
            <button
              key={category}
              type="button"
              role="option"
              aria-selected={value === category}
              className={`money-category-option${value === category ? ' is-active' : ''}`}
              onClick={() => onChange(category)}
            >
              <Icon size={18} aria-hidden />
              {financialCategoryLabel(category, i18n.language)}
            </button>
          );
        })}
        {extraSelected && !showAll ? (
          <button type="button" className="money-category-option is-active" aria-selected>
            {financialCategoryLabel(value, i18n.language)}
          </button>
        ) : null}
        {!showAll ? (
          <button type="button" className="money-category-option" onClick={() => setShowAll(true)}>
            <MoreHorizontal size={18} aria-hidden />
            {t('money.moreCategories')}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default MoneyCategorySelector;
