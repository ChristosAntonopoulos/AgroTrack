import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestNumberInput, HarvestNumberStepper } from '../components/HarvestNumberInput';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { useHarvestFieldGuess } from '../hooks/useHarvestFieldGuess';
import { estimateSacksKg } from '../utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestSackEntry } from '../types';
import type { HarvestSheetSharedProps } from './types';

export const HarvestSacksSheet: React.FC<
  HarvestSheetSharedProps & {
    initial?: HarvestSackEntry | null;
    onSave: (input: { sacks: number; fieldId: string; kgPerSack?: number }) => void;
  }
> = ({ campaign, fields, initial, onSave, onClose }) => {
  const { t } = useTranslation('fields');
  const [sacks, setSacks] = useState(initial?.sacks ?? 12);
  const [fieldId, setFieldId] = useState(
    initial?.fieldId || campaign.fieldOrder[0] || fields[0]?.id || ''
  );
  const [more, setMore] = useState(Boolean(initial?.kgPerSack));
  const [kgPerSackDraft, setKgPerSackDraft] = useState(
    String(initial?.kgPerSack || campaign.usualSackKg || 45)
  );
  const { recommendation } = useHarvestFieldGuess(fields);
  const editing = Boolean(initial);

  const kgPerSack = parseHarvestDecimal(kgPerSackDraft) ?? 0;
  const estimate = estimateSacksKg(sacks, kgPerSack);

  return (
    <HarvestSheetShell
      footer={
        <>
          <button
            type="button"
            className="money-primary-action"
            disabled={!fieldId || sacks <= 0}
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
              : t('harvestCampaign.sacks.save', { count: sacks })}
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
        min={1}
        suffix={t('harvestCampaign.sacks.unit')}
      />
      <HarvestFieldPicker
        mode="single"
        fields={fields}
        value={fieldId}
        onChange={setFieldId}
        recommendation={recommendation}
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
              {t('harvestCampaign.sacks.estimateLine', { sacks, kg: Math.round(estimate) })}
            </span>
          ) : null}
        </>
      ) : null}
    </HarvestSheetShell>
  );
};
