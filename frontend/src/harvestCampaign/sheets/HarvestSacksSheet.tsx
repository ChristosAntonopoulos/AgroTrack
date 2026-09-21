import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestNumberInput, HarvestNumberStepper } from '../components/HarvestNumberInput';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { harvestFieldSelectionMode, resolveHarvestCaptureFieldId } from '../fieldSelection';
import { useHarvestFieldGuess } from '../hooks/useHarvestFieldGuess';
import { estimateSacksKg } from '../utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestSackEntry } from '../types';
import type { HarvestSheetSharedProps } from './types';

const QUICK_COUNTS = [1, 5, 10, 12] as const;

export const HarvestSacksSheet: React.FC<
  HarvestSheetSharedProps & {
    preferredFieldId?: string;
    initial?: HarvestSackEntry | null;
    onSave: (input: { sacks: number; fieldId: string; kgPerSack?: number }) => void;
  }
> = ({ campaign, fields, preferredFieldId, initial, onSave, onClose }) => {
  const { t } = useTranslation('fields');
  const allowedIds = useMemo(
    () => (campaign.fieldOrder.length ? campaign.fieldOrder : fields.map((f) => f.id)),
    [campaign.fieldOrder, fields]
  );
  const selectionMode = harvestFieldSelectionMode(
    campaign.fieldOrder.length ? campaign.fieldOrder : allowedIds.length === 1 ? allowedIds : []
  );
  const [sacks, setSacks] = useState(initial?.sacks ?? 0);
  const [fieldId, setFieldId] = useState(() =>
    resolveHarvestCaptureFieldId({
      preferredFieldId,
      campaignFieldOrder: campaign.fieldOrder,
      initialFieldId: initial?.fieldId,
      allowedFieldIds: allowedIds,
    })
  );
  const [more, setMore] = useState(Boolean(initial?.kgPerSack));
  const [kgPerSackDraft, setKgPerSackDraft] = useState(
    String(initial?.kgPerSack || campaign.usualSackKg || 45)
  );
  const { recommendation } = useHarvestFieldGuess(fields);
  const editing = Boolean(initial);
  const fieldLabel = friendlyFieldLabel(fields.find((f) => f.id === fieldId)?.name || fieldId);

  const kgPerSack = parseHarvestDecimal(kgPerSackDraft) ?? 0;
  const estimate = estimateSacksKg(sacks, kgPerSack);
  const canSave = Boolean(fieldId) && sacks > 0;

  return (
    <HarvestSheetShell
      footer={
        <>
          <button
            type="button"
            className="money-primary-action"
            disabled={!canSave}
            onClick={() =>
              onSave({
                sacks,
                fieldId,
                kgPerSack:
                  more && isPositiveAmount(kgPerSack) ? kgPerSack : campaign.usualSackKg || undefined,
              })
            }
          >
            {editing
              ? t('harvestCampaign.dayActivity.saveChanges')
              : t('harvestCampaign.sacks.saveWithField', {
                  count: sacks,
                  field: fieldLabel,
                  defaultValue: t('harvestCampaign.sacks.save', { count: sacks }),
                })}
          </button>
          <button type="button" className="money-text-link" onClick={onClose}>
            {t('common:cancel', { ns: 'common' })}
          </button>
        </>
      }
    >
      <p className="capture-prompt">
        {editing ? t('harvestCampaign.dayActivity.editSacks') : t('harvestCampaign.sacks.prompt')}
      </p>
      <HarvestNumberStepper
        label={t('harvestCampaign.sacks.unit')}
        value={sacks}
        onChange={setSacks}
        min={0}
        suffix={t('harvestCampaign.sacks.unit')}
      />
      <div className="money-chips hc-quick-counts" role="group" aria-label={t('harvestCampaign.sacks.unit')}>
        {QUICK_COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            className={`money-chip${sacks === n ? ' is-active' : ''}`}
            aria-pressed={sacks === n}
            onClick={() => setSacks((prev) => prev + n)}
          >
            +{n}
          </button>
        ))}
      </div>
      <HarvestFieldPicker
        mode="single"
        fields={fields}
        value={fieldId}
        onChange={setFieldId}
        recommendation={selectionMode === 'locked' ? null : recommendation}
        locked={selectionMode === 'locked'}
        sectionLabel={t('harvestCampaign.sacks.whichField')}
      />
      <button type="button" className="capture-more-toggle" onClick={() => setMore((v) => !v)}>
        {more ? t('harvestCampaign.less') : t('harvestCampaign.more')}
      </button>
      {more ? (
        <>
          <HarvestNumberInput
            label={t('harvestCampaign.sacks.kgPerSack')}
            value={kgPerSackDraft}
            onChange={setKgPerSackDraft}
            suffix="kg"
            min={0}
          />
          {estimate > 0 ? (
            <span className="capture-hint">
              {t('harvestCampaign.sacks.estimateLabel', {
                kg: Math.round(estimate),
                defaultValue: t('harvestCampaign.sacks.estimateLine', {
                  sacks,
                  kg: Math.round(estimate),
                }),
              })}
            </span>
          ) : null}
        </>
      ) : null}
    </HarvestSheetShell>
  );
};
