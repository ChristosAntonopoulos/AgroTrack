import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, TrendingUp, Wallet } from 'lucide-react';
import type { YearFinancialSummary } from '../../services/financialSummaryService';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';
import { harvestYearSpan } from '../../finance/harvestYear';
import {
  isProvisionalActiveYearResult,
  resultLabel as computeResultLabel,
} from '../../finance/display';
import { formatEuroPerLitre, formatLitres, formatOfficialAmount, formatOfficialNet } from '../../finance/format';
import './Money.css';

type Props = {
  summary: YearFinancialSummary;
  locale: string;
  onAddIncome: () => void;
};

const HARVEST_INCOME = new Set(['olive_oil_sale', 'olive_sale']);

const MoneySummaryGrid: React.FC<Props> = ({ summary, locale, onAddIncome }) => {
  const { t } = useTranslation('money');
  const unknown = t('unknownAmount');
  const currency = summary.currency || 'EUR';
  const hasPosted = summary.dataAvailability.hasPostedRecords;
  const isActiveYear = summary.year === agriculturalYearFor(new Date());
  const hasHarvestIncome = useMemo(
    () =>
      (summary.incomeByCategory || []).some(
        (row) => HARVEST_INCOME.has(row.category) && row.amount > 0
      ),
    [summary.incomeByCategory]
  );
  const provisional = isProvisionalActiveYearResult(summary.netResult, hasPosted, {
    isActiveYear,
    totalIncome: summary.totalIncome,
    hasHarvestIncome,
  });
  const displayLabel = provisional
    ? t('provisionalBalance')
    : isActiveYear && hasPosted && summary.netResult != null
      ? computeResultLabel(summary.netResult, hasPosted, locale, {
          isActiveYear,
          totalIncome: summary.totalIncome,
          hasHarvestIncome,
        })
      : summary.resultLabel || unknown;
  const incomeKicker = isActiveYear ? t('incomeToDate') : t('income');
  const expenseKicker = isActiveYear ? t('expensesToDate') : t('expenses');
  const resultKicker = t('resultYear', { span: harvestYearSpan(summary.year) });
  const netClass =
    !hasPosted || summary.netResult == null
      ? ''
      : provisional
        ? ' is-provisional'
        : summary.netResult < 0
          ? ' is-loss'
          : summary.netResult > 0
            ? ' is-profit'
            : '';
  const oil = summary.oliveOil;

  return (
    <section className="money-summary-grid" aria-label={t('result')}>
      <article className={`money-glance${netClass}`}>
        <span className="money-glance-mark" aria-hidden>
          <Scale size={18} />
        </span>
        <div className="money-glance-copy">
          <span className="money-kicker">{resultKicker}</span>
          <strong>{formatOfficialNet(summary.netResult, currency, locale, unknown)}</strong>
          {hasPosted ? <p className="money-state-label">{displayLabel}</p> : null}
        </div>
      </article>
      <article className="money-glance is-income">
        <span className="money-glance-mark" aria-hidden>
          <TrendingUp size={18} />
        </span>
        <div className="money-glance-copy">
          <span className="money-kicker">{incomeKicker}</span>
          <strong>{formatOfficialAmount(summary.totalIncome, currency, locale, unknown)}</strong>
          {!hasPosted || !summary.totalIncome ? (
            <>
              <p className="money-summary-note">
                {isActiveYear ? t('noIncomeYetActive') : t('noIncomeYet')}
              </p>
              <button type="button" className="money-text-link" onClick={onAddIncome}>
                {t('addIncome')}
              </button>
            </>
          ) : oil?.soldLitres ? (
            <p className="money-summary-note">
              {formatLitres(oil.soldLitres, locale, '—')}
              {' · '}
              {t('averagePrice')} {formatEuroPerLitre(oil.averageSalePricePerLitre, locale, '—')}
            </p>
          ) : null}
        </div>
      </article>
      <article className="money-glance is-expense">
        <span className="money-glance-mark" aria-hidden>
          <Wallet size={18} />
        </span>
        <div className="money-glance-copy">
          <span className="money-kicker">{expenseKicker}</span>
          <strong>{formatOfficialAmount(summary.totalExpenses, currency, locale, unknown)}</strong>
        </div>
      </article>
    </section>
  );
};

export default MoneySummaryGrid;
