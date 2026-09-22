import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { formatHarvestOilAmount } from '../utils/harvestCalculations';

type HarvestRecordSheetProps = {
  record: {
    id: string;
    fieldId: string;
    harvestDate: string;
    oliveKg: number;
    oilKg?: number | null;
    oilLitres?: number | null;
    sackCount?: number;
    workersUsed: number;
    millName?: string;
    status?: string;
    notes?: string;
  };
  fieldName: string;
  locale: string;
  canVoid: boolean;
  busy?: boolean;
  onVoid: () => void;
};

export const HarvestRecordSheet: React.FC<HarvestRecordSheetProps> = ({
  record,
  fieldName,
  locale,
  canVoid,
  busy,
  onVoid,
}) => {
  const { t } = useTranslation(['fields', 'common', 'chronologio']);
  const { formatDate } = useLocaleFormatters();
  const dateLabel = formatDate(record.harvestDate);

  const hasLitres = record.oilLitres != null && record.oilLitres > 0;
  const hasKg = record.oilKg != null && record.oilKg > 0;

  return (
    <HarvestSheetShell
      footer={
        canVoid && record.status !== 'voided' ? (
          <button type="button" className="money-text-link" disabled={busy} onClick={onVoid}>
            {t('chronologio:drawer.void', { defaultValue: 'Void' })}
          </button>
        ) : undefined
      }
    >
      <p className="capture-prompt">
        {fieldName} · {dateLabel}
      </p>
      <dl className="hc-record-facts">
        <div>
          <dt>{t('harvestCampaign.record.olives', { defaultValue: 'Olives' })}</dt>
          <dd>{formatGroveMassKg(record.oliveKg, locale)}</dd>
        </div>
        {record.sackCount != null && record.sackCount > 0 ? (
          <div>
            <dt>{t('harvestCampaign.sacks.unit', { defaultValue: 'Sacks' })}</dt>
            <dd>{record.sackCount}</dd>
          </div>
        ) : null}
        {hasLitres ? (
          <div>
            <dt>{t('harvestCampaign.record.oil', { defaultValue: 'Oil' })}</dt>
            <dd>
              {formatHarvestOilAmount(record.oilLitres, 'litres', locale)}
              {hasKg ? (
                <span className="capture-hint">
                  {' '}
                  ≈ {formatGroveMassKg(record.oilKg, locale)}
                </span>
              ) : null}
            </dd>
          </div>
        ) : hasKg ? (
          <div>
            <dt>{t('harvestCampaign.record.oil', { defaultValue: 'Oil' })}</dt>
            <dd>{formatGroveMassKg(record.oilKg, locale)}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('harvestCampaign.record.people', { defaultValue: 'People' })}</dt>
          <dd>{record.workersUsed}</dd>
        </div>
        {record.millName ? (
          <div>
            <dt>{t('harvestCampaign.record.mill', { defaultValue: 'Mill' })}</dt>
            <dd>{record.millName}</dd>
          </div>
        ) : null}
      </dl>
      {record.notes ? <p className="capture-hint">{record.notes}</p> : null}
    </HarvestSheetShell>
  );
};
