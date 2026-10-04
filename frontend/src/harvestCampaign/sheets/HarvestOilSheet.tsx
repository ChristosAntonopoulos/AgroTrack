import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { HarvestCarryPicker, carryColor } from '../components/HarvestCarryPicker';
import {
  equalFieldShares,
  fieldIdsFromShares,
  millFieldShares,
  oilFieldShares,
} from '../allocation';
import { millsNeedingOil } from '../chain';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestNumberInput, HarvestNumberStepper } from '../components/HarvestNumberInput';
import { HarvestSegmentedControl } from '../components/HarvestSegmentedControl';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import {
  extractionYieldPercent,
  formatHarvestOilAmountLabel,
  formatHarvestYieldPercent,
  oilKgFromAmount,
  readOilTinCounts,
  settleOil,
  OLIVE_OIL_KG_PER_LITRE,
  type HarvestOilUnit,
  type OilSplitPartKey,
} from '../utils/harvestCalculations';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestFieldShare, HarvestOilEntry } from '../types';
import type { HarvestFlowChrome, HarvestSheetSharedProps } from './types';
import { useAuth } from '../../context/AuthContext';
import { oilStockService, type OilCellarCandidate } from '../../services/oilStockService';
import { readLastCellarOwner, writeLastCellarOwner } from '../../myOil/cellarLastChoice';

const round1 = (n: number) => Math.round(n * 10) / 10;

const OilStep: React.FC<{
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ n, title, hint, children }) => (
  <li className="hc-oil-step">
    <div className="hc-oil-step-rail" aria-hidden>
      <span className="hc-oil-step-mark">{n}</span>
    </div>
    <div className="hc-oil-step-body">
      <h3 className="hc-oil-step-title">{title}</h3>
      {hint ? <p className="capture-hint hc-oil-step-hint">{hint}</p> : null}
      {children}
    </div>
  </li>
);

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
      cellarOwnerDisplayName?: string;
      cellarIsYou?: boolean;
      cellarAllocations?: { cellarOwnerUserId: string; litres: number }[];
    }) => void;
  }
