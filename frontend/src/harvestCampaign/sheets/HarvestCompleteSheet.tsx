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
  openDays?: number;
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
  openDays = 0,
  locale,
  onFill,
  onFinish,
}) => {
  const { t } = useTranslation('fields');
  const missing: string[] = [];
  if (officialKg <= 0) missing.push(t('harvestCampaign.complete.missingMill'));
  if (oilKg <= 0) missing.push(t('harvestCampaign.complete.missingOil'));
  if (unweighedSacks > 0) {
    missing.push(t('harvestCampaign.complete.unweighed', { count: unweighedSacks }));
  }
  if (openDays > 0) {
    missing.push(t('harvestCampaign.complete.missingOpenDays', { count: openDays }));
  }
  if (days <= 0 && officialKg <= 0 && oilKg <= 0) {
    missing.push(t('harvestCampaign.complete.missingEmpty'));
  }

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
            {missing.length > 0
              ? t('harvestCampaign.complete.confirmAnyway')
              : t('harvestCampaign.complete.confirm')}
          </button>
        </>
      }
    >
      <p className="capture-prompt hc-complete-hero">{t('harvestCampaign.complete.readyTitle')}</p>
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
      {missing.length > 0 ? (
        <div className="money-warn" role="status">
          <p>{t('harvestCampaign.complete.missingTitle')}</p>
          <ul>
            {missing.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </HarvestSheetShell>
  );
};
