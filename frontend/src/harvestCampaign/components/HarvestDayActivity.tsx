import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { oilAmountToKg } from '../totals';
import { formatHarvestOilAmountLabel, readOilTinCounts } from '../utils/harvestCalculations';
import type {
  HarvestCampaign,
  HarvestExpenseEntry,
  HarvestMillWeightEntry,
  HarvestNoteEntry,
  HarvestOilEntry,
  HarvestPeopleEntry,
  HarvestSackEntry,
} from '../types';

export type DayActivityKind = 'sack' | 'mill' | 'oil' | 'people' | 'expense' | 'note';

export type DayActivityEditTarget =
  | { kind: 'sack'; entry: HarvestSackEntry }
  | { kind: 'mill'; entry: HarvestMillWeightEntry }
  | { kind: 'oil'; entry: HarvestOilEntry }
  | { kind: 'people'; entry: HarvestPeopleEntry }
  | { kind: 'expense'; entry: HarvestExpenseEntry }
  | { kind: 'note'; entry: HarvestNoteEntry };

function oilStorageBits(
  entry: HarvestOilEntry,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string[] {
  const tins = readOilTinCounts(entry);
  const bits: string[] = [];
  if (tins.tin16 > 0) bits.push(t('harvestCampaign.oil.tinBit', { count: tins.tin16, size: 16 }));
  if (tins.tin17 > 0) bits.push(t('harvestCampaign.oil.tinBit', { count: tins.tin17, size: 17 }));
  if (entry.millKept != null) {
    bits.push(
      t('harvestCampaign.oil.millBit', {
        amount: formatHarvestOilAmountLabel(entry.millKept, entry.unit, locale),
      })
    );
  }
  return bits;
}

type Props = {
  campaign: HarvestCampaign;
  date: string;
  locale: string;
  labelOf: (fieldId: string) => string;
  closed?: boolean;
  /** When false, hide edit/delete (view-only or locked seat). */
  canMutateEntries?: boolean;
  onEdit: (target: DayActivityEditTarget) => void;
  onRemove: (target: DayActivityEditTarget) => void;
};

type RowModel = {
  id: string;
  target: DayActivityEditTarget;
  title: string;
  context: string[];
  status?: { label: string; tone: 'ok' | 'warn' | 'muted' };
  canEdit: boolean;
};

const useIsNarrow = (breakpoint = 768) => {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches : true
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return narrow;
};

const RowActions: React.FC<{
  row: RowModel;
  narrow: boolean;
  onEdit: (target: DayActivityEditTarget) => void;
  onRemove: (target: DayActivityEditTarget) => void;
  editLabel: string;
  removeLabel: string;
  menuLabel: string;
}> = ({ row, narrow, onEdit, onRemove, editLabel, removeLabel, menuLabel }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (narrow) {
    return (
      <div className="hc-day-row-menu" ref={wrapRef}>
        <button
          type="button"
          className="hc-icon-btn"
          aria-label={menuLabel}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <MoreHorizontal size={16} aria-hidden />
        </button>
        {open ? (
          <div className="hc-day-row-menu-panel" role="menu">
            {row.canEdit ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit(row.target);
                }}
              >
                {editLabel}
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => {
                setOpen(false);
                onRemove(row.target);
              }}
            >
              {removeLabel}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="hc-day-activity-actions">
      {row.canEdit ? (
        <button
          type="button"
          className="hc-icon-btn"
          onClick={() => onEdit(row.target)}
          aria-label={editLabel}
          title={editLabel}
        >
          <Pencil size={16} aria-hidden />
        </button>
      ) : null}
      <div className="hc-day-row-menu" ref={wrapRef}>
        <button
          type="button"
          className="hc-icon-btn"
          aria-label={menuLabel}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <MoreHorizontal size={16} aria-hidden />
        </button>
        {open ? (
          <div className="hc-day-row-menu-panel" role="menu">
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => {
                setOpen(false);
                onRemove(row.target);
              }}
            >
              {removeLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const HarvestDayActivity: React.FC<Props> = ({
  campaign,
  date,
  locale,
  labelOf,
  closed,
  canMutateEntries = true,
  onEdit,
  onRemove,
}) => {
  const { t } = useTranslation('fields');
  const { formatDateTime } = useLocaleFormatters();
  const narrow = useIsNarrow(768);

  const day = useMemo(() => {
    const sacks = campaign.sacks.filter((row) => row.date === date);
    const mills = campaign.millWeights.filter((row) => row.date === date);
    const oils = campaign.oils.filter((row) => row.date === date);
    const people = campaign.peopleLogs.filter((row) => row.date === date);
    const expenses = campaign.expenses.filter((row) => row.date === date);
    const notes = campaign.notes.filter((row) => row.date === date);
    return { sacks, mills, oils, people, expenses, notes };
  }, [campaign, date]);

  const groups = useMemo(() => {
    const fieldNames = (ids: string[]) =>
      ids.map((id) => friendlyFieldLabel(labelOf(id))).filter(Boolean);

    const pushTime = (bits: string[], createdAt?: string) => {
      if (!createdAt) return;
      const formatted = formatDateTime(createdAt);
      if (formatted) bits.push(formatted);
    };

    const sackRows: RowModel[] = day.sacks.map((entry) => {
      const context: string[] = [];
      pushTime(context, entry.createdAt);
      const field = friendlyFieldLabel(labelOf(entry.fieldId));
      if (field) context.push(field);
      if (entry.kgPerSack) {
        context.push(t('harvestCampaign.dayActivity.kgPerSackShort', { kg: entry.kgPerSack }));
      }
      if (entry.harvestRecordId) {
        context.push(t('harvestCampaign.dayActivity.sourceSynced'));
      }
      return {
        id: entry.id,
        target: { kind: 'sack', entry },
        title: `${entry.sacks} ${t('harvestCampaign.sacks.unit')}`,
        context,
        status: entry.millWeightId
          ? { label: t('harvestCampaign.dayActivity.weighed'), tone: 'ok' as const }
          : { label: t('harvestCampaign.dayActivity.open'), tone: 'warn' as const },
        canEdit: true,
      };
    });

    const millRows: RowModel[] = day.mills.map((entry) => {
      const context: string[] = [];
      pushTime(context, entry.createdAt);
      const fields = fieldNames(entry.fieldIds).join(' · ');
      if (fields) context.push(fields);
      else context.push(t('harvestCampaign.shared.badge'));
      if (entry.sackIds.length > 0) {
        context.push(t('harvestCampaign.dayActivity.fromSacksShort', { count: entry.sackIds.length }));
      }
      if (entry.receiptRef) context.push(entry.receiptRef);
      if (entry.photoCount && entry.photoCount > 0) {
        context.push(t('harvestCampaign.today.photos', { count: entry.photoCount }));
      }
      if (entry.harvestRecordId || (entry.harvestRecordIds && entry.harvestRecordIds.length > 0)) {
        context.push(t('harvestCampaign.dayActivity.sourceSynced'));
      }
      if (entry.note) context.push(entry.note);
      return {
        id: entry.id,
        target: { kind: 'mill', entry },
        title: `${formatGroveMassKg(entry.kg, locale)} kg`,
        context,
        canEdit: true,
      };
    });

    const oilRows: RowModel[] = day.oils.map((entry) => {
      const context: string[] = [];
      pushTime(context, entry.createdAt);
      if (entry.fieldIds.length) {
        const fields = fieldNames(entry.fieldIds).join(' · ');
        if (fields) context.push(fields);
      } else if (entry.millWeightIds.length > 0) {
        context.push(t('harvestCampaign.dayActivity.fromMills', { count: entry.millWeightIds.length }));
      }
      context.push(...oilStorageBits(entry, locale, t));
      if (entry.acidity != null) {
        context.push(t('harvestCampaign.dayActivity.acidityShort', { value: entry.acidity }));
      }
      if (entry.harvestRecordId || (entry.harvestRecordIds && entry.harvestRecordIds.length > 0)) {
        context.push(t('harvestCampaign.dayActivity.sourceSynced'));
      }
      if (entry.note) context.push(entry.note);
      return {
        id: entry.id,
        target: { kind: 'oil', entry },
        title:
          entry.unit === 'litres'
            ? `${Math.round(entry.amount)} L`
            : `${formatGroveMassKg(oilAmountToKg(entry), locale)} kg`,
        context,
        canEdit: true,
      };
    });

    const peopleRows: RowModel[] = day.people.map((entry) => {
      const hours =
        entry.hours === 'half'
          ? t('harvestCampaign.people.hours.half')
          : entry.hours === 'full'
            ? t('harvestCampaign.people.hours.full')
            : entry.hours === 'other'
              ? `${entry.otherHours ?? '—'} h`
              : t('harvestCampaign.people.hours.skip');
      const context: string[] = [];
      pushTime(context, entry.createdAt);
      context.push(hours);
      if (entry.costEur != null && entry.costEur > 0) {
        context.push(`${entry.costEur} €`);
        if (entry.addedToMoney) {
          context.push(t('harvestCampaign.dayActivity.linkedExpense'));
        }
      }
      if (entry.harvestRecordId) {
        context.push(t('harvestCampaign.dayActivity.sourceSynced'));
      }
      return {
        id: entry.id,
        target: { kind: 'people', entry },
        title: t('harvestCampaign.today.people', { count: entry.people }),
        context,
        canEdit: true,
      };
    });

    const expenseRows: RowModel[] = day.expenses.map((entry) => {
      const context: string[] = [];
      pushTime(context, entry.createdAt);
      if (entry.note) context.push(entry.note);
      else context.push(t('harvestCampaign.expense.moneyDescription'));
      if (entry.transactionId) {
        context.push(t('harvestCampaign.dayActivity.linkedExpense'));
      }
      return {
        id: entry.id,
        target: { kind: 'expense' as const, entry },
        title: `${entry.amountEur} €`,
        context,
        canEdit: false,
      };
    });

    const noteRows: RowModel[] = day.notes.map((entry) => {
      const context: string[] = [];
      pushTime(context, entry.createdAt);
      if (entry.photoCount && entry.photoCount > 0) {
        context.push(t('harvestCampaign.today.photos', { count: entry.photoCount }));
      }
      if (entry.noteId) {
        context.push(t('harvestCampaign.dayActivity.sourceChronologio'));
      }
      return {
        id: entry.id,
        target: { kind: 'note' as const, entry },
        title: entry.body || t('harvestCampaign.actions.note'),
        context,
        canEdit: false,
      };
    });

    return [
      { key: 'sacks', label: t('harvestCampaign.actions.sacks'), rows: sackRows },
      {
        key: 'mill',
        label: t('harvestCampaign.actions.millShort', {
          defaultValue: t('harvestCampaign.actions.mill'),
        }),
        rows: millRows,
      },
      { key: 'oil', label: t('harvestCampaign.actions.oil'), rows: oilRows },
      { key: 'people', label: t('harvestCampaign.actions.people'), rows: peopleRows },
      { key: 'expense', label: t('harvestCampaign.actions.expense'), rows: expenseRows },
      { key: 'note', label: t('harvestCampaign.actions.note'), rows: noteRows },
    ].filter((group) => group.rows.length > 0);
  }, [day, formatDateTime, labelOf, locale, t]);

  const empty = groups.length === 0;
  const showActions = !closed && canMutateEntries;

  const confirmRemove = (target: DayActivityEditTarget) => {
    const ok = window.confirm(t('harvestCampaign.dayActivity.removeConfirm'));
    if (ok) onRemove(target);
  };

  return (
    <section
      className={`hc-day-activity${closed ? ' is-closed' : ''}`}
      aria-label={t('harvestCampaign.dayActivity.title')}
    >
      <header className="hc-day-activity-head">
        <div>
          <p className="hc-kicker">{t('harvestCampaign.dayActivity.kicker')}</p>
          <h3>{t('harvestCampaign.dayActivity.title')}</h3>
        </div>
        {closed ? (
          <p className="hc-help hc-day-activity-closed-hint">{t('harvestCampaign.dayActivity.closedHint')}</p>
        ) : null}
      </header>

      {empty ? (
        <p className="hc-day-activity-empty">{t('harvestCampaign.dayActivity.empty')}</p>
      ) : (
        <div className="hc-day-activity-groups">
          {groups.map((group) => (
            <section key={group.key} className="hc-day-group" aria-label={group.label}>
              <header className="hc-day-group-head">
                <h4>{group.label}</h4>
                <span>{group.rows.length}</span>
              </header>
              <ul className="hc-day-activity-list">
                {group.rows.map((row) => (
                  <li key={row.id} className="hc-day-activity-item">
                    <div className="hc-day-activity-main">
                      <strong>{row.title}</strong>
                      {row.context.length > 0 || row.status ? (
                        <div className="hc-day-row-meta">
                          {row.context.map((bit) => (
                            <span key={`${row.id}-${bit}`} className="hc-day-meta-bit">
                              {bit}
                            </span>
                          ))}
                          {row.status ? (
                            <span className={`hc-day-status is-${row.status.tone}`}>
                              {row.status.label}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {showActions ? (
                      <RowActions
                        row={row}
                        narrow={narrow}
                        onEdit={onEdit}
                        onRemove={confirmRemove}
                        editLabel={t('harvestCampaign.dayActivity.edit')}
                        removeLabel={t('harvestCampaign.dayActivity.remove')}
                        menuLabel={t('harvestCampaign.dayActivity.rowMenu')}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
};