> = ({ campaign, fields, locale, prefillMillIds, initial, flow, onSave, onClose }) => {
  const { t } = useTranslation('fields');
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
  const [tin16, setTin16] = useState(initialTins.tin16);
  const [tin17, setTin17] = useState(initialTins.tin17);
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
  const [fieldIds, setFieldIds] = useState<string[]>(() => {
    if (initial?.fieldIds?.length) return initial.fieldIds;
    if (campaign.fieldOrder.length === 1) return [campaign.fieldOrder[0]];
    return [];
  });
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
          tin16Count: tin16,
          tin17Count: tin17,
          splitTins: storageMode === 'tins',
        })
      : null;
  const splitBlocked = Boolean(settlement && (settlement.millOver || settlement.overAmount > 0));
  const unitSuffix = unit === 'kg' ? 'kg' : 'L';

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
  const amountLabel = formatGroveMassKg(value || 0, locale);

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
    const load = async () => {
      if (resolvedFieldIds.length === 0) {
        const selfId = user?.userId || '';
        if (!cancelled) {
          setCellarCandidates(
            selfId
              ? [{ userId: selfId, displayName: '', role: 'admin', isYou: true }]
              : []
          );
          if (!cellarOwnerUserId && selfId) setCellarOwnerUserId(selfId);
        }
        return;
      }
      try {
        const rows = await oilStockService.listCellarCandidates(resolvedFieldIds);
        if (cancelled) return;
        setCellarCandidates(rows);
        const last = resolvedFieldIds.map(readLastCellarOwner).find(Boolean) || null;
        // Admin-first: prefer the grove admin over last choice / "you" on new entries.
        const preferred =
          (initial?.cellarOwnerUserId && rows.some((r) => r.userId === initial.cellarOwnerUserId)
            ? initial.cellarOwnerUserId
            : null) ||
          rows.find((r) => r.role === 'admin')?.userId ||
          (last && rows.some((r) => r.userId === last) ? last : null) ||
          rows.find((r) => r.isYou)?.userId ||
          rows[0]?.userId ||
          '';
        setCellarOwnerUserId((prev) =>
          prev && rows.some((r) => r.userId === prev) ? prev : preferred
        );
      } catch {
        if (!cancelled) setCellarCandidates([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-fetch when grove set / user changes
  }, [resolvedFieldIds.join('|'), user?.userId, initial?.cellarOwnerUserId]);

  const showCellarPicker = cellarCandidates.length > 1;
  const selectedCellar = cellarCandidates.find((c) => c.userId === cellarOwnerUserId);
  const cellarHint =
    selectedCellar?.isYou || (!selectedCellar && cellarCandidates.length <= 1)
      ? t('harvestCampaign.oil.cellarYou')
      : selectedCellar
        ? t('harvestCampaign.oil.cellarOf', {
            name: selectedCellar.displayName || selectedCellar.userId,
          })
        : null;

  // A split is always expressed in litres, even when the mill ticket was weighed in kilos.
  const farmerLitres = settlement
    ? round1(
        unit === 'litres'
          ? settlement.farmerAmount
          : settlement.farmerAmount / OLIVE_OIL_KG_PER_LITRE
      )
    : 0;
  const splitEntries = cellarCandidates.map((c) => ({
    userId: c.userId,
    litres: Math.max(0, parseHarvestDecimal(cellarLitres[c.userId] ?? '') ?? 0),
  }));
  const splitTaken = splitEntries.filter((e) => e.litres > 0.05);
  const splitRemaining = round1(farmerLitres - splitTaken.reduce((sum, e) => sum + e.litres, 0));
  const splitValid = !splitCellars || (splitTaken.length > 0 && Math.abs(splitRemaining) <= 0.05);

  const toggleMill = (id: string) => {
    setMillWeightIds((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]
    );
    setAdjustShares(false);
  };

  const toggleSplit = () => {
    if (splitCellars) {
      setSplitCellars(false);
      return;
    }

    // Start from "the chosen cellar takes it all" so one edit is enough to share it.
    setCellarLitres(
      Object.fromEntries(
        cellarCandidates.map((c) => [
          c.userId,
          c.userId === cellarOwnerUserId ? String(farmerLitres) : '',
        ])
      )
    );
    setSplitCellars(true);
  };

  const beginAdjustShares = () => {
    setManualShares(inferredShares.map((s) => ({ ...s })));
    setAdjustShares(true);
  };

  const canSaveOil = isPositiveAmount(value) && !splitBlocked && splitValid;
  const commitRef = useRef<() => boolean>(() => false);
  commitRef.current = () => {
    if (!canSaveOil || value == null) return false;
    const shares = activeShares.length > 0 ? activeShares : oilFieldShares(campaign, {
      id: 'draft',
      date: '',
      amount: value,
      unit,
      millWeightIds,
      fieldIds: showFieldPicker ? fieldIds : fieldIdsFromShares(inferredShares),
      createdAt: '',
    });
    const useTins = storageMode === 'tins';
    const only16 = useTins && tin16 > 0 && tin17 === 0;
    const only17 = useTins && tin17 > 0 && tin16 === 0;
    const bulkLitres =
      unit === 'litres' && settlement && settlement.bulkAmount > 0
        ? settlement.bulkAmount
        : undefined;
    const allocations = splitCellars
      ? splitTaken.map((e) => ({ cellarOwnerUserId: e.userId, litres: e.litres }))
      : undefined;
    // The biggest slice stands in for "whose oil is this" on the campaign card.
    const primaryCellar = allocations?.length
      ? [...allocations].sort((a, b) => b.litres - a.litres)[0].cellarOwnerUserId
      : cellarOwnerUserId;
    const primaryCandidate = cellarCandidates.find((c) => c.userId === primaryCellar);
    onSave({
      amount: value,
      unit,
      millKept: settlement?.millAmount ?? 0,
      tin16Count: useTins && tin16 > 0 ? tin16 : undefined,
      tin17Count: useTins && tin17 > 0 ? tin17 : undefined,
      tinSizeLitres: only16 ? 16 : only17 ? 17 : undefined,
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
      cellarOwnerUserId: primaryCellar || undefined,
      cellarOwnerDisplayName: primaryCandidate?.displayName,
      cellarIsYou:
        primaryCandidate?.isYou ||
        (!primaryCandidate && cellarCandidates.length <= 1) ||
        primaryCellar === user?.userId,
      cellarAllocations: allocations,
    });
    if (cellarOwnerUserId) {
      writeLastCellarOwner(
        fieldIdsFromShares(shares).length
          ? fieldIdsFromShares(shares)
          : showFieldPicker
            ? fieldIds
            : fieldIdsFromShares(inferredShares),
        cellarOwnerUserId
      );
    }
    return true;
  };

  useEffect(() => {
    flow?.bind?.(() => commitRef.current());
  }, [flow?.bind]);

  return (
    <HarvestSheetShell
      footer={
        <>
          <button
            type="button"
            className="money-primary-action"
            disabled={!canSaveOil || flow?.busy}
            onClick={() => commitRef.current()}
          >
            {flow
              ? flow.nextLabel
              : editing
                ? t('harvestCampaign.dayActivity.saveChanges')
                : t('harvestCampaign.oil.save', {
                    amount: amountLabel,
                    unit: unit === 'litres' ? t('harvestCampaign.oil.litres') : 'kg',
                  })}
          </button>
          {flow?.onBack ? (
            <button type="button" className="money-text-link" onClick={flow.onBack} disabled={flow.busy}>
              {flow.backLabel}
            </button>
          ) : null}
          <button type="button" className="money-text-link" onClick={onClose}>
            {t('common:cancel', { ns: 'common' })}
          </button>
        </>
      }
    >
      <ol className="hc-oil-steps">
        {millChipOrder.length > 0 ? (
          <OilStep n={1} title={t('harvestCampaign.oil.relatedKg')}>
            <HarvestCarryPicker
              hideHeading
              label={t('harvestCampaign.oil.relatedKg')}
              items={millChipOrder.map((row) => {
                const fieldNames = row.fieldIds
                  .map((id) => friendlyFieldLabel(fields.find((f) => f.id === id)?.name || id))
                  .filter(Boolean);
                const needsOil = uncovered.some((m) => m.id === row.id);
                return {
                  id: row.id,
                  title: `${formatGroveMassKg(row.kg, locale)} kg`,
                  detail: fieldNames.join(' + '),
                  colors: row.fieldIds.map((id) => {
                    const field = fields.find((f) => f.id === id);
                    return resolveFieldColor(field?.color, id);
                  }),
                  badge: needsOil ? t('harvestCampaign.flow.needsOil') : undefined,
                };
              })}
              selected={millWeightIds}
              onToggle={toggleMill}
              transfer={
                relatedOliveKg > 0
                  ? {
                      from: t('harvestCampaign.flow.fruitLine', { kg: Math.round(relatedOliveKg) }),
                      to: t('harvestCampaign.addMenu.title.oil'),
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
              hint={relatedOliveKg > 0 ? undefined : t('harvestCampaign.carry.pickFruit')}
              trailing={
                <button
                  type="button"
                  className={`hc-carry-clear${millWeightIds.length === 0 ? ' is-on' : ''}`}
                  onClick={() => {
                    setMillWeightIds([]);
                    setAdjustShares(false);
                  }}
                >
                  {t('harvestCampaign.oil.noRelated')}
                </button>
              }
            />
            {showFieldPicker ? (
              <HarvestFieldPicker
                mode="multiple"
                fields={fields}
                value={fieldIds}
                onChange={(next) => {
                  setFieldIds(next);
                  setAdjustShares(false);
                }}
                sectionLabel={t('harvestCampaign.millKg.whichField')}
              />
            ) : null}
          </OilStep>
        ) : (
          <OilStep n={1} title={t('harvestCampaign.millKg.whichField')}>
            <HarvestFieldPicker
              mode="multiple"
              fields={fields}
              value={fieldIds}
              onChange={(next) => {
                setFieldIds(next);
                setAdjustShares(false);
              }}
            />
          </OilStep>
        )}

        <OilStep
          n={2}
          title={
            editing ? t('harvestCampaign.dayActivity.editOil') : t('harvestCampaign.oil.prompt')
          }
        >
          <HarvestNumberInput
            hideLabel
            label={t('harvestCampaign.oil.prompt')}
            value={amount}
            onChange={setAmount}
            suffix={unitSuffix}
            autoFocus={!flow || Boolean(flow.active)}
          />
          <HarvestSegmentedControl
            value={unit}
            ariaLabel={t('harvestCampaign.oil.unitLabel')}
            onChange={setUnit}
            options={[
              { value: 'kg', label: t('harvestCampaign.oil.kg') },
              { value: 'litres', label: t('harvestCampaign.oil.litres') },
            ]}
          />
          {unit === 'litres' && isPositiveAmount(value) ? (
            <p className="capture-hint">
              {t('harvestCampaign.oil.estimatedKg', {
                kg: formatGroveMassKg(oilKg, locale),
              })}
            </p>
          ) : null}
        </OilStep>

        {isPositiveAmount(value) ? (
          <OilStep
            n={3}
            title={t('harvestCampaign.oil.millTitle')}
            hint={t('harvestCampaign.oil.millHint')}
          >
            <div className="hc-mill-kept">
              <HarvestNumberInput
                hideLabel
                label={t('harvestCampaign.oil.millTitle')}
                value={millKept}
                onChange={setMillKept}
                suffix={millMode === 'percent' ? '%' : unitSuffix}
                min={0}
              />
              <HarvestSegmentedControl
                value={millMode}
                ariaLabel={t('harvestCampaign.oil.millModeLabel')}
                onChange={setMillMode}
                options={[
                  { value: 'amount', label: t('harvestCampaign.oil.millAmount') },
                  { value: 'percent', label: t('harvestCampaign.oil.millPercent') },
                ]}
              />
            </div>
          </OilStep>
        ) : null}

        {isPositiveAmount(value) ? (
          <OilStep n={4} title={t('harvestCampaign.oil.storedTitle')}>
            <HarvestSegmentedControl
              value={storageMode}
              ariaLabel={t('harvestCampaign.oil.storedTitle')}
              onChange={setStorageMode}
              options={[
                { value: 'all', label: t('harvestCampaign.oil.storedAll') },
                { value: 'tins', label: t('harvestCampaign.oil.storedTins') },
              ]}
            />
            {storageMode === 'all' ? (
              <p className="capture-hint">{t('harvestCampaign.oil.storedAllHint')}</p>
            ) : (
              <>
                <div className="hc-oil-tins">
                  <HarvestNumberStepper
                    label={t('harvestCampaign.oil.tin16')}
                    value={tin16}
                    onChange={(next) => setTin16(Math.max(0, Math.round(next)))}
                    min={0}
                    suffix={t('harvestCampaign.oil.tinSuffix')}
                  />
                  <HarvestNumberStepper
                    label={t('harvestCampaign.oil.tin17')}
                    value={tin17}
                    onChange={(next) => setTin17(Math.max(0, Math.round(next)))}
                    min={0}
                    suffix={t('harvestCampaign.oil.tinSuffix')}
                  />
                </div>
                {settlement && !settlement.millOver && settlement.overAmount <= 0 ? (
                  <p className="capture-hint">
                    {t('harvestCampaign.oil.bulkLine', {
                      amount: formatHarvestOilAmountLabel(settlement.bulkAmount, unit, locale),
                    })}
                  </p>
                ) : null}
              </>
            )}
          </OilStep>
        ) : null}
      </ol>

      {isPositiveAmount(value) ? (
        <div className="hc-oil-cellar">
          {showCellarPicker ? (
            <>
              <p className="hc-oil-step-title">{t('harvestCampaign.oil.cellarTitle')}</p>
              {splitCellars ? (
                <>
                  {cellarCandidates.map((c) => (
                    <HarvestNumberInput
                      key={c.userId}
                      label={
                        c.isYou ? t('harvestCampaign.oil.cellarYou') : c.displayName || c.userId
                      }
                      value={cellarLitres[c.userId] ?? ''}
                      onChange={(raw) =>
                        setCellarLitres((prev) => ({ ...prev, [c.userId]: raw }))
                      }
                      suffix="L"
                      min={0}
                    />
                  ))}
                  <p className={`capture-hint${splitValid ? '' : ' money-warn'}`}>
                    {splitRemaining < -0.05
                      ? t('harvestCampaign.oil.splitOver', {
                          amount: Math.abs(splitRemaining),
                        })
                      : t('harvestCampaign.oil.splitLeft', {
                          amount: Math.max(0, splitRemaining),
                          total: farmerLitres,
                        })}
                  </p>
                </>
              ) : (
                <div
                  className="hc-oil-cellar-picks"
                  role="group"
                  aria-label={t('harvestCampaign.oil.cellarTitle')}
                >
                  {cellarCandidates.map((c) => (
                    <button
                      key={c.userId}
                      type="button"
                      className={c.userId === cellarOwnerUserId ? 'is-on' : ''}
                      aria-pressed={c.userId === cellarOwnerUserId}
                      onClick={() => setCellarOwnerUserId(c.userId)}
                    >
                      {c.isYou ? t('harvestCampaign.oil.cellarYou') : c.displayName || c.userId}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="money-text-link" onClick={toggleSplit}>
                {splitCellars
                  ? t('harvestCampaign.oil.splitOff')
                  : t('harvestCampaign.oil.splitOn')}
              </button>
            </>
          ) : cellarHint ? (
            <p className="capture-hint">{cellarHint}</p>
          ) : null}
        </div>
      ) : null}

      <div className="hc-oil-after">
      {isPositiveAmount(value) && settlement ? (
          <OilSplitSummary
            parts={settlement.parts}
            unit={unit}
            locale={locale}
            millOver={settlement.millOver}
            overAmount={settlement.overAmount}
            labelFor={(key) => t(`harvestCampaign.oil.part.${key}`)}
            overLabel={t('harvestCampaign.oil.overTins', {
              amount: formatHarvestOilAmountLabel(settlement.overAmount, unit, locale),
            })}
            millOverLabel={t('harvestCampaign.oil.overMill')}
            yieldLabel={
              yieldPct != null
                ? t('harvestCampaign.oil.yieldLine', {
                    olives: formatGroveMassKg(relatedOliveKg, locale),
                    oil: formatGroveMassKg(oilKg, locale),
                    yield: formatHarvestYieldPercent(yieldPct, locale),
                  })
                : null
            }
            sourceLabel={
              !showFieldPicker && inferredLabels.length > 0
                ? t('harvestCampaign.shared.fromFields', { fields: inferredLabels.join(' + ') })
                : null
            }
          />
      ) : null}
      {activeShares.length > 1 ? (
        <button type="button" className="money-text-link" onClick={beginAdjustShares}>
          {adjustShares
            ? t('harvestCampaign.shared.editingShares')
            : t('harvestCampaign.shared.adjustShares')}
        </button>
      ) : null}
      {adjustShares && manualShares.length > 1
        ? manualShares.map((share) => {
            const field = fields.find((f) => f.id === share.fieldId);
            return (
              <HarvestNumberInput
                key={share.fieldId}
                label={t('harvestCampaign.shared.shareFor', {
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
      <button type="button" className="capture-more-toggle" onClick={() => setMore((v) => !v)}>
        {more ? t('harvestCampaign.less') : t('harvestCampaign.more')}
      </button>
      {more ? (
        <>
          <HarvestNumberInput
            label={t('harvestCampaign.oil.acidity')}
            value={acidity}
            onChange={setAcidity}
          />
          <label className="money-form-label">
            {t('harvestCampaign.noteOptional')}
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </>
      ) : null}
      </div>
    </HarvestSheetShell>
  );
};

const OilSplitSummary: React.FC<{
  parts: { key: OilSplitPartKey; amount: number; percent: number }[];
  unit: HarvestOilUnit;
  locale: string;
  millOver: boolean;
  overAmount: number;
  yieldLabel: string | null;
  sourceLabel: string | null;
  overLabel: string;
  millOverLabel: string;
  labelFor: (key: OilSplitPartKey) => string;
}> = ({
  parts,
  unit,
  locale,
  millOver,
  overAmount,
  yieldLabel,
  sourceLabel,
  overLabel,
  millOverLabel,
  labelFor,
}) => {
  const blocked = millOver || overAmount > 0;
  const barParts = parts.filter((part) => part.amount > 0);
  return (
    <section className="hc-oil-split" aria-live="polite">
      {blocked ? (
        <p className="capture-hint money-warn">{millOver ? millOverLabel : overLabel}</p>
      ) : (
        <>
          <div className="hc-oil-split-bar" aria-hidden>
            {barParts.map((part) => (
              <span
                key={part.key}
                data-part={part.key}
                style={{ width: `${Math.max(part.percent, 0)}%` }}
              />
            ))}
          </div>
          <ul className="hc-oil-split-list">
            {parts.map((part) => (
              <li key={part.key}>
                <span className="hc-oil-split-swatch" data-part={part.key} aria-hidden />
                <span>{labelFor(part.key)}</span>
                <strong>{formatHarvestOilAmountLabel(part.amount, unit, locale)}</strong>
                <span className="hc-oil-split-pct">
                  {formatHarvestYieldPercent(part.percent, locale)}%
                </span>
              </li>
            ))}
          </ul>
          {yieldLabel ? <p className="capture-yield">{yieldLabel}</p> : null}
          {sourceLabel ? <p className="capture-hint hc-oil-source">{sourceLabel}</p> : null}
        </>
      )}
    </section>
  );
};
