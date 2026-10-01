import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldYearSummary, YearFinancialSummary } from '../../services/financialSummaryService';
import {
  formatEuroPerLitre,
  formatLitres,
  formatOfficialAmount,
  perAreaForDisplay,
} from '../../finance/format';
import MoneyTriadFacts from '../money/MoneyTriadFacts';
import { moneyPath, myOilPath } from '../../navigation/intents';
import { oilStockService } from '../../services/oilStockService';
import { availableLitresForField } from '../../myOil/groupLotsByGrove';
import { formatOilNumber } from '../../myOil/formatOilPack';

type Props = {
  fieldId: string;
  year: number;
  costSummary: YearFinancialSummary | null;
  yearRollup: FieldYearSummary | null;
  plannedRemaining: number;
  /** Daily harvest progress (e.g. sacks) that is not yet a finalized year result. */
  harvestDaySacks?: number | null;
  canViewMoney?: boolean;
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
  harvestDaySacks,
  canViewMoney = true,
}) => {
  const { t, i18n } = useTranslation(['fields', 'money', 'myOil']);
  const [cellarLitres, setCellarLitres] = useState<number | null>(null);
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
  const costPerArea = perAreaForDisplay(costPerHa, i18n.language);
  const costPerLitre = yearRollup?.oliveOil?.productionCostPerLitre ?? null;
  const showPerHa = hasPosted && costPerArea != null && !availability?.areaIsMissing;
  const showPerLitre = hasPosted && costPerLitre != null && oilLitres != null;

  useEffect(() => {
    let cancelled = false;
    void oilStockService
      .getSummary()
      .then((summary) => {
        if (cancelled) return;
        setCellarLitres(availableLitresForField(summary.lots || [], fieldId));
      })
      .catch(() => {
        if (!cancelled) setCellarLitres(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fieldId]);

  const harvestLabel = (() => {
    if (oliveKg != null) return formatKg(oliveKg, i18n.language, unknown);
    if (harvestDaySacks != null && harvestDaySacks > 0) {
      return `${t('overview.yearGlance.harvestInProgress')} · ${t('overview.yearGlance.harvestSacksSoFar', {
        count: harvestDaySacks,
      })}`;
    }
    return t('overview.yearGlance.noHarvest', { year });
  })();

  const showCellarShare = cellarLitres != null && cellarLitres > 0.05;

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
          <dd>{harvestLabel}</dd>
        </div>
        <div>
          <dt>{t('overview.yearGlance.oil')}</dt>
          <dd>{formatLitres(oilLitres, i18n.language, unknown)}</dd>
        </div>
        {showCellarShare ? (
          <div>
            <dt>{t('overview.yearGlance.inMyCellar')}</dt>
            <dd>
              {t('myOil:litres', {
                amount: formatOilNumber(cellarLitres!, i18n.language),
              })}
            </dd>
          </div>
        ) : null}
      </dl>

      {canViewMoney && hasPosted ? (
        <>
          <MoneyTriadFacts
            className="field-year-glance-money"
            income={income}
            expenses={expenses}
            net={net}
            currency={currency}
            locale={i18n.language}
            unknown={unknown}
            incomeLabel={t('overview.income')}
            expensesLabel={t('overview.expenses')}
            resultLabel={t('overview.result')}
          />
          {showPerHa || showPerLitre ? (
            <dl className="field-year-glance-money">
              {showPerHa ? (
                <div>
                  <dt>{t('overview.yearGlance.perHectare')}</dt>
                  <dd>{formatOfficialAmount(costPerArea, currency, i18n.language, unknown)}</dd>
                </div>
              ) : null}
              {showPerLitre ? (
                <div>
                  <dt>{t('overview.yearGlance.perLitre')}</dt>
                  <dd>{formatEuroPerLitre(costPerLitre, i18n.language, unknown)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </>
      ) : canViewMoney ? (
        <p className="field-year-glance-empty">{t('overview.yearGlance.noMoney', { year })}</p>
      ) : null}

      <div className="field-year-glance-links">
        {canViewMoney ? (
          <Link className="fd-text-link" to={moneyPath({ year, fieldId })}>
            {t('overview.seeFinance')}
          </Link>
        ) : null}
        {showCellarShare ? (
          <Link className="fd-text-link" to={myOilPath({ field: fieldId })}>
            {t('overview.yearGlance.seeInMyCellar')}
          </Link>
        ) : null}
      </div>
    </section>
  );
};

export default FieldYearGlance;
