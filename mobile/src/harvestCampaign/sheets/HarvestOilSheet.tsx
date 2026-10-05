import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatKg } from '../../utils/harvestUtils';
import { resolveFieldColor } from '../../utils/fieldColors';
import FieldColorMark from '../../components/fields/FieldColorMark';
import { equalFieldShares, fieldIdsFromShares, millFieldShares } from '../allocation';
import { millsNeedingOil } from '../chain';
import { HarvestCarryPicker } from '../components/HarvestCarryPicker';
import { OilTinSplit } from '../components/OilTinSplit';
import { HarvestFormPager, HarvestQuickChips } from '../components/HarvestFormPager';
import {
  formatHarvestOilAmountLabel,
  OIL_TIN_SIZES,
  OLIVE_OIL_KG_PER_LITRE,
  readOilTinCounts,
  settleOil,
} from '../utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestFieldShare, HarvestOilEntry } from '../types';
import type { HarvestFlowChrome, HarvestSheetSharedProps } from './types';
import { useAuth } from '../../context/AuthContext';
import { oilStockService, type OilCellarCandidate } from '../../services/oilStockService';
import { radii } from '../../theme';

const round1 = (value: number) => Math.round(value * 10) / 10;

const toLitres = (amount: number, unit: 'kg' | 'litres') =>
  unit === 'litres' ? amount : amount / OLIVE_OIL_KG_PER_LITRE;

const countsFromEntry = (entry: HarvestOilEntry | null | undefined): Record<number, number> => {
  const counts: Record<number, number> = {};
  for (const line of entry?.tinLines || []) {
    if (line.count > 0) counts[line.sizeLitres] = line.count;
  }
  const legacy = readOilTinCounts(entry ?? {});
  if (!counts[16] && legacy.tin16 > 0) counts[16] = legacy.tin16;
  if (!counts[17] && legacy.tin17 > 0) counts[17] = legacy.tin17;
  return counts;
};

const tinLitresOf = (counts: Record<number, number>) =>
  OIL_TIN_SIZES.reduce((sum, size) => sum + size * Math.max(0, counts[size] || 0), 0);

/**
 * Oil in three short screens: litres + mill %, then χύμα or tins, then cellar
 * only when the grove admin has someone else to choose.
 */
