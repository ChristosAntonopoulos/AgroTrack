import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
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
  const { t } = useTranslation('fields');
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
  const [millWeightIds, setMillWeightIds] = useState<string[]>(defaultMillIds);
  const [fieldIds, setFieldIds] = useState<string[]>(initial?.fieldIds || []);
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

  const selectedMills = campaign.millWeights.filter((row) => millWeightIds.includes(row.id));  const relatedOliveKg = selectedMills.reduce((sum, row) => sum + row.kg, 0);
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

  const toggleMill = (id: string) => {
    setMillWeightIds((prev) =>
      prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]
    );
    setAdjustShares(false);
  };

  const beginAdjustShares = () => {
    setManualShares(inferredShares.map((s) => ({ ...s })));
    setAdjustShares(true);
  };

  return (
    <HarvestSheetShell
      footer={
        <>
          <button
            type="button"
            className="money-primary-action"
            disabled={!isPositiveAmount(value)}
            onClick={() => {
              const shares = activeShares.length > 0 ? activeShares : oilFieldShares(campaign, {
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
          >
            {editing
              ? t('harvestCampaign.dayActivity.saveChanges')
              : t('harvestCampaign.oil.save', {
              amount: amountLabel,
              unit: unit === 'litres' ? t('harvestCampaign.oil.litres') : 'kg',
            })}
          </button>
          <button type="button" className="money-text-link" onClick={onClose}>
            {t('common:cancel', { ns: 'common' })}
          </button>
        </>
      }
    >
      <p className="capture-prompt">
        {editing ? t('harvestCampaign.dayActivity.editOil') : t('harvestCampaign.oil.prompt')}
      </p>
      <HarvestSegmentedControl
        value={unit}
        ariaLabel={t('harvestCampaign.oil.prompt')}
        onChange={setUnit}
        options={[
          { value: 'kg', label: t('harvestCampaign.oil.kg') },
          { value: 'litres', label: t('harvestCampaign.oil.litres') },
        ]}
      />
      <HarvestNumberInput
        label={unit === 'kg' ? t('harvestCampaign.oil.kg') : t('harvestCampaign.oil.litres')}
        value={amount}
        onChange={setAmount}
        suffix={unit === 'kg' ? 'kg' : 'L'}
      />
      {unit === 'litres' && isPositiveAmount(value) ? (
        <p className="capture-hint">
          {t('harvestCampaign.oil.estimatedKg', {
            kg: formatGroveMassKg(oilKg, locale),
          })}
        </p>
      ) : null}
      {yieldPct != null ? (
        <p className="capture-yield">
          {t('harvestCampaign.oil.yieldLine', {
            olives: formatGroveMassKg(relatedOliveKg, locale),
            oil: formatGroveMassKg(oilKg, locale),
            yield: formatHarvestYieldPercent(yieldPct, locale),
          })}
        </p>
      ) : null}
      {millChipOrder.length > 0 ? (
        <>
          <p className="hc-form-section">{t('harvestCampaign.oil.relatedKg')}</p>
          <div className="money-chips">
            {millChipOrder.map((row) => {
              const fieldNames = row.fieldIds
                .map((id) => friendlyFieldLabel(fields.find((f) => f.id === id)?.name || id))
                .filter(Boolean);
              const needsOil = uncovered.some((m) => m.id === row.id);
              return (
                <button
                  key={row.id}
                  type="button"
                  className={`money-chip${millWeightIds.includes(row.id) ? ' is-active' : ''}${
                    needsOil ? ' hc-chip-needs-oil' : ''
                  }`}
                  onClick={() => toggleMill(row.id)}
                >
                  {row.date} · {formatGroveMassKg(row.kg, locale)} kg
                  {fieldNames.length > 0 ? ` · ${fieldNames.join(' + ')}` : ''}
                </button>
              );
            })}
            <button
              type="button"
              className={`money-chip${millWeightIds.length === 0 ? ' is-active' : ''}`}
              onClick={() => {
                setMillWeightIds([]);
                setAdjustShares(false);
              }}
            >
              {t('harvestCampaign.oil.noRelated')}
            </button>
          </div>
        </>
      ) : null}
      {!showFieldPicker && inferredLabels.length > 0 ? (
        <p className="capture-hint">
          {t('harvestCampaign.shared.fromFields', { fields: inferredLabels.join(' + ') })}
        </p>
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
          sectionLabel={t('harvestCampaign.millKg.whichField')}
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
    </HarvestSheetShell>
  );
};
