import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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
import { HarvestSegmentedControl } from '../components/HarvestSegmentedControl';
import { HarvestFormPager, HarvestHint, HarvestMoreToggle, HarvestQuickChips, HarvestTextField } from '../components/HarvestFormPager';
import { HarvestOilPackSection } from '../components/HarvestOilPackSection';
import {
  extractionYieldPercent,
  formatHarvestOilAmountLabel,
  formatHarvestYieldPercent,
  oilKgFromAmount,
  OLIVE_OIL_KG_PER_LITRE,
  plausibleOilYield,
  readOilTinCounts,
  settleOil,
  type HarvestOilUnit,
} from '../utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestFieldShare, HarvestOilEntry } from '../types';
import type { HarvestFlowChrome, HarvestSheetSharedProps } from './types';
import { useAuth } from '../../context/AuthContext';
import { oilStockService, type OilCellarCandidate } from '../../services/oilStockService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lastCellarKey = (fieldId: string) => `oleachron.oilCellar.last.${fieldId}`;

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
      cellarOwnerUserId?: string;
    }) => void;
  }
> = ({ campaign, fields, locale, prefillMillIds, initial, flow, onSave, onClose }) => {
  const { t } = useTranslation(['fields', 'common']);
  const { colors } = useTheme();
  const { user } = useAuth();
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
  const [useTin16, setUseTin16] = useState(initialTins.tin16 > 0);
  const [useTin17, setUseTin17] = useState(initialTins.tin17 > 0);
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
  const [cellarOwnerUserId, setCellarOwnerUserId] = useState(initial?.cellarOwnerUserId || '');
  const [cellarCandidates, setCellarCandidates] = useState<OilCellarCandidate[]>([]);
  const [page, setPage] = useState(0);
  const [splitCellars, setSplitCellars] = useState(Boolean(initial?.cellarAllocations?.length));
  const [cellarLitres, setCellarLitres] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initial?.cellarAllocations || []).map((a) => [a.cellarOwnerUserId, String(a.litres)])
    )
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
          tin16Count: storageMode === 'tins' && useTin16 ? tin16 : 0,
          tin17Count: storageMode === 'tins' && useTin17 ? tin17 : 0,
          splitTins: storageMode === 'tins',
        })
      : null;
  const splitBlocked = Boolean(settlement && (settlement.millOver || settlement.overAmount > 0));
  const farmerLitres = settlement
    ? Math.round(
        (unit === 'litres'
          ? settlement.farmerAmount
          : settlement.farmerAmount / OLIVE_OIL_KG_PER_LITRE) * 10
      ) / 10
    : 0;
  const splitEntries = cellarCandidates.map((c) => ({
    userId: c.userId,
    litres: Math.max(0, parseHarvestDecimal(cellarLitres[c.userId] ?? '') ?? 0),
  }));
  const splitTaken = splitEntries.filter((e) => e.litres > 0.05);
  const splitRemaining =
    Math.round((farmerLitres - splitTaken.reduce((sum, e) => sum + e.litres, 0)) * 10) / 10;
  const splitValid = !splitCellars || (splitTaken.length > 0 && Math.abs(splitRemaining) <= 0.05);
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

  const resolvedFieldIds = useMemo(() => {
    const fromShares = fieldIdsFromShares(activeShares);
    if (fromShares.length) return fromShares;
    if (showFieldPicker) return fieldIds;
    return fieldIdsFromShares(inferredShares);
  }, [activeShares, showFieldPicker, fieldIds, inferredShares]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (resolvedFieldIds.length === 0) {
        const selfId = user?.id || '';
        if (!cancelled && selfId) {
          setCellarCandidates([{ userId: selfId, displayName: '', role: 'admin', isYou: true }]);
          if (!cellarOwnerUserId) setCellarOwnerUserId(selfId);
        }
        return;
      }
      try {
        const rows = await oilStockService.listCellarCandidates(resolvedFieldIds);
        if (cancelled) return;
        setCellarCandidates(rows);
        let last: string | null = null;
        for (const id of resolvedFieldIds) {
          last = await AsyncStorage.getItem(lastCellarKey(id));
          if (last) break;
        }
        const preferred =
          (initial?.cellarOwnerUserId && rows.some((r) => r.userId === initial.cellarOwnerUserId)
            ? initial.cellarOwnerUserId
            : null) ||
          (last && rows.some((r) => r.userId === last) ? last : null) ||
          rows.find((r) => r.role === 'admin')?.userId ||
          rows.find((r) => r.isYou)?.userId ||
          rows[0]?.userId ||
          '';
        setCellarOwnerUserId((prev) =>
          prev && rows.some((r) => r.userId === prev) ? prev : preferred
        );
      } catch {
        if (!cancelled) setCellarCandidates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedFieldIds.join('|'), user?.id, initial?.cellarOwnerUserId]);

  const showCellarPicker = cellarCandidates.length > 1;
  const selectedCellar = cellarCandidates.find((c) => c.userId === cellarOwnerUserId);

  // Amount → mill share → pack (tins) → optional cellar.
  const pages = useMemo<Array<'amount' | 'settle' | 'pack' | 'cellar'>>(
    () => (showCellarPicker ? ['amount', 'settle', 'pack', 'cellar'] : ['amount', 'settle', 'pack']),
    [showCellarPicker]
  );
  const pageIndex = Math.min(page, pages.length - 1);
  const step = pages[pageIndex];
  const isLastPage = pageIndex === pages.length - 1;
  const packBlocked =
    storageMode === 'tins' &&
    ((!useTin16 && !useTin17) ||
      (useTin16 ? tin16 : 0) + (useTin17 ? tin17 : 0) <= 0 ||
      Boolean(settlement && settlement.overAmount > 0));

  const canSave = isPositiveAmount(value) && !splitBlocked && splitValid && !packBlocked;
  const saveHint = !isPositiveAmount(value)
    ? t('fields:harvestCampaign.validation.enterAmount')
    : !splitValid
      ? t('fields:harvestCampaign.oil.splitOver', { amount: Math.abs(splitRemaining) })
      : settlement?.millOver
        ? t('fields:harvestCampaign.oil.overMill')
        : settlement && settlement.overAmount > 0
          ? t('fields:harvestCampaign.oil.overTins', {
              amount: formatHarvestOilAmountLabel(settlement.overAmount, unit, locale),
            })
          : packBlocked && storageMode === 'tins' && !useTin16 && !useTin17
            ? t('fields:harvestCampaign.oil.tinTypeHint')
            : packBlocked
              ? t('fields:harvestCampaign.oil.tinCountHint')
              : null;

  const pageTitle =
    step === 'amount'
      ? editing
        ? t('fields:harvestCampaign.dayActivity.editOil')
        : t('fields:harvestCampaign.oil.prompt')
      : step === 'settle'
        ? t('fields:harvestCampaign.oil.millTitle')
        : step === 'pack'
          ? t('fields:harvestCampaign.oil.storedTitle')
          : t('fields:harvestCampaign.oil.cellarTitle');

  const pageBlocked =
    step === 'amount'
      ? !isPositiveAmount(value)
      : step === 'settle'
        ? Boolean(settlement?.millOver)
        : step === 'pack'
          ? packBlocked
          : !splitValid;

  const pageHint =
    step === 'amount' && !isPositiveAmount(value)
      ? t('fields:harvestCampaign.validation.enterAmount')
      : step === 'settle' && settlement?.millOver
        ? t('fields:harvestCampaign.oil.overMill')
        : step === 'pack' && storageMode === 'tins' && !useTin16 && !useTin17
          ? t('fields:harvestCampaign.oil.tinTypeHint')
          : step === 'pack' &&
              storageMode === 'tins' &&
              (useTin16 || useTin17) &&
              (useTin16 ? tin16 : 0) + (useTin17 ? tin17 : 0) <= 0
            ? t('fields:harvestCampaign.oil.tinCountHint')
            : step === 'pack' && settlement && settlement.overAmount > 0
              ? t('fields:harvestCampaign.oil.overTins', {
                  amount: formatHarvestOilAmountLabel(settlement.overAmount, unit, locale),
                })
              : step === 'cellar' && !splitValid
                ? t('fields:harvestCampaign.oil.splitOver', { amount: Math.abs(splitRemaining) })
                : null;

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
    const effectiveTin16 = useTins && useTin16 ? tin16 : 0;
    const effectiveTin17 = useTins && useTin17 ? tin17 : 0;
    const only16 = useTins && effectiveTin16 > 0 && effectiveTin17 === 0;
    const only17 = useTins && effectiveTin17 > 0 && effectiveTin16 === 0;
    const tinSizeLitres: 16 | 17 | undefined = only16 ? 16 : only17 ? 17 : undefined;
    const bulkLitres =
      unit === 'litres' && settlement && settlement.bulkAmount > 0
        ? settlement.bulkAmount
        : undefined;
    const allocations = splitCellars
      ? splitTaken.map((e) => ({ cellarOwnerUserId: e.userId, litres: e.litres }))
      : undefined;
    const primaryCellar = allocations?.length
      ? [...allocations].sort((a, b) => b.litres - a.litres)[0].cellarOwnerUserId
      : cellarOwnerUserId;
    const primaryCandidate = cellarCandidates.find((c) => c.userId === primaryCellar);
    return {
      amount: value!,
      unit,
      millKept: settlement?.millAmount ?? 0,
      tin16Count: effectiveTin16 > 0 ? effectiveTin16 : undefined,
      tin17Count: effectiveTin17 > 0 ? effectiveTin17 : undefined,
      tinSizeLitres,
      tinCount: only16 ? effectiveTin16 : only17 ? effectiveTin17 : undefined,
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
      cellarOwnerUserId: primaryCellar || undefined,
      cellarOwnerDisplayName: primaryCandidate?.displayName,
      cellarIsYou:
        primaryCandidate?.isYou ||
        (!primaryCandidate && cellarCandidates.length <= 1) ||
        primaryCellar === user?.id,
      cellarAllocations: allocations,
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

  const saveLabel = editing
    ? t('fields:harvestCampaign.dayActivity.saveChanges')
    : t('fields:harvestCampaign.oil.save', {
        amount: formatKg(value || 0),
        unit: unit === 'litres' ? t('fields:harvestCampaign.oil.litres') : 'kg',
      });

  return (
    <HarvestFormPager
      current={pageIndex}
      total={pages.length}
      accent="oil"
      title={pageTitle}
      nextLabel={isLastPage ? saveLabel : t('common:next')}
      nextDisabled={isLastPage ? !canSave : pageBlocked}
      onNext={() => {
        if (!isLastPage) {
          setPage(pageIndex + 1);
          return;
        }
        onSave(oilPayload());
      }}
      backLabel={pageIndex > 0 ? t('common:back') : flow?.backLabel}
      onBack={pageIndex > 0 ? () => setPage(pageIndex - 1) : flow?.onBack}
      cancelLabel={t('common:cancel')}
      onCancel={onClose}
      busy={flow?.busy}
      error={isLastPage ? (!canSave ? saveHint : null) : pageHint}
    >
      {step === 'amount' ? (
        <>
          {millChipOrder.length > 0 ? (
            <HarvestCarryPicker
              hideHeading
              compact
              moreLabel={t('fields:harvestCampaign.oil.moreLots', {
                count: Math.max(millChipOrder.length - millWeightIds.length, 1),
              })}
              lessLabel={t('fields:harvestCampaign.less')}
              label={t('fields:harvestCampaign.oil.relatedKg')}
              items={millChipOrder.map((row) => {
                const fieldNames = row.fieldIds
                  .map((id) => {
                    const name = fields.find((f) => f.id === id)?.name;
                    return name ? friendlyFieldLabel(name) : '';
                  })
                  .filter((name) => name && name !== '—');
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
      {step === 'amount' ? (
        <>
          <HarvestSegmentedControl
            value={unit}
            label={t('fields:harvestCampaign.oil.unitLabel')}
            ariaLabel={t('fields:harvestCampaign.oil.prompt')}
            onChange={setUnit}
            options={[
              {
                value: 'kg',
                label: t('fields:harvestCampaign.oil.kg'),
                detail: t('fields:harvestCampaign.oil.kgDetail'),
              },
              {
                value: 'litres',
                label: t('fields:harvestCampaign.oil.litres'),
                detail: t('fields:harvestCampaign.oil.litresDetail'),
              },
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
      {step === 'settle' ? (
        <>
          <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 }}>
            {t('fields:harvestCampaign.oil.millTitle')}
          </Text>
          <HarvestSegmentedControl
            value={millMode}
            label={t('fields:harvestCampaign.oil.millModeLabel')}
            ariaLabel={t('fields:harvestCampaign.oil.millModeLabel')}
            onChange={setMillMode}
            options={[
              {
                value: 'amount',
                label: t('fields:harvestCampaign.oil.millAmount'),
                detail: t('fields:harvestCampaign.oil.millAmountDetail'),
              },
              {
                value: 'percent',
                label: t('fields:harvestCampaign.oil.millPercent'),
                detail: t('fields:harvestCampaign.oil.millPercentDetail'),
              },
            ]}
          />
          <HarvestNumberInput
            label={
              millMode === 'percent'
                ? t('fields:harvestCampaign.oil.millPercent')
                : t('fields:harvestCampaign.oil.millAmount')
            }
            value={millKept}
            onChange={setMillKept}
            suffix={millMode === 'percent' ? '%' : unit === 'kg' ? 'kg' : 'L'}
            min={0}
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
      {step === 'pack' ? (
        <HarvestOilPackSection
          storageMode={storageMode}
          onStorageMode={(mode) => {
            setStorageMode(mode);
            if (mode === 'all') {
              setUseTin16(false);
              setUseTin17(false);
              setTin16(0);
              setTin17(0);
            }
          }}
          useTin16={useTin16}
          useTin17={useTin17}
          onToggleTin16={() => {
            setUseTin16((on) => {
              if (on) setTin16(0);
              return !on;
            });
          }}
          onToggleTin17={() => {
            setUseTin17((on) => {
              if (on) setTin17(0);
              return !on;
            });
          }}
          tin16={tin16}
          tin17={tin17}
          onTin16={setTin16}
          onTin17={setTin17}
          settlement={settlement}
          unit={unit}
          locale={locale}
        />
      ) : null}
      {(step === 'cellar' || (!showCellarPicker && isLastPage)) && isPositiveAmount(value) ? (
        <View style={{ gap: 8 }}>
          {showCellarPicker ? (
            <>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {t('fields:harvestCampaign.oil.cellarTitle')}
              </Text>
              {splitCellars ? (
                <View style={{ gap: 8 }}>
                  {cellarCandidates.map((c) => (
                    <HarvestNumberInput
                      key={c.userId}
                      label={
                        c.isYou
                          ? t('fields:harvestCampaign.oil.cellarYou')
                          : c.displayName || c.userId
                      }
                      value={cellarLitres[c.userId] ?? ''}
                      onChange={(raw) =>
                        setCellarLitres((prev) => ({ ...prev, [c.userId]: raw }))
                      }
                      suffix="L"
                      min={0}
                    />
                  ))}
                  <Text style={{ color: splitValid ? colors.textSecondary : colors.error }}>
                    {splitRemaining < -0.05
                      ? t('fields:harvestCampaign.oil.splitOver', {
                          amount: Math.abs(splitRemaining),
                        })
                      : t('fields:harvestCampaign.oil.splitLeft', {
                          amount: Math.max(0, splitRemaining),
                          total: farmerLitres,
                        })}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {cellarCandidates.map((c) => {
                    const on = c.userId === cellarOwnerUserId;
                    return (
                      <Pressable
                        key={c.userId}
                        onPress={() => setCellarOwnerUserId(c.userId)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={({ pressed }) => ({
                          minHeight: 44,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          borderWidth: on ? 2 : 1.5,
                          borderColor: on ? colors.primaryDark : colors.border,
                          backgroundColor: on ? colors.primary : colors.surfaceElevated,
                          opacity: pressed && !on ? 0.9 : 1,
                        })}
                      >
                        <Text
                          style={{
                            color: on ? colors.onOlive : colors.textPrimary,
                            fontWeight: '700',
                          }}
                        >
                          {c.isYou
                            ? t('fields:harvestCampaign.oil.cellarYou')
                            : c.displayName || c.userId}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <Pressable
                onPress={() => {
                  if (splitCellars) {
                    setSplitCellars(false);
                    return;
                  }
                  setCellarLitres(
                    Object.fromEntries(
                      cellarCandidates.map((c) => [
                        c.userId,
                        c.userId === cellarOwnerUserId ? String(farmerLitres) : '',
                      ])
                    )
                  );
                  setSplitCellars(true);
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {splitCellars
                    ? t('fields:harvestCampaign.oil.splitOff')
                    : t('fields:harvestCampaign.oil.splitOn')}
                </Text>
              </Pressable>
            </>
          ) : selectedCellar ? (
            <Text style={{ color: colors.textSecondary }}>
              {selectedCellar.isYou
                ? t('fields:harvestCampaign.oil.cellarYou')
                : t('fields:harvestCampaign.oil.cellarOf', {
                    name: selectedCellar.displayName || selectedCellar.userId,
                  })}
            </Text>
          ) : null}
        </View>
      ) : null}
      {isLastPage ? (
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
          <HarvestMoreToggle
            open={more}
            onPress={() => setMore((v) => !v)}
            openLabel={t('fields:harvestCampaign.less')}
            closedLabel={t('fields:harvestCampaign.more')}
          />
          {more ? (
            <View style={{ gap: 8 }}>
              <HarvestNumberInput
                label={t('fields:harvestCampaign.oil.acidity')}
                value={acidity}
                onChange={setAcidity}
              />
              <HarvestTextField
                label={t('fields:harvestCampaign.noteOptional')}
                value={note}
                onChange={setNote}
                multiline
              />
            </View>
          ) : null}
        </>
      ) : null}
    </HarvestFormPager>
  );
};
