import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatKg } from '../../utils/harvestUtils';
import { HarvestCarryPicker, carryColor } from '../components/HarvestCarryPicker';
import {
  equalFieldShares,
  fieldIdsFromShares,
  millFieldShares,
  oilFieldShares,
} from '../allocation';
import { millsNeedingOil } from '../chain';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestNumberInput } from '../components/HarvestNumberInput';
import { HarvestNumberStepper } from '../components/HarvestNumberStepper';
import { HarvestSegmentedControl } from '../components/HarvestSegmentedControl';
import { HarvestFormPager, HarvestQuickChips } from '../components/HarvestFormPager';
import {
  extractionYieldPercent,
  formatHarvestOilAmountLabel,
  formatHarvestYieldPercent,
  oilKgFromAmount,
  plausibleOilYield,
  readOilTinCounts,
  settleOil,
  type HarvestOilUnit,
} from '../utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestFieldShare, HarvestOilEntry } from '../types';
import type { HarvestFlowChrome, HarvestSheetSharedProps } from './types';

export const HarvestOilSheet: React.FC<
  HarvestSheetSharedProps & {
    prefillMillIds?: string[];
    initial?: HarvestOilEntry | null;
    flow?: HarvestFlowChrome;
    onSave: (input: {
      amount: number;
      unit: HarvestOilUnit;
      millKept?: number;
      tin16Count?: number;
      tin17Count?: number;
      tinSizeLitres?: 16 | 17;
      tinCount?: number;
      extraLitres?: number;
      millWeightIds: string[];
      fieldIds: string[];
      fieldShares?: HarvestFieldShare[];
      acidity?: number;
      note?: string;
    }) => void;
  }
