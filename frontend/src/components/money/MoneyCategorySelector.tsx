import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
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
  hideLabel?: boolean;
};

const MoneyCategorySelector: React.FC<Props> = ({ type, value, onChange, hideLabel }) => {
  const { t, i18n } = useTranslation('capture');
  const [showAll, setShowAll] = useState(false);
  const featured = (type === 'income' ? FEATURED_INCOME_CATEGORIES : FEATURED_EXPENSE_CATEGORIES).filter(
    (c) => c !== 'olive_oil_sale'
  );
  const all = categoriesForType(type).filter((c) => c !== 'olive_oil_sale');
  const options = showAll ? all : featured;
  const extraSelected = value && !featured.includes(value as FinancialCategory) && !showAll;

  return (
    <div className="money-field-block">
      {hideLabel ? null : <div className="money-form-label">{t('money.whatAbout')}</div>}
      <div
        className="money-category-list"
        role="listbox"
        aria-labelledby={hideLabel ? 'money-step-title' : undefined}
        aria-label={hideLabel ? undefined : t('money.whatAbout')}
      >
        {extraSelected ? (
          <button
            type="button"
            className="money-category-push is-active"
            role="option"
            aria-selected
            onClick={() => onChange(value as FinancialCategory)}
          >
            <Wallet size={18} aria-hidden />
            <span>{financialCategoryLabel(value, i18n.language)}</span>
            <ChevronRight className="money-field-choice__go" size={18} aria-hidden />
          </button>
        ) : null}
        {options.map((category) => {
          const Icon = ICONS[category] || Wallet;
          const selected = value === category;
          return (
            <button
              key={category}
              type="button"
              role="option"
              aria-selected={selected}
              className={`money-category-push${selected ? ' is-active' : ''}`}
              onClick={() => onChange(category)}
            >
              <Icon size={18} aria-hidden />
              <span>{financialCategoryLabel(category, i18n.language)}</span>
              <ChevronRight className="money-field-choice__go" size={18} aria-hidden />
            </button>
          );
        })}
        {!showAll ? (
          <button type="button" className="money-category-push is-more" onClick={() => setShowAll(true)}>
            <MoreHorizontal size={18} aria-hidden />
            <span>{t('money.moreCategories')}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default MoneyCategorySelector;
