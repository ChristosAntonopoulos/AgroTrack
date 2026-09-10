import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldYearSummary, YearFinancialSummary } from '../../services/financialSummaryService';
import {
  formatEuroPerLitre,
  formatLitres,
  formatOfficialAmount,
  formatOfficialNet,
} from '../../finance/format';

type Props = {
  fieldId: string;
  year: number;
  costSummary: YearFinancialSummary | null;
  yearRollup: FieldYearSummary | null;
  plannedRemaining: number;
};

const formatKg = (value: number | null | undefined, locale: string, unknown: string): string => {
  if (value == null) return unknown;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} kg`;
};

const FieldYearGlance: React.FC<Props> = ({
  fieldId,
  year,
  costSummary,
  yearRollup,
  plannedRemaining,
}) => {
  const { t, i18n } = useTranslation(['fields', 'money']);
  const currency = costSummary?.currency || yearRollup?.currency || 'EUR';
  const unknown = t('money:unknownAmount');
  const availability = costSummary?.dataAvailability || yearRollup?.dataAvailability;
  const hasPosted = Boolean(availability?.hasPostedRecords);
  const income = availability?.incomeIsUnknown ? null : costSummary?.totalIncome ?? yearRollup?.totalIncome;
  const expenses = availability?.expensesAreUnknown
    ? null
    : costSummary?.totalExpenses ?? yearRollup?.totalExpenses;
  const net = income == null && expenses == null ? null : costSummary?.netResult ?? yearRollup?.netResult;
  const oliveKg = yearRollup?.oliveKilograms ?? null;
  const oilLitres = yearRollup?.oliveOil?.producedLitres ?? null;
  const costPerHa = costSummary?.costPerHectare ?? null;
  const costPerLitre = yearRollup?.oliveOil?.productionCostPerLitre ?? null;
  const showPerHa = hasPosted && costPerHa != null && !availability?.areaIsMissing;
  const showPerLitre = hasPosted && costPerLitre != null && oilLitres != null;

  return (
    <section className="field-year-glance" aria-labelledby="field-year-glance-title">
      <h2 id="field-year-glance-title">{t('overview.yearGlance.title')}</h2>
      <dl className="field-year-glance-grid">
        <div>
          <dt>{t('overview.completedWork')}</dt>
          <dd>
            {yearRollup ? yearRollup.completedExecutionCount : unknown}
          </dd>
        </div>
        <div>
          <dt>{t('overview.yearGlance.plannedRemaining')}</dt>
          <dd>{plannedRemaining}</dd>
        </div>
        <div>
          <dt>{t('overview.yearGlance.harvest')}</dt>
          <dd>
            {oliveKg == null
              ? t('overview.yearGlance.noHarvest', { year })
              : formatKg(oliveKg, i18n.language, unknown)}
          </dd>
        </div>
        <div>
          <dt>{t('overview.yearGlance.oil')}</dt>
          <dd>{formatLitres(oilLitres, i18n.language, unknown)}</dd>
        </div>
      </dl>

      {hasPosted ? (
        <dl className="field-year-glance-money">
          <div>
            <dt>{t('overview.income')}</dt>
            <dd>
              {formatOfficialAmount(income, currency, i18n.language, unknown)}
            </dd>
          </div>
          <div>
            <dt>{t('overview.expenses')}</dt>
            <dd>
              {formatOfficialAmount(expenses, currency, i18n.language, unknown)}
            </dd>
          </div>
          <div>
            <dt>{t('overview.result')}</dt>
            <dd>
              {formatOfficialNet(net, currency, i18n.language, unknown)}
            </dd>
          </div>
          {showPerHa ? (
            <div>
              <dt>{t('overview.yearGlance.perHectare')}</dt>
              <dd>{formatOfficialAmount(costPerHa, currency, i18n.language, unknown)}</dd>
            </div>
          ) : null}
          {showPerLitre ? (
            <div>
              <dt>{t('overview.yearGlance.perLitre')}</dt>
              <dd>{formatEuroPerLitre(costPerLitre, i18n.language, unknown)}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="field-year-glance-empty">{t('overview.yearGlance.noMoney', { year })}</p>
      )}

      <Link className="fd-text-link" to={`/money?year=${year}&fieldId=${encodeURIComponent(fieldId)}`}>
        {t('overview.seeFinance')}
      </Link>
    </section>
  );
};

export default FieldYearGlance;
