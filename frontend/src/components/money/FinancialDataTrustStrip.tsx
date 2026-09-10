import React from 'react';
import { useTranslation } from 'react-i18next';
import type { YearFinancialSummary } from '../../services/financialSummaryService';
import './Money.css';

type Props = {
  summary: YearFinancialSummary;
  locale: string;
  fieldCount: number;
  onOpenDrafts: () => void;
};

const FinancialDataTrustStrip: React.FC<Props> = ({ summary, locale, fieldCount, onOpenDrafts }) => {
  const { t } = useTranslation('money');
  const computed = !summary.dataAvailability.hasPostedRecords
    ? null
    : fieldCount > 1
      ? t('computedFrom', { count: summary.transactionCount, fields: fieldCount })
      : fieldCount === 1
        ? t('computedFromOneField', { count: summary.transactionCount })
        : t('computedFromUnassigned', { count: summary.transactionCount });
  const lastUpdate = summary.lastPostedAt
    ? t('lastUpdate', {
        date: new Date(summary.lastPostedAt).toLocaleString(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      })
    : null;

  if (!computed && !lastUpdate && summary.draftCount <= 0) return null;

  return (
    <div className="money-trust-strip">
      {computed ? <span>{computed}</span> : null}
      {lastUpdate ? <span>{lastUpdate}</span> : null}
      {summary.draftCount > 0 ? (
        <button type="button" onClick={onOpenDrafts}>
          {t('draftCountClickable', { count: summary.draftCount })}
        </button>
      ) : null}
    </div>
  );
};

export default FinancialDataTrustStrip;
