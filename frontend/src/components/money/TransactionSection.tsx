import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancialTransaction } from '../../services/financialTransactionService';
import FinancialTransactionRow from './FinancialTransactionRow';
import './Money.css';

type Props = {
  items: FinancialTransaction[];
  totalCount: number;
  loadingMore: boolean;
  locale: string;
  fieldNames: Record<string, string>;
  category: string;
  month: number;
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
  category,
  month,
  onClearFilters,
  onOpen,
  onLoadMore,
}) => {
  const { t } = useTranslation('money');
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

  const filtered = Boolean(category || month);

  return (
    <section className="money-ledger">
      <header className="money-ledger-head">
        <h2>{t('entries')}</h2>
        {filtered ? (
          <button type="button" className="money-text-link" onClick={onClearFilters}>
            {t('clearFilters')}
          </button>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="money-summary-note">{t('noMatchingEntries')}</p>
      ) : (
        groups.map(([key, rows]) => {
          const sample = new Date(rows[0].occurredOn);
          const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(sample);
          return (
            <div key={key} className="money-month-group">
              <h3 className="money-month-mark">{title}</h3>
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
