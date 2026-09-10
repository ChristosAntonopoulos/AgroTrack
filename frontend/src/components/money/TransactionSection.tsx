import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancialTransaction } from '../../services/financialTransactionService';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, financialCategoryLabel } from '../../finance/display';
import FinancialTransactionRow from './FinancialTransactionRow';
import './Money.css';

type KindFilter = 'all' | 'income' | 'expense' | 'draft';

type Props = {
  items: FinancialTransaction[];
  totalCount: number;
  loadingMore: boolean;
  locale: string;
  fieldNames: Record<string, string>;
  kind: KindFilter;
  category: string;
  month: number;
  year: number;
  showFilters: boolean;
  hideIncome?: boolean;
  onKind: (kind: KindFilter) => void;
  onToggleFilters: () => void;
  onCategory: (value: string) => void;
  onMonth: (value: string) => void;
  onClearFilters: () => void;
  onOpen: (id: string) => void;
  onLoadMore: () => void;
};

const TransactionSection: React.FC<Props> = ({
  items,
  totalCount,
  loadingMore,
  locale,
  fieldNames,
  kind,
  category,
  month,
  year,
  showFilters,
  hideIncome,
  onKind,
  onToggleFilters,
  onCategory,
  onMonth,
  onClearFilters,
  onOpen,
  onLoadMore,
}) => {
  const { t, i18n } = useTranslation('money');
  const groups = useMemo(() => {
    const map = new Map<string, FinancialTransaction[]>();
    items.forEach((item) => {
      const date = new Date(item.occurredOn);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [items]);

  const tabs: Array<[KindFilter, string]> = hideIncome
    ? [
        ['all', 'kindAll'],
        ['expense', 'kindExpenses'],
        ['draft', 'kindDrafts'],
      ]
    : [
        ['all', 'kindAll'],
        ['income', 'kindIncome'],
        ['expense', 'kindExpenses'],
        ['draft', 'kindDrafts'],
      ];

  return (
    <section className="money-card">
      <div className="money-tx-header">
        <h2>{t('entries')}</h2>
      </div>
      <div className="money-chips" role="tablist" aria-label={t('entries')}>
        {tabs.map(([value, key]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kind === value}
            className={`money-chip${kind === value ? ' is-active' : ''}`}
            onClick={() => onKind(value)}
          >
            {t(key)}
          </button>
        ))}
        <button type="button" className="money-filter-toggle" onClick={onToggleFilters}>
          {showFilters ? t('hideFilters') : t('filters')}
        </button>
      </div>
      {showFilters ? (
        <div className="money-filters">
          <label>
            {t('category')}
            <select className="money-select" value={category} onChange={(e) => onCategory(e.target.value)}>
              <option value="">{t('allCategories')}</option>
              {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((id) => (
                <option key={id} value={id}>
                  {financialCategoryLabel(id, i18n.language)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('month')}
            <select className="money-select" value={month ? String(month) : ''} onChange={(e) => onMonth(e.target.value)}>
              <option value="">{t('allMonths')}</option>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(year, index, 1))}
                </option>
              ))}
            </select>
          </label>
          {category || month ? (
            <button type="button" className="money-text-link" onClick={onClearFilters}>
              {t('clearFilters')}
            </button>
          ) : null}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="money-summary-note">{t('noMatchingEntries')}</p>
      ) : (
        groups.map(([key, rows]) => {
          const sample = new Date(rows[0].occurredOn);
          const title = new Intl.DateTimeFormat(locale, { month: 'long' }).format(sample);
          return (
            <div key={key} className="money-month-group">
              <h3>{title}</h3>
              <p>{t('entryCount', { count: rows.length })}</p>
              {rows.map((row) => (
                <FinancialTransactionRow
                  key={row.id}
                  item={row}
                  locale={locale}
                  fieldNames={fieldNames}
                  onOpen={onOpen}
                />
              ))}
            </div>
          );
        })
      )}

      {loadingMore ? (
        <div className="money-skeleton" aria-hidden>
          <span />
          <span />
        </div>
      ) : items.length < totalCount ? (
        <button type="button" className="money-text-link" onClick={onLoadMore}>
          {t('loadOlder')}
        </button>
      ) : null}
    </section>
  );
};

export default TransactionSection;
