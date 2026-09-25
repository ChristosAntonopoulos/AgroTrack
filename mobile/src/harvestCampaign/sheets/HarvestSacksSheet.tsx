import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestFormPager, HarvestHint, HarvestMoreToggle, HarvestQuickChips } from '../components/HarvestFormPager';
import { HarvestNumberInput } from '../components/HarvestNumberInput';
import { HarvestNumberStepper } from '../components/HarvestNumberStepper';
import { harvestFieldSelectionMode, resolveHarvestCaptureFieldId } from '../fieldSelection';
import { useHarvestFieldGuess } from '../hooks/useHarvestFieldGuess';
import { estimateSacksKg } from '../utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestSackEntry } from '../types';
import type { HarvestFlowChrome, HarvestSheetSharedProps } from './types';

export const HarvestSacksSheet: React.FC<
  HarvestSheetSharedProps & {
    initial?: HarvestSackEntry | null;
    flow?: HarvestFlowChrome;
    onSave: (input: { sacks: number; fieldId: string; kgPerSack?: number }) => void;
  }
> = ({ campaign, fields, preferredFieldId, initial, flow, onSave, onClose }) => {
  const { t } = useTranslation(['fields', 'common']);
  const editing = Boolean(initial);
  const [sacks, setSacks] = useState(initial?.sacks ?? 0);
  const [fieldId, setFieldId] = useState(
    resolveHarvestCaptureFieldId({
      preferredFieldId,
      campaignFieldOrder: campaign.fieldOrder,
      initialFieldId: initial?.fieldId,
      allowedFieldIds: fields.map((field) => field.id),
    })
  );
  const fieldMode = harvestFieldSelectionMode(campaign.fieldOrder);
  const [more, setMore] = useState(Boolean(initial?.kgPerSack));
  const [kgPerSackDraft, setKgPerSackDraft] = useState(
    String(initial?.kgPerSack || campaign.usualSackKg || 45)
  );
  const { recommendation, loading } = useHarvestFieldGuess(fields);
  const kgPerSack = parseHarvestDecimal(kgPerSackDraft) ?? 0;
  const estimate = estimateSacksKg(sacks, kgPerSack);
  const canSave = Boolean(fieldId) && sacks > 0;
  const saveHint = !fieldId
    ? t('fields:harvestCampaign.validation.pickField')
    : sacks <= 0
      ? t('fields:harvestCampaign.sacks.prompt')
      : null;

  const sackPayload = () => ({
    sacks,
    fieldId,
    kgPerSack: more && isPositiveAmount(kgPerSack) ? kgPerSack : campaign.usualSackKg || undefined,
  });
  const commitRef = useRef(sackPayload);
  commitRef.current = sackPayload;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    flow?.bind?.(() => {
      if (!canSave) return false;
      onSaveRef.current(commitRef.current());
      return true;
    });
  }, [flow?.bind, canSave]);

  return (
    <HarvestFormPager
      current={0}
      total={1}
      title={editing ? t('fields:harvestCampaign.dayActivity.editSacks') : t('fields:harvestCampaign.sacks.prompt')}
      nextLabel={
        editing
          ? t('fields:harvestCampaign.dayActivity.saveChanges')
          : t('fields:harvestCampaign.sacks.save', { count: sacks })
      }
      nextDisabled={!canSave}
      onNext={() => onSave(sackPayload())}
      backLabel={flow?.backLabel}
      onBack={flow?.onBack}
      cancelLabel={t('common:cancel')}
      onCancel={onClose}
      busy={flow?.busy}
      error={!canSave ? saveHint : null}
    >
      <HarvestNumberStepper
        label={t('fields:harvestCampaign.sacks.unit')}
        value={sacks}
        onChange={setSacks}
        min={0}
        suffix={t('fields:harvestCampaign.sacks.unit')}
      />
      <HarvestQuickChips
        values={[1, 5, 10, 12]}
        suffix={t('fields:harvestCampaign.sacks.unit')}
        onPick={(add) => setSacks((current) => current + add)}
      />
      {estimate > 0 ? (
        <HarvestHint>
          {t('fields:harvestCampaign.sacks.estimateLine', { sacks, kg: Math.round(estimate) })}
        </HarvestHint>
      ) : null}
      <HarvestFieldPicker
        mode="single"
        fields={fields}
        value={fieldId}
        onChange={setFieldId}
        recommendation={recommendation}
        locationUnavailable={!loading && !recommendation}
        autoApplyGuess={!editing && fieldMode !== 'required'}
        sectionLabel={t('fields:harvestCampaign.sacks.whichField')}
      />
      <HarvestMoreToggle
        open={more}
        onPress={() => setMore((v) => !v)}
        openLabel={t('fields:harvestCampaign.less')}
        closedLabel={t('fields:harvestCampaign.more')}
      />
      {more ? (
        <HarvestNumberInput
          label={t('fields:harvestCampaign.sacks.kgPerSack')}
          value={kgPerSackDraft}
          onChange={setKgPerSackDraft}
          suffix="kg"
          min={0}
        />
      ) : null}
    </HarvestFormPager>
  );
};
