import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestNumberInput } from '../components/HarvestNumberInput';
import { HarvestNumberStepper } from '../components/HarvestNumberStepper';
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
> = ({ campaign, fields, preferredFieldId, initial, onSave, onClose }) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const editing = Boolean(initial);
  const [sacks, setSacks] = useState(initial?.sacks ?? 12);
  const [fieldId, setFieldId] = useState(
    initial?.fieldId || preferredFieldId || campaign.fieldOrder[0] || fields[0]?.id || ''
  );
  const [more, setMore] = useState(Boolean(initial?.kgPerSack));
  const [kgPerSackDraft, setKgPerSackDraft] = useState(
    String(initial?.kgPerSack || campaign.usualSackKg || 45)
  );
  const { recommendation, loading } = useHarvestFieldGuess(fields);
  const kgPerSack = parseHarvestDecimal(kgPerSackDraft) ?? 0;
  const estimate = estimateSacksKg(sacks, kgPerSack);
  const canSave = Boolean(fieldId) && sacks > 0;
  const saveHint = !fieldId ? t('fields:harvestCampaign.validation.pickField') : null;

  return (
    <HarvestSheetShell
      footer={
        <>
          {!canSave && saveHint ? (
            <Text style={{ color: colors.textTertiary, textAlign: 'center' }}>{saveHint}</Text>
          ) : null}
          <Button
            title={
              editing
                ? t('fields:harvestCampaign.dayActivity.saveChanges')
                : t('fields:harvestCampaign.sacks.save', { count: sacks })
            }
            disabled={!canSave}
            onPress={() =>
              onSave({
                sacks,
                fieldId,
                kgPerSack:
                  more && isPositiveAmount(kgPerSack) ? kgPerSack : campaign.usualSackKg || undefined,
              })
            }
            fullWidth
          />
          <Button title={t('common:cancel')} variant="ghost" onPress={onClose} fullWidth />
        </>
      }
    >
      <Text style={[styles.prompt, { color: colors.textPrimary }]}>
        {editing
          ? t('fields:harvestCampaign.dayActivity.editSacks')
          : t('fields:harvestCampaign.sacks.prompt')}
      </Text>
      <HarvestNumberStepper
        label={t('fields:harvestCampaign.sacks.unit')}
        value={sacks}
        onChange={setSacks}
        min={1}
        suffix={t('fields:harvestCampaign.sacks.unit')}
      />
      <HarvestFieldPicker
        mode="single"
        fields={fields}
        value={fieldId}
        onChange={setFieldId}
        recommendation={recommendation}
        locationUnavailable={!loading && !recommendation}
        autoApplyGuess={!editing}
        sectionLabel={t('fields:harvestCampaign.sacks.whichField')}
      />
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
          {estimate > 0 ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('fields:harvestCampaign.sacks.estimateLine', { sacks, kg: Math.round(estimate) })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  prompt: { fontWeight: '700', fontSize: 16 },
});
