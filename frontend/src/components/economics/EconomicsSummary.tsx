import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FinancialEntry } from '../../services/financialEntryService';
import {
  formatEconomicsMoney,
  formatSignedEconomics,
  type CategorySpend,
  type EconomicsTotals,
  type FieldMoneyRow,
  type MonthPoint,
  economicsGroupFor,
} from '../../utils/economics';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { EconomicsGroupIcon } from './EconomicsGroupIcon';
import './Economics.css';

type Props = {
  year: number;
  totals: EconomicsTotals;
  breakdown: CategorySpend[];
  showAllCategories: boolean;
  onToggleCategories: () => void;
  fieldRows: FieldMoneyRow[] | null;
  recent: FinancialEntry[];
  fieldNames: Record<string, string>;
  locale: string;
  fullMode: boolean;
  monthly: MonthPoint[];
  previous?: EconomicsTotals | null;
  costPerKg?: number | null;
  harvestCostPerKg?: number | null;
  onSelectField: (fieldId: string) => void;
  onOpenMovements: () => void;
  onOpenEntry: (id: string) => void;
  onOpenKind?: (kind: 'income' | 'expense') => void;
  onOpenCategory?: (group: CategorySpend['group']) => void;
};

const dashOrMoney = (
  has: boolean,
  amount: number,
  currency: string,
  locale: string,
  dash: string
) => (has ? formatEconomicsMoney(amount, currency, locale) : dash);

