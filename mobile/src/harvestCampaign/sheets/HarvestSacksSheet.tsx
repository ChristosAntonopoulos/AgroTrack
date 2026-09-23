import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestFormPager, HarvestQuickChips } from '../components/HarvestFormPager';
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
  const { colors } = useTheme();
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

  type SackPhase = 'count' | 'field' | 'extras';
  const sackPhases: SackPhase[] = useMemo(() => {
    const next: SackPhase[] = ['count'];
    if (fieldMode === 'required' || fields.length > 1) next.push('field');
    next.push('extras');
    return next;
  }, [fieldMode, fields.length]);
  const [phase, setPhase] = useState(0);
  const phaseKey = sackPhases[Math.min(phase, sackPhases.length - 1)] ?? 'count';
  const lastPhase = phase >= sackPhases.length - 1;
  const canAdvance =
    phaseKey === 'count' ? sacks > 0 : phaseKey === 'field' ? Boolean(fieldId) : canSave;

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
      current={phase}
      total={sackPhases.length}
      title={
        phaseKey === 'count'
          ? t('fields:harvestCampaign.steps.sacksCount')
          : phaseKey === 'field'
            ? t('fields:harvestCampaign.steps.sacksField')
            : t('fields:harvestCampaign.steps.review')
      }
      hint={
        phaseKey === 'count'
          ? t('fields:harvestCampaign.sacks.prompt')
          : phaseKey === 'field'
            ? t('fields:harvestCampaign.sacks.whichField')
            : editing
              ? t('fields:harvestCampaign.dayActivity.editSacks')
              : t('fields:harvestCampaign.steps.reviewHint')
      }
      nextLabel={
        lastPhase
          ? flow
            ? flow.nextLabel
            : editing
              ? t('fields:harvestCampaign.dayActivity.saveChanges')
              : t('fields:harvestCampaign.sacks.save', { count: sacks })
          : t('fields:harvestCampaign.wizard.next')
      }
      nextDisabled={!canAdvance}
      onNext={() => {
        if (!lastPhase) {
          setPhase((current) => current + 1);
          return;
        }
        onSave(sackPayload());
      }}
      backLabel={flow?.backLabel || t('common:back')}
      onBack={
        phase > 0 || flow?.onBack
          ? () => {
              if (phase > 0) setPhase((current) => current - 1);
              else flow?.onBack?.();
            }
          : undefined
      }
      cancelLabel={t('common:cancel')}
      onCancel={onClose}
      busy={flow?.busy}
      error={!canAdvance ? saveHint : null}
    >
      {phaseKey === 'count' ? (
        <>
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
            <Text style={{ color: colors.textSecondary }}>
              {t('fields:harvestCampaign.sacks.estimateLine', { sacks, kg: Math.round(estimate) })}
            </Text>
          ) : null}
        </>
      ) : null}
      {phaseKey === 'field' ? (
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
      ) : null}
      {phaseKey === 'extras' ? (
        <>
          {estimate > 0 ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('fields:harvestCampaign.sacks.estimateLine', { sacks, kg: Math.round(estimate) })}
            </Text>
          ) : null}
          <Pressable onPress={() => setMore((v) => !v)}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {more ? t('fields:harvestCampaign.less') : t('fields:harvestCampaign.more')}
            </Text>
          </Pressable>
          {more ? (
            <View style={{ gap: 8 }}>
              <HarvestNumberInput
                label={t('fields:harvestCampaign.sacks.kgPerSack')}
                value={kgPerSackDraft}
                onChange={setKgPerSackDraft}
                suffix="kg"
                min={0}
              />
            </View>
          ) : null}
        </>
      ) : null}
    </HarvestFormPager>
  );
};