export const HarvestOilSheet: React.FC<
  HarvestSheetSharedProps & {
    prefillMillIds?: string[];
    initial?: HarvestOilEntry | null;
    flow?: HarvestFlowChrome;
    onSave: (input: {
      amount: number;
      unit: 'litres';
      millKept?: number;
      tin16Count?: number;
      tin17Count?: number;
      tinSizeLitres?: 16 | 17;
      tinCount?: number;
      tinLines?: { sizeLitres: number; count: number }[];
      millWeightIds: string[];
      fieldIds: string[];
      fieldShares?: HarvestFieldShare[];
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

  const initialCounts = countsFromEntry(initial);
  const [amount, setAmount] = useState(() => {
    if (!initial) return '';
    return String(round1(toLitres(initial.amount, initial.unit)));
  });
  const [millKept, setMillKept] = useState(() => {
    if (!initial?.amount) return '0';
    return String(round1(((initial.millKept ?? 0) / initial.amount) * 100));
  });
  const [millMode, setMillMode] = useState<'amount' | 'percent'>('percent');
  const [pickFruit, setPickFruit] = useState(
    () => defaultMillIds.length === 0 && campaign.millWeights.length > 0
  );
  const [storageMode, setStorageMode] = useState<'all' | 'tins'>(
    tinLitresOf(initialCounts) > 0 ? 'tins' : 'all'
  );
  const [tinCounts, setTinCounts] = useState<Record<number, number>>(initialCounts);
  const [fieldIds] = useState<string[]>(() => {
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
  const [cellarOwnerUserId, setCellarOwnerUserId] = useState(initial?.cellarOwnerUserId || '');
  const [cellarCandidates, setCellarCandidates] = useState<OilCellarCandidate[]>([]);
  const [cellarsReady, setCellarsReady] = useState(false);
  const [page, setPage] = useState(0);

  const litres = parseHarvestDecimal(amount);
  const millRaw = parseHarvestDecimal(millKept) ?? 0;
  const millBase =
    litres != null && litres > 0
      ? settleOil({
          total: litres,
          unit: 'litres',
          millKept: millRaw,
          millMode,
          tin16Count: 0,
          tin17Count: 0,
          splitTins: false,
        })
      : null;
  const packedCounts = storageMode === 'tins' ? tinCounts : {};
  const tinLitres = tinLitresOf(packedCounts);
  const farmerLitres = millBase?.farmerAmount ?? 0;
  const tinOver = storageMode === 'tins' && tinLitres > farmerLitres + 0.05;
  const millOver = Boolean(millBase?.millOver);
  const tinCount = OIL_TIN_SIZES.reduce((sum, size) => sum + (packedCounts[size] || 0), 0);
  const packBlocked = storageMode === 'tins' && (tinCount <= 0 || tinOver);

  const selectedMills = campaign.millWeights.filter((row) => millWeightIds.includes(row.id));
  const relatedOliveKg = selectedMills.reduce((sum, row) => sum + row.kg, 0);
  const millChipOrder = useMemo(() => {
    const uncoveredIds = new Set(uncovered.map((m) => m.id));
    const rest = campaign.millWeights
      .filter((m) => !uncoveredIds.has(m.id))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    return [...uncovered, ...rest];
  }, [campaign.millWeights, uncovered]);
  const fruitColors = useMemo(
    () =>
      [
        ...new Set(
          selectedMills.flatMap((row) =>
            row.fieldIds.map((id) => {
              const field = fields.find((f) => f.id === id);
              return resolveFieldColor(field?.color, id);
            })
          )
        ),
      ].slice(0, 3),
    [selectedMills, fields]
  );
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
  const inferredLabels = fieldIdsFromShares(inferredShares)
    .map((id) => friendlyFieldLabel(fields.find((f) => f.id === id)?.name || id))
    .filter(Boolean);

  const resolvedFieldIds = useMemo(() => {
    const fromShares = fieldIdsFromShares(inferredShares);
    if (fromShares.length) return fromShares;
    return fieldIds;
  }, [inferredShares, fieldIds]);

  useEffect(() => {
    let cancelled = false;
    setCellarsReady(false);
    void (async () => {
      const apply = (rows: OilCellarCandidate[]) => {
        if (cancelled) return;
        setCellarCandidates(rows);
        const admin = rows.find((row) => row.role === 'admin');
        const hasOthers = admin ? rows.some((row) => row.userId !== admin.userId) : false;
        const show = Boolean(admin?.isYou && hasOthers);
        const automatic = admin?.userId || (rows.length === 1 ? rows[0].userId : '');
        setCellarOwnerUserId((prev) => {
          if (!show) return automatic;
          if (
            initial?.cellarOwnerUserId &&
            rows.some((row) => row.userId === initial.cellarOwnerUserId)
          ) {
            return initial.cellarOwnerUserId;
          }
          if (prev && rows.some((row) => row.userId === prev)) return prev;
          return automatic;
        });
        setCellarsReady(true);
      };
      if (resolvedFieldIds.length === 0) {
        const selfId = user?.id || '';
        apply(selfId ? [{ userId: selfId, displayName: '', role: 'admin', isYou: true }] : []);
        return;
      }
      try {
        const rows = await oilStockService.listCellarCandidates(resolvedFieldIds);
        if (cancelled) return;
        apply(rows);
      } catch {
        if (!cancelled) apply([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedFieldIds.join('|'), user?.id, initial?.cellarOwnerUserId]);

  const admin = cellarCandidates.find((row) => row.role === 'admin');
  const showCellarScreen = Boolean(
    cellarsReady && admin?.isYou && cellarCandidates.some((row) => row.userId !== admin.userId)
  );
  const pages = showCellarScreen ? (['amount', 'pack', 'cellar'] as const) : (['amount', 'pack'] as const);
  const pageIndex = Math.min(page, pages.length - 1);
  const step = pages[pageIndex];
  const isLastPage = cellarsReady && pageIndex === pages.length - 1;

  const saveHint = millOver
    ? t('fields:harvestCampaign.oil.overMill')
    : tinOver
      ? t('fields:harvestCampaign.oil.overTins', {
          amount: formatHarvestOilAmountLabel(round1(tinLitres - farmerLitres), 'litres', locale),
        })
      : packBlocked
        ? t('fields:harvestCampaign.oil.tinCountHint')
        : null;

  const stepBlocked =
    step === 'amount'
      ? !isPositiveAmount(litres) || millOver
      : step === 'pack'
        ? packBlocked || !cellarsReady
        : false;

  const setTinCount = (size: number, count: number) => {
    setTinCounts((prev) => ({ ...prev, [size]: Math.max(0, count) }));
  };

  const toggleMill = (id: string) => {
    setMillWeightIds((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]
    );
  };

  const switchMillMode = (next: 'amount' | 'percent') => {
    if (next === millMode) return;
    const current = parseHarvestDecimal(millKept) ?? 0;
    if (litres != null && litres > 0) {
      if (next === 'percent') {
        setMillKept(String(round1((Math.min(current, litres) / litres) * 100)));
      } else {
        setMillKept(String(round1((litres * Math.min(current, 100)) / 100)));
      }
    }
    setMillMode(next);
  };

  const oilPayload = () => {
    const shares = inferredShares;
    const lines =
      storageMode === 'tins'
        ? OIL_TIN_SIZES.flatMap((size) => {
            const count = tinCounts[size] || 0;
            return count > 0 ? [{ sizeLitres: size, count }] : [];
          })
        : [];
    const tin16 = lines.find((line) => line.sizeLitres === 16)?.count;
    const tin17 = lines.find((line) => line.sizeLitres === 17)?.count;
    const only16 = tin16 && !tin17;
    const only17 = tin17 && !tin16;
    const owner = showCellarScreen ? cellarOwnerUserId || admin?.userId : admin?.userId;
    return {
      amount: litres!,
      unit: 'litres' as const,
      millKept: millBase?.millAmount ?? 0,
      tin16Count: tin16,
      tin17Count: tin17,
      tinSizeLitres: only16 ? (16 as const) : only17 ? (17 as const) : undefined,
      tinCount: only16 ? tin16 : only17 ? tin17 : undefined,
      tinLines: lines.length > 0 ? lines : undefined,
      millWeightIds,
      fieldIds: fieldIdsFromShares(shares).length ? fieldIdsFromShares(shares) : fieldIds,
      fieldShares: shares.length > 0 ? shares : undefined,
      cellarOwnerUserId: owner || undefined,
    };
  };
  const commitRef = useRef(oilPayload);
  commitRef.current = oilPayload;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const canSave = isPositiveAmount(litres) && !millOver && !packBlocked && cellarsReady;

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
        amount: formatKg(litres || 0),
        unit: t('fields:harvestCampaign.oil.litres'),
      });

  const fruitLabel =
    relatedOliveKg > 0
      ? t('fields:harvestCampaign.flow.fruitLine', { kg: Math.round(relatedOliveKg) })
      : t('fields:harvestCampaign.carry.pickFruit');
  const fieldLabel = inferredLabels.join(' + ');

  return (
    <HarvestFormPager
      current={pageIndex}
      total={pages.length}
      accent="oil"
      scrollEnabled={pickFruit || (step === 'pack' && storageMode === 'tins')}
      title={
        step === 'amount'
          ? editing
            ? t('fields:harvestCampaign.dayActivity.editOil')
            : t('fields:harvestCampaign.oil.prompt')
          : step === 'pack'
            ? t('fields:harvestCampaign.oil.storedTitle')
            : t('fields:harvestCampaign.oil.cellarTitle')
      }
      nextLabel={isLastPage ? saveLabel : t('common:next')}
      nextDisabled={isLastPage ? !canSave : stepBlocked}
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
      error={step === 'amount' ? (millOver ? saveHint : null) : step === 'pack' ? saveHint : null}
    >
      {step === 'amount' ? (
        <>
          <AmountField
            label={t('fields:harvestCampaign.oil.litres')}
            value={amount}
            onChange={setAmount}
            suffix="L"
            autoFocus={!flow || Boolean(flow.active)}
          />
          <HarvestQuickChips
            values={[10, 20, 50, 100]}
            suffix="L"
            onPick={(add) => setAmount(String(round1((parseHarvestDecimal(amount) ?? 0) + add)))}
          />
          <View style={styles.millBlock}>
            <View style={styles.millHead}>
              <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                {t('fields:harvestCampaign.oil.part.mill')}
              </Text>
              <View style={styles.modeRow}>
                {(
                  [
                    ['percent', '%'],
                    ['amount', 'L'],
                  ] as const
                ).map(([mode, label]) => {
                  const on = millMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => switchMillMode(mode)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      style={[
                        styles.modeChip,
                        {
                          backgroundColor: on ? colors.primary : colors.surfaceElevated,
                          borderColor: on ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: on ? colors.onOlive : colors.textPrimary,
                          fontWeight: '800',
                          fontSize: 13,
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <AmountField
              label=""
              value={millKept}
              onChange={setMillKept}
              suffix={millMode === 'percent' ? '%' : 'L'}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {t('fields:harvestCampaign.oil.millHint')}
            </Text>
          </View>

          {millChipOrder.length > 0 && !pickFruit ? (
            <Pressable
              onPress={() => setPickFruit(true)}
              accessibilityRole="button"
              style={[
                styles.fruitCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
            >
              <View style={styles.fruitColors}>
                {fruitColors.length > 0 ? (
                  fruitColors.map((color, index) => (
                    <FieldColorMark
                      key={`${color}-${index}`}
                      color={color}
                      size={14}
                      style={index > 0 ? { marginLeft: -4 } : undefined}
                    />
                  ))
                ) : (
                  <FieldColorMark hollow size={14} />
                )}
              </View>
              <View style={styles.fruitCopy}>
                <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }}>
                  {fruitLabel}
                </Text>
                {fieldLabel ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                    {fieldLabel}
                  </Text>
                ) : null}
              </View>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                {t('fields:harvestCampaign.millKg.changeSelection')}
              </Text>
            </Pressable>
          ) : null}

          {millChipOrder.length > 0 && pickFruit ? (
            <HarvestCarryPicker
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
              hint={relatedOliveKg > 0 ? undefined : t('fields:harvestCampaign.carry.pickFruit')}
              trailing={
                <Pressable onPress={() => setPickFruit(false)} hitSlop={8}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>
                    {t('fields:harvestCampaign.less')}
                  </Text>
                </Pressable>
              }
            />
          ) : null}
        </>
      ) : null}

      {step === 'pack' ? (
        <OilTinSplit
          totalLitres={farmerLitres}
          mode={storageMode}
          onModeChange={setStorageMode}
          counts={tinCounts}
          onChangeCount={setTinCount}
          locale={locale}
        />
      ) : null}

      {step === 'cellar' ? (
        <View style={styles.cellars}>
          {cellarCandidates.map((candidate) => {
            const on = candidate.userId === (cellarOwnerUserId || admin?.userId);
            return (
              <Pressable
                key={candidate.userId}
                onPress={() => setCellarOwnerUserId(candidate.userId)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[
                  styles.cellarChip,
                  {
                    backgroundColor: on ? colors.primary : colors.surfaceElevated,
                    borderColor: on ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: on ? colors.onOlive : colors.textPrimary, fontWeight: '700' }}>
                  {candidate.isYou
                    ? t('fields:harvestCampaign.oil.cellarYou')
                    : candidate.displayName || candidate.userId}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </HarvestFormPager>
  );
};

const AmountField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
  autoFocus?: boolean;
}> = ({ label, value, onChange, suffix, autoFocus }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.amount}>
      {label ? (
        <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>{label}</Text>
      ) : null}
      <View style={[styles.amountRow, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.textTertiary}
          autoFocus={autoFocus}
          accessibilityLabel={label || suffix}
          style={[styles.amountInput, { color: colors.textPrimary }]}
        />
        <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>{suffix}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  amount: { gap: 4 },
  amountLabel: { fontSize: 12, fontWeight: '700' },
  amountRow: {
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '800', paddingVertical: 6 },
  millBlock: { gap: 8 },
  millHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeRow: { flexDirection: 'row', gap: 6 },
  modeChip: {
    minWidth: 40,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fruitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fruitColors: { flexDirection: 'row', alignItems: 'center' },
  fruitCopy: { flex: 1, gap: 2 },
  cellars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cellarChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
