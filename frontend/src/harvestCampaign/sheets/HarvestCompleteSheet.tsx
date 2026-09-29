import React from 'react';
import { CalendarDays, Droplets, Percent, Scale, Users, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { localeTagFor } from '../../utils/localeFormatters';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { HarvestStatStrip, type HarvestStatItem } from '../components/HarvestStatStrip';
import { convertOliveOilKgToLitres, formatHarvestYieldPercent } from '../utils/harvestCalculations';

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
  const whole = (value: number) =>
    new Intl.NumberFormat(localeTagFor(locale), { maximumFractionDigits: 0 }).format(
      Math.round(value)
    );
  const litres = oilKg > 0 ? Math.round(convertOliveOilKgToLitres(oilKg)) : 0;

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

  const stats: HarvestStatItem[] = [
    {
      id: 'mill',
      icon: Scale,
      value: officialKg > 0 ? formatGroveMassKg(officialKg, locale) : '—',
      label: t('harvestCampaign.flow.unitKg'),
    },
    {
      id: 'oil',
      icon: Droplets,
      value: litres > 0 ? whole(litres) : '—',
      label: t('harvestCampaign.flow.unitOilLitres'),
    },
    {
      id: 'days',
      icon: CalendarDays,
      value: whole(days),
      label: t('harvestCampaign.flow.days'),
    },
    {
      id: 'people',
      icon: Users,
      value: whole(personDays),
      label: t('harvestCampaign.complete.personDaysLabel'),
    },
    {
      id: 'expense',
      icon: Wallet,
      value: `${whole(expenseEur)} €`,
      label: t('harvestCampaign.actions.expense'),
    },
  ];
  if (yieldPct != null) {
    stats.push({
      id: 'yield',
      icon: Percent,
      value: `${formatHarvestYieldPercent(yieldPct, locale)}%`,
      label: t('harvestCampaign.dashboard.yieldLabel'),
    });
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
      <HarvestStatStrip items={stats} label={t('harvestCampaign.complete.readyTitle')} />
      {missing.length > 0 ? (
        <div className="hc-complete-missing" role="status">
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
