import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { formatHarvestYieldPercent } from '../utils/harvestCalculations';

export const HarvestCompleteSheet: React.FC<{
  officialKg: number;
  oilKg: number;
  yieldPct: number | null;
  days: number;
  personDays: number;
  expenseEur: number;
  unweighedSacks: number;
  locale: string;
  onFill: () => void;
  onFinish: () => void;
}> = ({
  officialKg,
  oilKg,
  yieldPct,
  days,
  personDays,
  expenseEur,
  unweighedSacks,
  locale,
  onFill,
  onFinish,
}) => {
  const { t } = useTranslation('fields');
  return (
    <HarvestSheetShell
      footer={
        <>
          {unweighedSacks > 0 ? (
            <button type="button" className="money-text-link" onClick={onFill}>
              {t('harvestCampaign.complete.fill')}
            </button>
          ) : null}
          <button type="button" className="money-primary-action" onClick={onFinish}>
            {unweighedSacks > 0 ? t('harvestCampaign.complete.without') : t('harvestCampaign.complete.confirm')}
          </button>
        </>
      }
    >
      <p className="capture-prompt hc-complete-hero">
        {t('harvestCampaign.complete.finishedTitle', {
          defaultValue: t('harvestCampaign.complete.includes'),
        })}
      </p>
      <div className="hc-complete-metrics" role="list">
        <div className="hc-complete-metric" role="listitem">
          <span>{t('harvestCampaign.complete.olives', { kg: formatGroveMassKg(officialKg, locale) })}</span>
        </div>
        <div className="hc-complete-metric" role="listitem">
          <span>{t('harvestCampaign.complete.oil', { kg: formatGroveMassKg(oilKg, locale) })}</span>
        </div>
        {yieldPct != null ? (
          <div className="hc-complete-metric hc-complete-metric--accent" role="listitem">
            <span>
              {t('harvestCampaign.complete.yield', {
                yield: formatHarvestYieldPercent(yieldPct, locale),
              })}
            </span>
          </div>
        ) : null}
        <div className="hc-complete-metric" role="listitem">
          <span>{t('harvestCampaign.complete.days', { count: days })}</span>
        </div>
        <div className="hc-complete-metric" role="listitem">
          <span>{t('harvestCampaign.complete.personDays', { count: personDays })}</span>
        </div>
        <div className="hc-complete-metric" role="listitem">
          <span>{t('harvestCampaign.complete.expense', { amount: expenseEur })}</span>
        </div>
      </div>
      {unweighedSacks > 0 ? (
        <p className="money-warn">{t('harvestCampaign.complete.unweighed', { count: unweighedSacks })}</p>
      ) : null}
    </HarvestSheetShell>
  );
};
