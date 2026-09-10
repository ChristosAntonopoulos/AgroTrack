import React from 'react';
import { useTranslation } from 'react-i18next';
import type { OliveOilEconomics } from '../../services/financialSummaryService';
import { formatEuroPerLitre, formatLitres } from '../../finance/format';
import './Money.css';

type Props = {
  year: number;
  oil: OliveOilEconomics;
  locale: string;
};

const OliveOilEconomicsCard: React.FC<Props> = ({ year, oil, locale }) => {
  const { t } = useTranslation('money');
  if (!oil.hasProductionOrSales) return null;
  const dash = '—';
  return (
    <section className="money-card">
      <h2>{t('oliveOilYear', { year })}</h2>
      <dl className="money-oil-grid">
        <div>
          <dt>{t('produced')}</dt>
          <dd>{formatLitres(oil.producedLitres, locale, dash)}</dd>
        </div>
        <div>
          <dt>{t('sold')}</dt>
          <dd>{formatLitres(oil.soldLitres, locale, dash)}</dd>
        </div>
        <div>
          <dt>{t('remaining')}</dt>
          <dd>
            {oil.remainingIsConfirmed ? formatLitres(oil.remainingLitres, locale, dash) : dash}
          </dd>
        </div>
        <div>
          <dt>{t('averagePrice')}</dt>
          <dd>{formatEuroPerLitre(oil.averageSalePricePerLitre, locale, dash)}</dd>
        </div>
        <div>
          <dt>{t('costPerLitre')}</dt>
          <dd>{formatEuroPerLitre(oil.productionCostPerLitre, locale, dash)}</dd>
        </div>
        <div>
          <dt>{t('resultPerLitre')}</dt>
          <dd>{formatEuroPerLitre(oil.resultPerLitre, locale, dash)}</dd>
        </div>
      </dl>
      {oil.productionCostMessage ? <p className="money-summary-note">{oil.productionCostMessage}</p> : null}
      {oil.averagePriceMessage ? <p className="money-summary-note">{oil.averagePriceMessage}</p> : null}
      {oil.remainingMessage ? <p className="money-warn">{oil.remainingMessage}</p> : null}
    </section>
  );
};

export default OliveOilEconomicsCard;
