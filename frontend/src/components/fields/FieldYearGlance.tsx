import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldOverviewDto } from '../../services/fieldOverviewService';
import { formatLitres } from '../../finance/format';
import MoneyTriadFacts from '../money/MoneyTriadFacts';
import { moneyPath, myOilPath } from '../../navigation/intents';
import { formatOilNumber } from '../../myOil/formatOilPack';

type Props = {
  overview: FieldOverviewDto;
  canViewMoney?: boolean;
};

const formatKg = (value: number, locale: string): string =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} kg`;

/**
 * Year glance — renders only values from the canonical Field Overview DTO.
 * Do not fetch oil-lots or recompute money here (see FIELD_OVERVIEW_SOURCES.md).
 */
const FieldYearGlance: React.FC<Props> = ({ overview, canViewMoney = true }) => {
  const { t, i18n } = useTranslation(['fields', 'money', 'myOil']);
  const { production, money, cropYear } = overview;
  const currency = money.currency || 'EUR';
  const unknown = t('money:unknownAmount');
  const hasOil = production.hasOilEntries;
  const cellar = production.oilCurrentlyInCellarLitres;

  return (
    <section className="field-year-glance" aria-labelledby="field-year-glance-title">
      <h2 id="field-year-glance-title">{t('overview.yearGlance.title')}</h2>

      <div className="field-year-glance-groups">
        <div>
          <h3 className="field-year-glance-group-title">{t('overview.yearGlance.production')}</h3>
          <dl className="field-year-glance-grid">
            <div>
              <dt>{t('overview.yearGlance.harvest')}</dt>
              <dd>
                {production.harvestOliveKg > 0
                  ? formatKg(production.harvestOliveKg, i18n.language)
                  : t('overview.yearGlance.noHarvest', { year: cropYear.id })}
              </dd>
            </div>
            <div>
              <dt>{t('overview.yearGlance.oilProduced')}</dt>
              <dd>
                {hasOil || production.oilProducedLitres > 0
                  ? formatLitres(production.oilProducedLitres, i18n.language, unknown)
                  : t('overview.yearGlance.noOilYet')}
              </dd>
            </div>
            <div>
              <dt>{t('overview.yearGlance.inCellarNow')}</dt>
              <dd>
                {cellar > 0.05
                  ? t('myOil:litres', { amount: formatOilNumber(cellar, i18n.language) })
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {canViewMoney ? (
          <div>
            <h3 className="field-year-glance-group-title">{t('overview.yearGlance.money')}</h3>
            <MoneyTriadFacts
              className="field-year-glance-money"
              income={money.postedIncome}
              expenses={money.postedExpense}
              net={money.result}
              currency={currency}
              locale={i18n.language}
              unknown={unknown}
              incomeLabel={t('money:income')}
              expensesLabel={t('money:expenses')}
              resultLabel={t('money:result')}
            />
          </div>
        ) : null}
      </div>

      <div className="field-year-glance-links">
        {canViewMoney ? (
          <Link to={moneyPath({ fieldId: overview.field.id, year: cropYear.id })}>
            {t('overview.yearGlance.openMoney')}
          </Link>
        ) : null}
        <Link to={myOilPath({ field: overview.field.id })}>{t('overview.yearGlance.openMyOil')}</Link>
      </div>
    </section>
  );
};

export default FieldYearGlance;
