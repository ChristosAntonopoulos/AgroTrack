import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatKg } from '../../utils/harvestUtils';
import { HarvestCarryPicker, carryColor } from '../components/HarvestCarryPicker';
import { equalFieldShares, fieldIdsFromShares, sharesFromSacks } from '../allocation';
import { pendingSacksByDay, suggestMillIncludes } from '../chain';
import { HarvestFormPager, HarvestQuickChips } from '../components/HarvestFormPager';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestNumberInput } from '../components/HarvestNumberInput';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestFieldShare, HarvestMillWeightEntry } from '../types';
import type { HarvestFlowChrome, HarvestSheetSharedProps } from './types';
import { radii } from '../../theme';

function formatWeekday(date: string, locale: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' });
  } catch {
    return date;
  }
}

export const HarvestMillSheet: React.FC<
  HarvestSheetSharedProps & {
    prefillSackIds?: string[];
    initial?: HarvestMillWeightEntry | null;
    flow?: HarvestFlowChrome;
    onSave: (input: {
      kg: number;
      fieldIds: string[];
      fieldShares?: HarvestFieldShare[];
      sackIds: string[];
      receiptRef?: string;
      note?: string;
    }) => void;
  }
> = ({ campaign, fields, today, locale, prefillSackIds, initial, flow, onSave, onClose }) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const editing = Boolean(initial);
  const suggested = useMemo(() => suggestMillIncludes(campaign, today), [campaign, today]);
  const allPendingByDay = useMemo(() => {
    const groups = pendingSacksByDay(campaign);
    const editingSackIds = new Set(initial?.sackIds || []);
    const linkedForEdit =
      initial != null
        ? campaign.sacks.filter((s) => editingSackIds.has(s.id) || s.millWeightId === initial.id)
        : [];
    const byDate = new Map(groups.map((g) => [g.date, { ...g, sacks: [...g.sacks] }]));
    for (const sack of linkedForEdit) {
      const existing = byDate.get(sack.date);
      if (existing) {
        if (!existing.sacks.some((s) => s.id === sack.id)) {
          existing.sacks = [...existing.sacks, sack];
        }
      } else {
        byDate.set(sack.date, {
          date: sack.date,
          sacks: [sack],
          sackCount: sack.sacks,
          fieldIds: [sack.fieldId],
        });
      }
    }
    return [...byDate.values()]
      .map((g) => ({
        ...g,
        sacks: g.sacks.filter((s) => s.date <= today),
      }))
      .filter((g) => g.sacks.length > 0)
      .map((g) => ({
        ...g,
        sackCount: g.sacks.reduce((sum, s) => sum + s.sacks, 0),
        fieldIds: [...new Set(g.sacks.map((s) => s.fieldId))],
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [campaign, today, initial]);

  const pendingPool = useMemo(
    () => allPendingByDay.flatMap((g) => g.sacks),
    [allPendingByDay]
  );

  const fieldsFromSackIds = (ids: string[]) => [
    ...new Set(campaign.sacks.filter((s) => ids.includes(s.id)).map((s) => s.fieldId)),
  ];

  const initialSackIds = useMemo(() => {
    if (initial?.sackIds?.length) return initial.sackIds;
    if (prefillSackIds && prefillSackIds.length > 0) {
      const allowed = new Set(pendingPool.map((s) => s.id));
      return prefillSackIds.filter((id) => allowed.has(id));
    }
    return suggested.map((s) => s.id);
  }, [initial, prefillSackIds, pendingPool, suggested]);

  const initialFields = useMemo(() => {
    if (initial?.fieldIds?.length) return initial.fieldIds;
    const fromSacks = fieldsFromSackIds(initialSackIds);
    if (fromSacks.length > 0) return fromSacks;
    if (campaign.fieldOrder.length === 1) return [campaign.fieldOrder[0]];
    return [];
  }, [initial, initialSackIds, campaign]);

  const [kg, setKg] = useState(initial ? String(initial.kg) : '');
  const [fieldIds, setFieldIds] = useState<string[]>(initialFields);
  const [sackIds, setSackIds] = useState<string[]>(initialSackIds);
  const seenSackPrefill = useRef<string[]>([]);
  useEffect(() => {
    if (editing) return;
    const incoming = prefillSackIds ?? [];
    const fresh = incoming.filter((id) => !seenSackPrefill.current.includes(id));
    if (incoming.length > 0) {
      seenSackPrefill.current = [...new Set([...seenSackPrefill.current, ...incoming])];
    }
    if (fresh.length === 0) return;
    setSackIds((prev) => {
      const next = [...new Set([...prev, ...fresh])];
      const nextFields = fieldsFromSackIds(next);
      if (nextFields.length > 0) setFieldIds(nextFields);
      return next;
    });
  }, [prefillSackIds, editing]);
  const [more, setMore] = useState(Boolean(initial?.note || initial?.receiptRef));
  const [adjustShares, setAdjustShares] = useState(false);
  const [manualShares, setManualShares] = useState<HarvestFieldShare[]>(
    initial?.fieldShares || []
  );
  const [receiptRef, setReceiptRef] = useState(initial?.receiptRef || '');
  const [note, setNote] = useState(initial?.note || '');
  const kgNumber = parseHarvestDecimal(kg);
  const canSave = isPositiveAmount(kgNumber);
  const saveHint = !canSave ? t('fields:harvestCampaign.validation.enterWeight') : null;

  type MillPhase = 'fruit' | 'weight' | 'fields' | 'review';
  const millPhases: MillPhase[] = useMemo(() => {
    const next: MillPhase[] = [];
    if (pendingPool.length > 0) next.push('fruit');
    next.push('weight');
    next.push('fields');
    next.push('review');
    return next;
  }, [pendingPool.length]);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    setPhase((current) => Math.min(current, Math.max(millPhases.length - 1, 0)));
  }, [millPhases.length]);
  const phaseKey = millPhases[Math.min(phase, millPhases.length - 1)] ?? 'weight';
  const lastPhase = phase >= millPhases.length - 1;
  const canAdvance = phaseKey === 'weight' ? canSave : true;

  const selectedSacks = useMemo(
    () => pendingPool.filter((s) => sackIds.includes(s.id)),
    [pendingPool, sackIds]
  );

  const includeSummary = useMemo(() => {
    if (selectedSacks.length === 0) return null;
    return {
      count: selectedSacks.reduce((sum, s) => sum + s.sacks, 0),
    };
  }, [selectedSacks]);

  const defaultShares = useMemo(() => {
    if (sackIds.length > 0) return sharesFromSacks(campaign.sacks, sackIds, fieldIds);
    return equalFieldShares(fieldIds);
  }, [campaign.sacks, sackIds, fieldIds]);

  const activeShares = adjustShares && manualShares.length > 0 ? manualShares : defaultShares;

  const toggleSack = (id: string) => {
    setSackIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const nextFields = fieldsFromSackIds(next);
      if (nextFields.length > 0) setFieldIds(nextFields);
      setAdjustShares(false);
      return next;
    });
  };

  const millPayload = () => ({
    kg: kgNumber!,
    fieldIds: fieldIdsFromShares(activeShares).length
      ? fieldIdsFromShares(activeShares)
      : fieldIds,
    fieldShares: activeShares.length > 0 ? activeShares : undefined,
    sackIds,
    receiptRef: more && receiptRef.trim() ? receiptRef.trim() : undefined,
    note: more && note.trim() ? note.trim() : undefined,
  });
  const commitRef = useRef(millPayload);
  commitRef.current = millPayload;
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
      total={millPhases.length}
      title={
        phaseKey === 'fruit'
          ? t('fields:harvestCampaign.steps.millFruit')
          : phaseKey === 'weight'
            ? t('fields:harvestCampaign.steps.millWeight')
            : phaseKey === 'fields'
              ? t('fields:harvestCampaign.steps.millFields')
              : t('fields:harvestCampaign.steps.review')
      }
      hint={
        phaseKey === 'fruit'
          ? t('fields:harvestCampaign.carry.pickSacks')
          : phaseKey === 'weight'
            ? t('fields:harvestCampaign.millKg.prompt')
            : phaseKey === 'fields'
              ? t('fields:harvestCampaign.millKg.whichField')
              : editing
                ? t('fields:harvestCampaign.dayActivity.editMill')
                : t('fields:harvestCampaign.steps.reviewHint')
      }
      nextLabel={
        lastPhase
          ? flow
            ? flow.nextLabel
            : editing
              ? t('fields:harvestCampaign.dayActivity.saveChanges')
              : t('fields:harvestCampaign.millKg.save', { kg: formatKg(kgNumber || 0) })
          : t('fields:harvestCampaign.wizard.next')
      }
      nextDisabled={!canAdvance}
      onNext={() => {
        if (!lastPhase) {
          setPhase((current) => current + 1);
          return;
        }
        onSave(millPayload());
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
      error={phaseKey === 'weight' || lastPhase ? saveHint : null}
    >
      {phaseKey === 'fruit' ? (
        <HarvestCarryPicker
          label={t('fields:harvestCampaign.chain.includesTitle')}
          items={allPendingByDay.flatMap((group) =>
            group.sacks.map((sack) => {
              const field = fields.find((f) => f.id === sack.fieldId);
              return {
                id: sack.id,
                group: formatWeekday(group.date, locale),
                title: t('fields:harvestCampaign.flow.sackCount', { count: sack.sacks }),
                detail: friendlyFieldLabel(field?.name || sack.fieldId),
                colors: [resolveFieldColor(field?.color, sack.fieldId)],
              };
            })
          )}
          selected={sackIds}
          onToggle={toggleSack}
          onSelectAll={
            pendingPool.length > 1
              ? () => {
                  const ids = pendingPool.map((s) => s.id);
                  setSackIds(ids);
                  setFieldIds(fieldsFromSackIds(ids));
                  setAdjustShares(false);
                }
              : undefined
          }
          selectAllLabel={t('fields:harvestCampaign.chain.includesAll')}
          transfer={
            includeSummary
              ? {
                  from: t('fields:harvestCampaign.flow.sackCount', { count: includeSummary.count }),
                  to: t('fields:harvestCampaign.addMenu.title.mill'),
                  color: carryColor(
                    selectedSacks.map((sack) => {
                      const field = fields.find((f) => f.id === sack.fieldId);
                      return resolveFieldColor(field?.color, sack.fieldId);
                    })
                  ),
                }
              : null
          }
          hint={includeSummary ? undefined : t('fields:harvestCampaign.carry.pickSacks')}
        />
      ) : null}
      {phaseKey === 'weight' ? (
        <>
          <HarvestNumberInput
            label={t('fields:harvestCampaign.addMenu.title.mill')}
            value={kg}
            onChange={setKg}
            suffix="kg"
            autoFocus={!flow || Boolean(flow.active)}
          />
          <HarvestQuickChips
            values={[50, 100, 200, 500]}
            suffix="kg"
            onPick={(add) =>
              setKg(String(Math.round(((parseHarvestDecimal(kg) ?? 0) + add) * 100) / 100))
            }
          />
        </>
      ) : null}
      {phaseKey === 'fields' ? (
        <>
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
          {fieldIds.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('fields:harvestCampaign.millKg.split.none')}
            </Text>
          ) : fieldIds.length > 1 ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('fields:harvestCampaign.shared.lotHint')}
            </Text>
          ) : null}
          {fieldIds.length > 1 ? (
            <Pressable
              onPress={() => {
                setManualShares(defaultShares.map((s) => ({ ...s })));
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
        </>
      ) : null}
      {phaseKey === 'review' ? (
        <>
          {includeSummary ? (
            <Text style={{ color: colors.textSecondary }}>
              {t('fields:harvestCampaign.flow.sackCount', { count: includeSummary.count })} ·{' '}
              {formatKg(kgNumber || 0)} kg
            </Text>
          ) : (
            <Text style={{ color: colors.textSecondary }}>{formatKg(kgNumber || 0)} kg</Text>
          )}
          <Pressable onPress={() => setMore((v) => !v)}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              {more ? t('fields:harvestCampaign.less') : t('fields:harvestCampaign.more')}
            </Text>
          </Pressable>
          {more ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textSecondary }}>
                {t('fields:harvestCampaign.millKg.tareHint')}
              </Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {t('fields:harvestCampaign.millKg.receiptRef')}
              </Text>
              <TextInput
                value={receiptRef}
                onChangeText={setReceiptRef}
                autoComplete="off"
                style={[styles.note, { color: colors.textPrimary, borderColor: colors.border, minHeight: 48 }]}
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
  note: { borderWidth: 1, borderRadius: radii.lg, minHeight: 72, padding: 12, textAlignVertical: 'top' },
});
