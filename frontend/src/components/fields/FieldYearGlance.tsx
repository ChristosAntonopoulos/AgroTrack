import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldOverviewDto } from '../../services/fieldOverviewService';
import { formatLitres } from '../../finance/format';
import { moneyPath, myOilPath } from '../../navigation/intents';
import { formatOilNumber } from '../../myOil/formatOilPack';

type Props = {
  overview: FieldOverviewDto;
  canViewMoney?: boolean;
};

const formatKg = (value: number, locale: string): string =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} kg`;

/**
 * Compact year summary bar — values only from Field Overview DTO.
 */
const FieldYearGlance: React.FC<Props> = ({ overview, canViewMoney = true }) => {
  const { t, i18n } = useTranslation(['fields', 'money', 'myOil']);
  const { production, money, cropYear } = overview;
  const unknown = t('money:unknownAmount');
  const cellar = production.oilCurrentlyInCellarLitres;
  const currency = money.currency || 'EUR';

  const harvest =
    production.harvestOliveKg > 0
      ? formatKg(production.harvestOliveKg, i18n.language)
      : t('overview.yearGlance.noHarvestShort', { defaultValue: '—' });
  const oil =
    production.hasOilEntries || production.oilProducedLitres > 0
      ? formatLitres(production.oilProducedLitres, i18n.language, unknown)
      : '—';
  const stock =
    cellar > 0.05 ? t('myOil:litres', { amount: formatOilNumber(cellar, i18n.language) }) : '—';

  const netLabel =
    money.result === 0 && money.postedIncome === 0 && money.postedExpense === 0
      ? null
      : new Intl.NumberFormat(i18n.language, {
          style: 'currency',
          currency,
          maximumFractionDigits: 0}).format(money.result);

  return (
    <section className="field-year-glance field-year-glance--bar" aria-labelledby="field-year-glance-title">
      <div className="field-overview-section-head">
        <h2 id="field-year-glance-title">{t('overview.yearGlance.titleShort')}</h2>
        <div className="field-year-glance-links">
          {canViewMoney ? (
            <Link
              className="field-overview-cta field-overview-cta--ghost"
              to={moneyPath({ fieldId: overview.field.id, year: cropYear.id })}
            >
              {t('overview.yearGlance.openMoney')}
            </Link>
          ) : null}
          <Link
            className="field-overview-cta field-overview-cta--ghost"
            to={myOilPath({ field: overview.field.id })}
          >
            {t('overview.yearGlance.openMyOil')}
          </Link>
        </div>
      </div>

      <dl className="field-year-bar">
        <div>
          <dd>{harvest}</dd>
          <dt>{t('overview.yearGlance.harvest')}</dt>
        </div>
        <div>
          <dd>{oil}</dd>
          <dt>{t('overview.yearGlance.oilProduced')}</dt>
        </div>
        <div>
          <dd>{stock}</dd>
          <dt>{t('overview.yearGlance.inCellarNow')}</dt>
        </div>
      </dl>

      {canViewMoney && netLabel ? (
        <p className={`field-year-net${money.result > 0 ? ' is-profit' : money.result < 0 ? ' is-loss' : ''}`}>
          <strong>{netLabel}</strong>
          <span>{t('money:result')}</span>
        </p>
      ) : null}
    </section>
  );
};

export default FieldYearGlance;