const EconomicsSummary: React.FC<Props> = ({
  year,
  totals,
  breakdown,
  showAllCategories,
  onToggleCategories,
  fieldRows,
  recent,
  fieldNames,
  locale,
  fullMode,
  monthly,
  previous,
  costPerKg,
  harvestCostPerKg,
  onSelectField,
  onOpenMovements,
  onOpenEntry,
  onOpenKind,
  onOpenCategory,
}) => {
  const { t } = useTranslation('economics');
  const visibleBars = showAllCategories ? breakdown : breakdown.slice(0, 5);
  const maxBar = breakdown[0]?.amount || 1;
  const monthMax = Math.max(1, ...monthly.flatMap((m) => [m.income, m.expenses]));

  return (
    <div className="eco-summary">
      <section className="eco-card">
        <h2>{t('recordedResult')}</h2>
        <p className={`eco-hero-value${totals.result < 0 ? ' is-negative' : ''}`}>
          {formatSignedEconomics(totals.result, totals.currency, locale)}
        </p>
        <p className="eco-help">{t('recordedResultHint')}</p>
        <div className="eco-hero-split">
          <button
            type="button"
            className="eco-hero-kind"
            onClick={() => onOpenKind?.('income')}
          >
            <span>{t('income')}</span>
            <strong className="is-in">
              {dashOrMoney(totals.hasIncome, totals.income, totals.currency, locale, t('dash'))}
            </strong>
            {!totals.hasIncome ? <small>{t('noIncomeRecorded')}</small> : null}
          </button>
          <button
            type="button"
            className="eco-hero-kind"
            onClick={() => onOpenKind?.('expense')}
          >
            <span>{t('expenses')}</span>
            <strong>
              {dashOrMoney(totals.hasExpenses, totals.expenses, totals.currency, locale, t('dash'))}
            </strong>
          </button>
        </div>
        {fullMode && previous && previous.count > 0 ? (
          <p className="eco-prev-year">
            {t('prevYear')}: {year - 1} · {formatSignedEconomics(previous.result, previous.currency, locale)}
          </p>
        ) : null}
      </section>

      {breakdown.length > 0 ? (
        <section className="eco-card">
          <h2>{t('whereMoneyWent')}</h2>
          <div className="eco-bars">
            {visibleBars.map((row) => (
              <button
                key={row.group}
                type="button"
                className="eco-bar-row"
                onClick={() => onOpenCategory?.(row.group)}
              >
                <div className="eco-bar-meta">
                  <span>{t(`groups.${row.group}`)}</span>
                  <strong>{formatEconomicsMoney(row.amount, totals.currency, locale)}</strong>
                </div>
                <div className="eco-bar-track">
                  <div className="eco-bar-fill" style={{ width: `${Math.max(6, (row.amount / maxBar) * 100)}%` }} />
                </div>
              </button>
            ))}
          </div>
          {breakdown.length > 5 ? (
            <button type="button" className="eco-text-link" onClick={onToggleCategories}>
              {showAllCategories ? t('fewerCategories') : t('allCategories')}
            </button>
          ) : null}
        </section>
      ) : null}

      {fieldRows && fieldRows.length > 0 ? (
        <section className="eco-card">
          <h2>{t('perField')}</h2>
          <div className="eco-field-list">
            {fieldRows.map((row) => (
              <button
                key={row.fieldId}
                type="button"
                className="eco-field-row"
                onClick={() => onSelectField(row.fieldId)}
              >
                <strong>{row.label}</strong>
                <span>
                  {row.hasIncome
                    ? `${t('income')} ${formatEconomicsMoney(row.income, row.currency, locale)}`
                    : `${t('income')} ${t('dash')}`}
                  {' · '}
                  {row.hasExpenses
                    ? `${t('expenses')} ${formatEconomicsMoney(row.expenses, row.currency, locale)}`
                    : `${t('expenses')} ${t('dash')}`}
                </span>
                <em className="eco-field-result">
                  {t('result')} {formatSignedEconomics(row.result, row.currency, locale)}
                </em>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {fullMode && monthly.length > 0 ? (
        <section className="eco-card">
          <h2>{t('cashflow')}</h2>
          <table className="eco-cash-table">
            <thead>
              <tr>
                <th>{t('month')}</th>
                <th>{t('income')}</th>
                <th>{t('expenses')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {monthly.map((point) => {
                const label = new Date(year, point.month - 1, 1).toLocaleDateString(locale, {
                  month: 'short',
                });
                return (
                  <tr key={point.month}>
                    <td>{label}</td>
                    <td>
                      {point.hasIncome
                        ? formatEconomicsMoney(point.income, totals.currency, locale)
                        : t('dash')}
                    </td>
                    <td>
                      {point.hasExpenses
                        ? formatEconomicsMoney(point.expenses, totals.currency, locale)
                        : t('dash')}
                    </td>
                    <td>
                      <div className="eco-cash-bars">
                        <i className="is-in">
                          <span style={{ width: `${(point.income / monthMax) * 100}%` }} />
                        </i>
                        <i className="is-out">
                          <span style={{ width: `${(point.expenses / monthMax) * 100}%` }} />
                        </i>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}

      {fullMode && (costPerKg != null || harvestCostPerKg != null) ? (
        <section className="eco-card">
          <h2>{t('unitEconomics')}</h2>
          <div className="eco-unit">
            {costPerKg != null ? (
              <p>
                <span>{t('costPerKg')}</span>
                <strong>
                  {costPerKg.toLocaleString(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €/kg
                </strong>
              </p>
            ) : null}
            {harvestCostPerKg != null ? (
              <p>
                <span>{t('harvestCostPerKg')}</span>
                <strong>
                  {harvestCostPerKg.toLocaleString(locale, {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })} €/kg
                </strong>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="eco-card">
          <h2>{t('recent')}</h2>
          <ul className="eco-recent-list">
            {recent.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="eco-move-row" onClick={() => onOpenEntry(entry.id)}>
                  <span className="eco-move-icon">
                    <EconomicsGroupIcon group={economicsGroupFor(entry)} />
                  </span>
                  <span className="eco-move-copy">
                    <strong>{entry.description}</strong>
                    <span>
                      {t(`groups.${economicsGroupFor(entry)}`)}
                      {' · '}
                      {friendlyFieldLabel(fieldNames[entry.fieldId])}
                    </span>
                  </span>
                  <span className={`eco-move-amount ${entry.kind === 'income' ? 'is-in' : 'is-out'}`}>
                    {formatSignedEconomics(entry.amount, entry.currency, locale, entry.kind)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="eco-text-link" onClick={onOpenMovements}>
            {t('allMovements')}
          </button>
        </section>
      ) : null}
    </div>
  );
};

export default EconomicsSummary;
