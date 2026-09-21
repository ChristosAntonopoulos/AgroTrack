import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { equalFieldShares, fieldIdsFromShares, sharesFromSacks } from '../allocation';
import {
  formatDaySpan,
  pendingSacksByDay,
  suggestMillIncludes,
} from '../chain';
import { HarvestFieldPicker } from '../components/HarvestFieldPicker';
import { HarvestNumberInput } from '../components/HarvestNumberInput';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { isPositiveAmount, parseHarvestDecimal } from '../utils/harvestValidation';
import type { HarvestFieldShare, HarvestMillWeightEntry, HarvestSackEntry } from '../types';
import type { HarvestSheetSharedProps } from './types';

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
    onSave: (input: {
      kg: number;
      fieldIds: string[];
      fieldShares?: HarvestFieldShare[];
      sackIds: string[];
      receiptRef?: string;
      note?: string;
    }) => void;
  }
> = ({ campaign, fields, today, locale, prefillSackIds, initial, onSave, onClose }) => {
  const { t } = useTranslation('fields');
  const editing = Boolean(initial);
  const suggested = useMemo(
    () => suggestMillIncludes(campaign, today),
    [campaign, today]
  );
  const allPendingByDay = useMemo(() => {
    const groups = pendingSacksByDay(campaign);
    const editingSackIds = new Set(initial?.sackIds || []);
    // When editing, also surface sacks already linked to this mill.
    const linkedForEdit =
      initial != null
        ? campaign.sacks.filter((s) => editingSackIds.has(s.id) || s.millWeightId === initial.id)
        : [];
    const byDate = new Map(groups.map((g) => [g.date, g]));
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

  const initialSackIds = useMemo(() => {
    if (initial?.sackIds?.length) return initial.sackIds;
    if (prefillSackIds && prefillSackIds.length > 0) {
      const allowed = new Set(pendingPool.map((s) => s.id));
      return prefillSackIds.filter((id) => allowed.has(id));
    }
    return suggested.map((s) => s.id);
  }, [initial, prefillSackIds, pendingPool, suggested]);

  const fieldsFromSackIds = (ids: string[]) => [
    ...new Set(
      campaign.sacks.filter((s) => ids.includes(s.id)).map((s) => s.fieldId)
    ),
  ];

  const initialFields = useMemo(() => {
    if (initial?.fieldIds?.length) return initial.fieldIds;
    const fromSacks = fieldsFromSackIds(initialSackIds);
    if (fromSacks.length > 0) return fromSacks;
    if (campaign.fieldOrder.length === 1) return [campaign.fieldOrder[0]];
    // Multiple participants: do not silently pick API first field.
    return [];
  }, [initial, initialSackIds, campaign, fields]);

  const [kg, setKg] = useState(initial ? String(initial.kg) : '');
  const [fieldIds, setFieldIds] = useState<string[]>(initialFields);
  const [sackIds, setSackIds] = useState<string[]>(initialSackIds);
  const [expandIncludes, setExpandIncludes] = useState(false);
  const [more, setMore] = useState(Boolean(initial?.note || initial?.receiptRef));
  const [adjustShares, setAdjustShares] = useState(false);
  const [manualShares, setManualShares] = useState<HarvestFieldShare[]>(
    initial?.fieldShares || []
  );
  const [receiptRef, setReceiptRef] = useState(initial?.receiptRef || '');
  const [note, setNote] = useState(initial?.note || '');
  const kgNumber = parseHarvestDecimal(kg);

  const selectedSacks = useMemo(
    () => pendingPool.filter((s) => sackIds.includes(s.id)),
    [pendingPool, sackIds]
  );

  const includeSummary = useMemo(() => {
    if (selectedSacks.length === 0) return null;
    const byDay = new Map<string, HarvestSackEntry[]>();
    for (const sack of selectedSacks) {
      const list = byDay.get(sack.date) || [];
      list.push(sack);
      byDay.set(sack.date, list);
    }
    const dates = [...byDay.keys()].sort();
    return {
      count: selectedSacks.reduce((sum, s) => sum + s.sacks, 0),
      span: formatDaySpan(dates, locale),
      lines: dates.map((date) => {
        const daySacks = byDay.get(date)!;
        const count = daySacks.reduce((sum, s) => sum + s.sacks, 0);
        const fieldNames = [
          ...new Set(
            daySacks.map(
              (s) => friendlyFieldLabel(fields.find((f) => f.id === s.fieldId)?.name || s.fieldId)
            )
          ),
        ];
        return `${formatWeekday(date, locale)} ${count} · ${fieldNames.join(' + ')}`;
      }),
    };
  }, [selectedSacks, fields, locale]);

  const defaultShares = useMemo(() => {
    if (sackIds.length > 0) {
      return sharesFromSacks(campaign.sacks, sackIds, fieldIds);
    }
    return equalFieldShares(fieldIds);
  }, [campaign.sacks, sackIds, fieldIds]);

  const activeShares = adjustShares && manualShares.length > 0 ? manualShares : defaultShares;

  const beginAdjustShares = () => {
    setManualShares(defaultShares.map((s) => ({ ...s })));
    setAdjustShares(true);
  };

  const toggleSack = (id: string) => {
    setSackIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const nextFields = fieldsFromSackIds(next);
      if (nextFields.length > 0) setFieldIds(nextFields);
      setAdjustShares(false);
      return next;
    });
  };

  const selectAllPending = () => {
    const ids = pendingPool.map((s) => s.id);
    setSackIds(ids);
    setFieldIds(fieldsFromSackIds(ids));
    setAdjustShares(false);
  };

  return (
    <HarvestSheetShell
      footer={
        <>
          <button
            type="button"
            className="money-primary-action"
            disabled={!isPositiveAmount(kgNumber)}
            onClick={() =>
              onSave({
                kg: kgNumber!,
                fieldIds: fieldIdsFromShares(activeShares).length
                  ? fieldIdsFromShares(activeShares)
                  : fieldIds,
                fieldShares: activeShares.length > 0 ? activeShares : undefined,
                sackIds,
                receiptRef: more && receiptRef.trim() ? receiptRef.trim() : undefined,
                note: more && note.trim() ? note.trim() : undefined,
              })
            }
          >
            {editing
              ? t('harvestCampaign.dayActivity.saveChanges')
              : t('harvestCampaign.millKg.save', {
              kg: formatGroveMassKg(kgNumber || 0, locale),
            })}
          </button>
          <button type="button" className="money-text-link" onClick={onClose}>
            {t('common:cancel', { ns: 'common' })}
          </button>
        </>
      }
    >
      <p className="capture-prompt">
        {editing ? t('harvestCampaign.dayActivity.editMill') : t('harvestCampaign.millKg.prompt')}
      </p>
      <HarvestNumberInput
        label={t('harvestCampaign.actions.mill')}
        value={kg}
        onChange={setKg}
        suffix="kg"
        autoFocus
      />

      {pendingPool.length > 0 ? (
        <div className="hc-includes">
          <div className="hc-includes-head">
            <p className="hc-form-section">{t('harvestCampaign.chain.includesTitle')}</p>
            <button
              type="button"
              className="money-text-link"
              onClick={() => setExpandIncludes((v) => !v)}
            >
              {expandIncludes
                ? t('harvestCampaign.chain.includesDone')
                : t('harvestCampaign.chain.includesChange')}
            </button>
          </div>
          {!expandIncludes && includeSummary ? (
            <div className="hc-includes-summary">
              <strong>
                {t('harvestCampaign.chain.includesCount', {
                  count: includeSummary.count,
                  span: includeSummary.span,
                })}
              </strong>
              {includeSummary.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          ) : null}
          {!expandIncludes && !includeSummary ? (
            <p className="capture-hint">{t('harvestCampaign.chain.includesNone')}</p>
          ) : null}
          {expandIncludes ? (
            <div className="hc-includes-expand">
              <button type="button" className="money-text-link" onClick={selectAllPending}>
                {t('harvestCampaign.chain.includesAll')}
              </button>
              {allPendingByDay.map((group) => (
                <div key={group.date} className="hc-includes-day">
                  <p className="hc-includes-day-label">
                    {formatWeekday(group.date, locale)} · {group.sackCount}{' '}
                    {t('harvestCampaign.actions.sacks').toLowerCase()}
                  </p>
                  {group.sacks.map((sack) => {
                    const field = fields.find((f) => f.id === sack.fieldId);
                    const checked = sackIds.includes(sack.id);
                    return (
                      <label key={sack.id} className={`hc-chip ${checked ? 'is-on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSack(sack.id)}
                        />
                        {sack.sacks} · {friendlyFieldLabel(field?.name || sack.fieldId)}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

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
      {fieldIds.length === 0 ? (
        <p className="capture-hint">{t('harvestCampaign.millKg.split.none')}</p>
      ) : fieldIds.length > 1 ? (
        <p className="capture-hint">{t('harvestCampaign.shared.lotHint')}</p>
      ) : null}
      {fieldIds.length > 1 ? (
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
          <p className="capture-hint">{t('harvestCampaign.millKg.tareHint')}</p>
          <label className="money-form-label">
            {t('harvestCampaign.millKg.receiptRef')}
            <input
              type="text"
              value={receiptRef}
              onChange={(e) => setReceiptRef(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="money-form-label">
            {t('harvestCampaign.noteOptional')}
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </>
      ) : null}
    </HarvestSheetShell>
  );
};
