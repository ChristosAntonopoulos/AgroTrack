import React from 'react';
import { useTranslation } from 'react-i18next';
import type { YearFinancialSummary } from '../../services/financialSummaryService';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import './Money.css';

type Props = {
  summary: YearFinancialSummary;
  locale: string;
  fieldCount: number;
  onOpenDrafts: () => void;
};

const FinancialDataTrustStrip: React.FC<Props> = ({ summary, fieldCount, onOpenDrafts }) => {
  const { t } = useTranslation('money');
  const { formatDate } = useLocaleFormatters();
  const computed = !summary.dataAvailability.hasPostedRecords
    ? null
    : fieldCount > 1
      ? t('computedFrom', { count: summary.transactionCount, fields: fieldCount })
      : fieldCount === 1
        ? t('computedFromOneField', { count: summary.transactionCount })
        : t('computedFromUnassigned', { count: summary.transactionCount });
  const lastUpdate = summary.lastPostedAt
    ? t('lastUpdate', {
        date: formatDate(summary.lastPostedAt),
      })
    : null;

  const availability = summary.dataAvailability;
  const missingArea = (availability.missingAreaFieldNames ?? []).map((name) => friendlyFieldLabel(name));
  const incomplete = (availability.incompleteFieldNames ?? []).map((name) => friendlyFieldLabel(name));
  const exclusions = [
    missingArea.length
      ? t('excludedMissingArea', { names: missingArea.join(', ') })
      : availability.areaIsMissing && availability.hasPostedRecords
        ? t('areaMissingAll')
        : null,
    incomplete.length ? t('excludedIncomplete', { names: incomplete.join(', ') }) : null,
    availability.perAreaExcludesUnassigned ? t('excludedUnassigned') : null,
  ].filter(Boolean);

  if (!computed && !lastUpdate && summary.draftCount <= 0 && exclusions.length === 0) return null;

  return (
    <div className="money-trust-strip">
      {computed ? <span>{computed}</span> : null}
      {exclusions.map((line) => (
        <span key={line}>{line}</span>
      ))}
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
