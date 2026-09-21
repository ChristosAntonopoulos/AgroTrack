import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatKg } from '../../utils/harvestUtils';
import {
  equalFieldShares,
  fieldIdsFromShares,
  millFieldShares,
  oilFieldShares,
} from '../allocation';
import { millsNeedingOil } from '../chain';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestNumberInput } from '../components/HarvestNumberInput';
import { HarvestSegmentedControl } from '../components/HarvestSegmentedControl';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import {
  extractionYieldPercent,
  formatHarvestYieldPercent,
  oilKgFromAmount,
  type HarvestOilUnit,
} from '../utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestFieldShare, HarvestOilEntry } from '../types';
import type { HarvestSheetSharedProps } from './types';

export const HarvestOilSheet: React.FC<
  HarvestSheetSharedProps & {
    prefillMillIds?: string[];
    initial?: HarvestOilEntry | null;
    onSave: (input: {
      amount: number;
      unit: HarvestOilUnit;
      millWeightIds: string[];
      fieldIds: string[];
      fieldShares?: HarvestFieldShare[];
      acidity?: number;
      note?: string;
    }) => void;
  }
> = ({ campaign, fields, locale, prefillMillIds, initial, onSave, onClose }) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const editing = Boolean(initial);
  const uncovered = useMemo(() => millsNeedingOil(campaign), [campaign]);
  const defaultMillIds = useMemo(() => {
    if (initial?.millWeightIds?.length) return initial.millWeightIds;
    if (prefillMillIds && prefillMillIds.length > 0) {
      const allowed = new Set(campaign.millWeights.map((m) => m.id));
      return prefillMillIds.filter((id) => allowed.has(id));
    }
    if (uncovered.length > 0) return [uncovered[0].id];
    const latest = campaign.millWeights.at(-1)?.id;
    return latest ? [latest] : [];
  }, [initial, prefillMillIds, uncovered, campaign.millWeights]);

  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [unit, setUnit] = useState<HarvestOilUnit>(initial?.unit ?? 'kg');
  const [fieldIds, setFieldIds] = useState<string[]>(initial?.fieldIds || []);
  const [millWeightIds, setMillWeightIds] = useState<string[]>(defaultMillIds);
  const [note, setNote] = useState(initial?.note || '');
  const [more, setMore] = useState(Boolean(initial?.acidity != null || initial?.note));
  const [adjustShares, setAdjustShares] = useState(false);
  const [manualShares, setManualShares] = useState<HarvestFieldShare[]>(
    initial?.fieldShares || []
  );
  const [acidity, setAcidity] = useState(
    initial?.acidity != null ? String(initial.acidity) : ''
  );
  const value = parseHarvestDecimal(amount);
  const millChipOrder = useMemo(() => {
    const uncoveredIds = new Set(uncovered.map((m) => m.id));
    const rest = campaign.millWeights
      .filter((m) => !uncoveredIds.has(m.id))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    return [...uncovered, ...rest];
  }, [campaign.millWeights, uncovered]);
  const selectedMills = campaign.millWeights.filter((row) => millWeightIds.includes(row.id));
  const relatedOliveKg = selectedMills.reduce((sum, row) => sum + row.kg, 0);
  const oilKg = isPositiveAmount(value) ? oilKgFromAmount(value, unit) : 0;
  const yieldPct =
    relatedOliveKg > 0 && oilKg > 0 ? extractionYieldPercent(relatedOliveKg, oilKg) : null;
  const canSave = isPositiveAmount(value);
  const saveHint = !canSave ? t('fields:harvestCampaign.validation.enterAmount') : null;

  const inferredShares = useMemo(() => {
    if (selectedMills.length > 0) {
      const byField = new Map<string, number>();
      for (const mill of selectedMills) {
        for (const share of millFieldShares(campaign, mill)) {
          byField.set(share.fieldId, (byField.get(share.fieldId) || 0) + share.weight);
        }
      }
      if (byField.size > 0) {
        return [...byField.entries()].map(([fieldId, weight]) => ({ fieldId, weight }));
      }
    }
    return equalFieldShares(fieldIds);
  }, [campaign, selectedMills, fieldIds]);

  const activeShares = adjustShares && manualShares.length > 0 ? manualShares : inferredShares;
  const showFieldPicker = millWeightIds.length === 0;
  const inferredLabels = fieldIdsFromShares(inferredShares)
    .map((id) => friendlyFieldLabel(fields.find((f) => f.id === id)?.name || id))
    .filter(Boolean);

  return (
    <HarvestSheetShell
      footer={
        <>
          {saveHint ? (
            <Text style={{ color: colors.textTertiary, textAlign: 'center' }}>{saveHint}</Text>
          ) : null}
          <Button
            title={
              editing
                ? t('fields:harvestCampaign.dayActivity.saveChanges')
                : t('fields:harvestCampaign.oil.save', {
                    amount: formatKg(value || 0),
                    unit: unit === 'litres' ? t('fields:harvestCampaign.oil.litres') : 'kg',
                  })
            }
            disabled={!canSave}
            onPress={() => {
              const shares =
                activeShares.length > 0
                  ? activeShares
                  : oilFieldShares(campaign, {
                      id: 'draft',
                      date: '',
                      amount: value!,
                      unit,
                      millWeightIds,
                      fieldIds: showFieldPicker ? fieldIds : fieldIdsFromShares(inferredShares),
                      createdAt: '',
                    });
              onSave({
                amount: value!,
                unit,
                millWeightIds,
                fieldIds: fieldIdsFromShares(shares).length
                  ? fieldIdsFromShares(shares)
                  : showFieldPicker
                    ? fieldIds
                    : fieldIdsFromShares(inferredShares),
                fieldShares: shares.length > 0 ? shares : undefined,
                acidity: acidity.trim() ? parseHarvestDecimal(acidity) ?? undefined : undefined,
                note: note.trim() || undefined,
              });
            }}
            fullWidth
          />
          <Button title={t('common:cancel')} variant="ghost" onPress={onClose} fullWidth />
        </>
      }
    >
      <Text style={[styles.prompt, { color: colors.textPrimary }]}>
        {editing
          ? t('fields:harvestCampaign.dayActivity.editOil')
          : t('fields:harvestCampaign.oil.prompt')}
      </Text>
      <HarvestSegmentedControl
        value={unit}
        ariaLabel={t('fields:harvestCampaign.oil.prompt')}
        onChange={setUnit}
        options={[
          { value: 'kg', label: t('fields:harvestCampaign.oil.kg') },
          { value: 'litres', label: t('fields:harvestCampaign.oil.litres') },
        ]}
      />
      <HarvestNumberInput
        label={unit === 'kg' ? t('fields:harvestCampaign.oil.kg') : t('fields:harvestCampaign.oil.litres')}
        value={amount}
        onChange={setAmount}
        suffix={unit === 'kg' ? 'kg' : 'L'}
      />
      {unit === 'litres' && isPositiveAmount(value) ? (
        <Text style={{ color: colors.textSecondary }}>
          {t('fields:harvestCampaign.oil.estimatedKg', { kg: formatKg(oilKg) })}
        </Text>
      ) : null}
      {yieldPct != null ? (
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
          {t('fields:harvestCampaign.oil.yieldLine', {
            olives: formatKg(relatedOliveKg),
            oil: formatKg(oilKg),
            yield: formatHarvestYieldPercent(yieldPct, locale),
          })}
        </Text>
      ) : null}
      {millChipOrder.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('fields:harvestCampaign.oil.relatedKg')}
          </Text>
          <Pressable
            onPress={() => {
              setMillWeightIds([]);
              setAdjustShares(false);
            }}
            style={[
              styles.chip,
              { borderColor: millWeightIds.length === 0 ? colors.primary : colors.border },
            ]}
          >
            <Text>{t('fields:harvestCampaign.oil.noRelated')}</Text>
          </Pressable>
          {millChipOrder.map((row) => {
            const active = millWeightIds.includes(row.id);
            const fieldNames = row.fieldIds
              .map((id) => friendlyFieldLabel(fields.find((f) => f.id === id)?.name || id))
              .filter(Boolean);
            return (
              <Pressable
                key={row.id}
                onPress={() => {
                  setMillWeightIds((prev) =>
                    prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                  );
                  setAdjustShares(false);
                }}
                style={[styles.chip, { borderColor: active ? colors.primary : colors.border }]}
              >
                <Text>
                  {row.date} · {formatKg(row.kg)} kg
                  {fieldNames.length > 0 ? ` · ${fieldNames.join(' + ')}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {!showFieldPicker && inferredLabels.length > 0 ? (
        <Text style={{ color: colors.textSecondary }}>
          {t('fields:harvestCampaign.shared.fromFields', { fields: inferredLabels.join(' + ') })}
        </Text>
      ) : null}
      {showFieldPicker ? (
        <HarvestFieldPicker
          mode="multiple"
          fields={fields}
          value={fieldIds}
          onChange={(next) => {
            setFieldIds(next);
            setAdjustShares(false);
          }}
          sectionLabel={t('fields:harvestCampaign.millKg.whichField')}
        />
      ) : null}
      {activeShares.length > 1 ? (
        <Pressable
          onPress={() => {
            setManualShares(inferredShares.map((s) => ({ ...s })));
            setAdjustShares(true);
          }}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            {adjustShares
              ? t('fields:harvestCampaign.shared.editingShares')
              : t('fields:harvestCampaign.shared.adjustShares')}
          </Text>
        </Pressable>
      ) : null}
      {adjustShares
        ? manualShares.map((share) => {
            const field = fields.find((f) => f.id === share.fieldId);
            return (
              <HarvestNumberInput
                key={share.fieldId}
                label={t('fields:harvestCampaign.shared.shareFor', {
                  field: field?.name || share.fieldId,
                })}
                value={String(share.weight)}
                onChange={(raw) => {
                  const weight = parseHarvestDecimal(raw) ?? 0;
                  setManualShares((prev) =>
                    prev.map((row) =>
                      row.fieldId === share.fieldId ? { ...row, weight: Math.max(0, weight) } : row
                    )
                  );
                }}
                min={0}
              />
            );
          })
        : null}
      <Pressable onPress={() => setMore((v) => !v)}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>
          {more ? t('fields:harvestCampaign.less') : t('fields:harvestCampaign.more')}
        </Text>
      </Pressable>
      {more ? (
        <View style={{ gap: 8 }}>
          <HarvestNumberInput
            label={t('fields:harvestCampaign.oil.acidity')}
            value={acidity}
            onChange={setAcidity}
          />
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('fields:harvestCampaign.noteOptional')}
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            style={[styles.note, { color: colors.textPrimary, borderColor: colors.border }]}
          />
        </View>
      ) : null}
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  prompt: { fontWeight: '700', fontSize: 16 },
  chip: { borderWidth: 1, borderRadius: 12, padding: 10 },
  note: { borderWidth: 1, borderRadius: 12, minHeight: 72, padding: 12, textAlignVertical: 'top' },
});