> = ({ campaign, fields, locale, prefillMillIds, initial, flow, onSave, onClose }) => {
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

  const initialTins = readOilTinCounts(initial ?? {});
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [unit, setUnit] = useState<HarvestOilUnit>(initial?.unit ?? 'kg');
  const [millKept, setMillKept] = useState(
    initial?.millKept != null ? String(initial.millKept) : '0'
  );
  const [millMode, setMillMode] = useState<'amount' | 'percent'>('amount');
  const [storageMode, setStorageMode] = useState<'all' | 'tins'>(
    initialTins.tin16 > 0 || initialTins.tin17 > 0 ? 'tins' : 'all'
  );
  const [tin16, setTin16] = useState(initialTins.tin16);
  const [tin17, setTin17] = useState(initialTins.tin17);
  const [fieldIds, setFieldIds] = useState<string[]>(() => {
    if (initial?.fieldIds?.length) return initial.fieldIds;
    if (campaign.fieldOrder.length === 1) return [campaign.fieldOrder[0]];
    return [];
  });
  const [millWeightIds, setMillWeightIds] = useState<string[]>(defaultMillIds);
  const seenMillPrefill = useRef<string[]>([]);
  useEffect(() => {
    if (editing) return;
    const incoming = prefillMillIds ?? [];
    const fresh = incoming.filter((id) => !seenMillPrefill.current.includes(id));
    if (incoming.length > 0) {
      seenMillPrefill.current = [...new Set([...seenMillPrefill.current, ...incoming])];
    }
    if (fresh.length === 0) return;
    setMillWeightIds((prev) => [...new Set([...prev, ...fresh])]);
  }, [prefillMillIds, editing]);
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
  const millRaw = parseHarvestDecimal(millKept) ?? 0;
  const settlement =
    value != null && value > 0
      ? settleOil({
          total: value,
          unit,
          millKept: millRaw,
          millMode,
          tin16Count: tin16,
          tin17Count: tin17,
          splitTins: storageMode === 'tins',
        })
      : null;
  const splitBlocked = Boolean(settlement && (settlement.millOver || settlement.overAmount > 0));
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
    relatedOliveKg > 0 && oilKg > 0
      ? plausibleOilYield(extractionYieldPercent(relatedOliveKg, oilKg))
      : null;
  const canSave = isPositiveAmount(value) && !splitBlocked;
  const saveHint = !isPositiveAmount(value)
    ? t('fields:harvestCampaign.validation.enterAmount')
    : settlement?.millOver
      ? t('fields:harvestCampaign.oil.overMill')
      : settlement && settlement.overAmount > 0
        ? t('fields:harvestCampaign.oil.overTins', {
            amount: formatHarvestOilAmountLabel(settlement.overAmount, unit, locale),
          })
        : null;

  type OilPhase = 'source' | 'amount' | 'kept' | 'stored' | 'review';
  const oilPhases: OilPhase[] = useMemo(() => {
    const next: OilPhase[] = [];
    if (millChipOrder.length > 0 || campaign.fieldOrder.length > 1) next.push('source');
    next.push('amount');
    if (isPositiveAmount(value)) {
      next.push('kept');
      next.push('stored');
    }
    next.push('review');
    return next;
  }, [millChipOrder.length, campaign.fieldOrder.length, value]);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    setPhase((current) => Math.min(current, Math.max(oilPhases.length - 1, 0)));
  }, [oilPhases.length]);
  const phaseKey = oilPhases[Math.min(phase, oilPhases.length - 1)] ?? 'amount';
  const lastPhase = phase >= oilPhases.length - 1;
  const canAdvance =
    phaseKey === 'amount'
      ? isPositiveAmount(value)
      : phaseKey === 'kept'
        ? !settlement?.millOver
        : phaseKey === 'stored' || phaseKey === 'review'
          ? canSave
          : true;

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

  const toggleMill = (id: string) => {
    setMillWeightIds((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]
    );
    setAdjustShares(false);
  };

  const oilPayload = () => {
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
    const useTins = storageMode === 'tins';
    const only16 = useTins && tin16 > 0 && tin17 === 0;
    const only17 = useTins && tin17 > 0 && tin16 === 0;
    const tinSizeLitres: 16 | 17 | undefined = only16 ? 16 : only17 ? 17 : undefined;
    const bulkLitres =
      unit === 'litres' && settlement && settlement.bulkAmount > 0
        ? settlement.bulkAmount
        : undefined;
    return {
      amount: value!,
      unit,
      millKept: settlement?.millAmount ?? 0,
      tin16Count: useTins && tin16 > 0 ? tin16 : undefined,
      tin17Count: useTins && tin17 > 0 ? tin17 : undefined,
      tinSizeLitres,
      tinCount: only16 ? tin16 : only17 ? tin17 : undefined,
      extraLitres: (only16 || only17) && bulkLitres ? bulkLitres : undefined,
      millWeightIds,
      fieldIds: fieldIdsFromShares(shares).length
        ? fieldIdsFromShares(shares)
        : showFieldPicker
          ? fieldIds
          : fieldIdsFromShares(inferredShares),
      fieldShares: shares.length > 0 ? shares : undefined,
      acidity: acidity.trim() ? parseHarvestDecimal(acidity) ?? undefined : undefined,
      note: note.trim() || undefined,
    };
  };
  const commitRef = useRef(oilPayload);
  commitRef.current = oilPayload;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    flow?.bind?.(() => {
      if (!canSave) return false;
      onSaveRef.current(commitRef.current());
      return true;
    });
  }, [flow?.bind, canSave]);

  const phaseTitle =
    phaseKey === 'source'
      ? t('fields:harvestCampaign.steps.oilSource')
      : phaseKey === 'amount'
        ? t('fields:harvestCampaign.steps.oilAmount')
        : phaseKey === 'kept'
          ? t('fields:harvestCampaign.steps.oilKept')
          : phaseKey === 'stored'
            ? t('fields:harvestCampaign.steps.oilStored')
            : t('fields:harvestCampaign.steps.review');
  const phaseHint =
    phaseKey === 'source'
      ? t('fields:harvestCampaign.steps.oilSourceHint')
      : phaseKey === 'amount'
        ? t('fields:harvestCampaign.oil.prompt')
        : phaseKey === 'kept'
          ? t('fields:harvestCampaign.oil.millHint')
          : phaseKey === 'stored'
            ? t('fields:harvestCampaign.oil.storedAllHint')
            : editing
              ? t('fields:harvestCampaign.dayActivity.editOil')
              : t('fields:harvestCampaign.steps.reviewHint');
  const nextLabel = lastPhase
    ? flow
      ? flow.nextLabel
      : editing
        ? t('fields:harvestCampaign.dayActivity.saveChanges')
        : t('fields:harvestCampaign.oil.save', {
            amount: formatKg(value || 0),
            unit: unit === 'litres' ? t('fields:harvestCampaign.oil.litres') : 'kg',
          })
    : t('fields:harvestCampaign.wizard.next');
  const footerError =
    (phaseKey === 'amount' && !isPositiveAmount(value) && amount.trim()
      ? t('fields:harvestCampaign.validation.enterAmount')
      : null) ||
    (lastPhase || phaseKey === 'stored' || phaseKey === 'kept' ? saveHint : null);

  return (
    <HarvestFormPager
      current={phase}
      total={oilPhases.length}
      title={phaseTitle}
      hint={phaseHint}
      nextLabel={nextLabel}
      nextDisabled={!canAdvance}
      onNext={() => {
        if (!lastPhase) {
          setPhase((current) => current + 1);
          return;
        }
        onSave(oilPayload());
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
      error={footerError}
    >
      {phaseKey === 'source' ? (
        <>
          {millChipOrder.length > 0 ? (
            <HarvestCarryPicker
              hideHeading
              label={t('fields:harvestCampaign.oil.relatedKg')}
              items={millChipOrder.map((row) => {
                const fieldNames = row.fieldIds
                  .map((id) => friendlyFieldLabel(fields.find((f) => f.id === id)?.name || id))
                  .filter(Boolean);
                const needsOil = uncovered.some((m) => m.id === row.id);
                return {
                  id: row.id,
                  title: `${formatKg(row.kg)} kg`,
                  detail: fieldNames.join(' + '),
                  colors: row.fieldIds.map((id) => {
                    const field = fields.find((f) => f.id === id);
                    return resolveFieldColor(field?.color, id);
                  }),
                  badge: needsOil ? t('fields:harvestCampaign.flow.needsOil') : undefined,
                };
              })}
              selected={millWeightIds}
              onToggle={toggleMill}
              transfer={
                relatedOliveKg > 0
                  ? {
                      from: t('fields:harvestCampaign.flow.fruitLine', {
                        kg: Math.round(relatedOliveKg),
                      }),
                      to: t('fields:harvestCampaign.addMenu.title.oil'),
                      color: carryColor(
                        selectedMills.flatMap((row) =>
                          row.fieldIds.map((id) => {
                            const field = fields.find((f) => f.id === id);
                            return resolveFieldColor(field?.color, id);
                          })
                        )
                      ),
                    }
                  : null
              }
              hint={relatedOliveKg > 0 ? undefined : t('fields:harvestCampaign.carry.pickFruit')}
              trailing={
                <Pressable
                  onPress={() => {
                    setMillWeightIds([]);
                    setAdjustShares(false);
                  }}
                >
                  <Text
                    style={{
                      color: millWeightIds.length === 0 ? colors.primary : colors.textSecondary,
                      fontWeight: '700',
                    }}
                  >
                    {t('fields:harvestCampaign.oil.noRelated')}
                  </Text>
                </Pressable>
              }
            />
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
                          row.fieldId === share.fieldId
                            ? { ...row, weight: Math.max(0, weight) }
                            : row
                        )
                      );
                    }}
                    min={0}
                  />
                );
              })
            : null}
        </>
      ) : null}
      {phaseKey === 'amount' ? (
        <>
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
            label={
              unit === 'kg' ? t('fields:harvestCampaign.oil.kg') : t('fields:harvestCampaign.oil.litres')
            }
            value={amount}
            onChange={setAmount}
            suffix={unit === 'kg' ? 'kg' : 'L'}
          />
          <HarvestQuickChips
            values={[5, 10, 20, 50]}
            suffix={unit === 'kg' ? 'kg' : 'L'}
            onPick={(add) =>
              setAmount(String(Math.round(((parseHarvestDecimal(amount) ?? 0) + add) * 100) / 100))
            }
          />
          {unit === 'litres' && isPositiveAmount(value) ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('fields:harvestCampaign.oil.estimatedKg', { kg: formatKg(oilKg) })}
            </Text>
          ) : null}
        </>
      ) : null}
      {phaseKey === 'kept' ? (
        <>
          <HarvestNumberInput
            label={t('fields:harvestCampaign.oil.millTitle')}
            value={millKept}
            onChange={setMillKept}
            suffix={millMode === 'percent' ? '%' : unit === 'kg' ? 'kg' : 'L'}
            min={0}
          />
          <HarvestSegmentedControl
            value={millMode}
            ariaLabel={t('fields:harvestCampaign.oil.millModeLabel')}
            onChange={setMillMode}
            options={[
              { value: 'amount', label: t('fields:harvestCampaign.oil.millAmount') },
              { value: 'percent', label: t('fields:harvestCampaign.oil.millPercent') },
            ]}
          />
          {yieldPct != null ? (
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
              {t('fields:harvestCampaign.oil.yieldLine', {
                olives: formatKg(relatedOliveKg),
                oil: formatKg(oilKg),
                yield: formatHarvestYieldPercent(yieldPct, locale),
              })}
            </Text>
          ) : null}
          {settlement?.millOver ? (
            <Text style={{ color: colors.error }}>{t('fields:harvestCampaign.oil.overMill')}</Text>
          ) : null}
        </>
      ) : null}
      {phaseKey === 'stored' ? (
        <>
          <HarvestSegmentedControl
            value={storageMode}
            ariaLabel={t('fields:harvestCampaign.oil.storedTitle')}
            onChange={setStorageMode}
            options={[
              { value: 'all', label: t('fields:harvestCampaign.oil.storedAll') },
              { value: 'tins', label: t('fields:harvestCampaign.oil.storedTins') },
            ]}
          />
          {storageMode === 'tins' ? (
            <>
              <HarvestNumberStepper
                label={t('fields:harvestCampaign.oil.tin16')}
                value={tin16}
                onChange={(next) => setTin16(Math.max(0, Math.round(next)))}
                min={0}
                suffix={t('fields:harvestCampaign.oil.tinSuffix')}
              />
              <HarvestNumberStepper
                label={t('fields:harvestCampaign.oil.tin17')}
                value={tin17}
                onChange={(next) => setTin17(Math.max(0, Math.round(next)))}
                min={0}
                suffix={t('fields:harvestCampaign.oil.tinSuffix')}
              />
              {settlement && !settlement.millOver && settlement.overAmount <= 0 ? (
                <Text style={{ color: colors.textSecondary }}>
                  {t('fields:harvestCampaign.oil.bulkLine', {
                    amount: formatHarvestOilAmountLabel(settlement.bulkAmount, unit, locale),
                  })}
                </Text>
              ) : null}
            </>
          ) : null}
          {settlement && settlement.overAmount > 0 ? (
            <Text style={{ color: colors.error }}>
              {t('fields:harvestCampaign.oil.overTins', {
                amount: formatHarvestOilAmountLabel(settlement.overAmount, unit, locale),
              })}
            </Text>
          ) : null}
        </>
      ) : null}
      {phaseKey === 'review' ? (
        <>
          {settlement
            ? settlement.parts.map((part) => (
                <Text key={part.key} style={{ color: colors.textSecondary }}>
                  {t(`fields:harvestCampaign.oil.part.${part.key}`)} ·{' '}
                  {formatHarvestOilAmountLabel(part.amount, unit, locale)}
                </Text>
              ))
            : null}
          {yieldPct != null ? (
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
              {t('fields:harvestCampaign.oil.yieldLine', {
                olives: formatKg(relatedOliveKg),
                oil: formatKg(oilKg),
                yield: formatHarvestYieldPercent(yieldPct, locale),
              })}
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
        </>
      ) : null}
    </HarvestFormPager>
  );
};

const styles = StyleSheet.create({
  note: { borderWidth: 1, borderRadius: 12, minHeight: 72, padding: 12, textAlignVertical: 'top' },
});
