import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { YearFinancialSummary } from '../../services/financialSummaryService';
import { formatEuroPerLitre, formatLitres, formatOfficialAmount, formatOfficialNet } from '../../finance/format';
import './Money.css';

type Props = {
  summary: YearFinancialSummary;
  locale: string;
  onAddIncome: () => void;
};

const MoneySummaryGrid: React.FC<Props> = ({ summary, locale, onAddIncome }) => {
  const { t } = useTranslation('money');
  const unknown = t('unknownAmount');
  const currency = summary.currency || 'EUR';
  const hasPosted = summary.dataAvailability.hasPostedRecords;
  const netClass = !hasPosted || summary.netResult == null ? '' : summary.netResult < 0 ? ' is-loss' : ' is-profit';
  const oil = summary.oliveOil;

  return (
    <section className="money-summary-grid">
      <article className={`money-card result-card${netClass}`}>
        <span className="money-kicker">{t('resultYear', { year: summary.year })}</span>
        <strong>{formatOfficialNet(summary.netResult, currency, locale, unknown)}</strong>
        <p className="money-state-label">
          {hasPosted && summary.netResult != null && summary.netResult < 0 ? (
            <TrendingDown size={18} aria-hidden />
          ) : hasPosted && summary.netResult != null && summary.netResult > 0 ? (
            <TrendingUp size={18} aria-hidden />
          ) : null}
          {summary.resultLabel || unknown}
        </p>
        {hasPosted ? (
          <p className="money-summary-note">
            {t('income')} {formatOfficialAmount(summary.totalIncome, currency, locale, unknown)}
            {' − '}
            {t('expenses')} {formatOfficialAmount(summary.totalExpenses, currency, locale, unknown)}
          </p>
        ) : null}
      </article>
      <article className="money-card money-summary-card">
        <span className="money-kicker">{t('income')}</span>
        <strong className="money-summary-value">
          {formatOfficialAmount(summary.totalIncome, currency, locale, unknown)}
        </strong>
        {!hasPosted || !summary.totalIncome ? (
          <>
            <p className="money-summary-note">{t('noIncomeYet')}</p>
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
      </article>
      <article className="money-card money-summary-card">
        <span className="money-kicker">{t('expenses')}</span>
        <strong className="money-summary-value">
          {formatOfficialAmount(summary.totalExpenses, currency, locale, unknown)}
        </strong>
        {hasPosted ? (
          <p className="money-summary-note">
            {t('entryCount', { count: summary.transactionCount })}
            {summary.expenseByCategory[0]
              ? ` · ${t('largestCategory')}: ${summary.expenseByCategory[0].categoryLabel}`
              : ''}
          </p>
        ) : null}
      </article>
    </section>
  );
};

export default MoneySummaryGrid;
