import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CategoryFinancialResult } from '../../services/financialSummaryService';
import { formatOfficialAmount } from '../../finance/format';
import './Money.css';

type Props = {
  expenses: CategoryFinancialResult[];
  income: CategoryFinancialResult[];
  currency: string;
  locale: string;
  onSelectCategory: (category: string) => void;
};

const RankedList: React.FC<{
  title: string;
  rows: CategoryFinancialResult[];
  currency: string;
  locale: string;
  onSelectCategory: (category: string) => void;
}> = ({ title, rows, currency, locale, onSelectCategory }) => {
  const { t } = useTranslation('money');
  const [showAll, setShowAll] = useState(false);
  if (!rows.length) return null;
  const visible = showAll ? rows : rows.slice(0, 5);
  return (
    <div>
      <h2>{title}</h2>
      {visible.map((row) => (
        <button
          key={row.category}
          type="button"
          className="category-row"
          onClick={() => onSelectCategory(row.category)}
        >
          <div className="category-row-meta">
            <span>{row.categoryLabel || row.category}</span>
            <strong>
              {formatOfficialAmount(row.amount, currency, locale, '—')}
              {row.percentageOfTotal != null ? ` · ${Math.round(row.percentageOfTotal)}%` : ''}
            </strong>
          </div>
          <div className="category-track">
            <div className="category-fill" style={{ width: `${Math.max(6, row.percentageOfTotal || 0)}%` }} />
          </div>
        </button>
      ))}
      {rows.length > 5 ? (
        <button type="button" className="money-text-link" onClick={() => setShowAll((value) => !value)}>
          {showAll ? t('showLess') : t('showAll')}
        </button>
      ) : null}
    </div>
  );
};

const MoneyCategoryBreakdown: React.FC<Props> = ({ expenses, income, currency, locale, onSelectCategory }) => {
  const { t } = useTranslation('money');
  if (!expenses.length && !income.length) return null;
  return (
    <section className="money-card">
      <RankedList
        title={t('moneyWent')}
        rows={expenses}
        currency={currency}
        locale={locale}
        onSelectCategory={onSelectCategory}
      />
      <RankedList
        title={t('incomeCategories')}
        rows={income}
        currency={currency}
        locale={locale}
        onSelectCategory={onSelectCategory}
      />
    </section>
  );
};

export default MoneyCategoryBreakdown;
