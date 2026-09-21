import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { formatGroveMassKg } from '../../utils/groveTotals';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
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
  allowedAddKinds?: DayActivityKind[];
  onEdit: (target: DayActivityEditTarget) => void;
  onRemove: (target: DayActivityEditTarget) => void;
  onAdd: (kind: DayActivityKind) => void;
  onReopen?: () => void;
};

type RowModel = {
  id: string;
  target: DayActivityEditTarget;
  title: string;
  meta: string[];
  status?: { label: string; tone: 'ok' | 'warn' | 'muted' };
  canEdit: boolean;
};

export const HarvestDayActivity: React.FC<Props> = ({
  campaign,
  date,
  locale,
  labelOf,
  closed,
  allowedAddKinds,
  onEdit,
  onRemove,
  onAdd,
  onReopen,
}) => {
  const { t } = useTranslation('fields');
  const allow = (kind: DayActivityKind) =>
    !allowedAddKinds || allowedAddKinds.includes(kind);

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

    const sackRows: RowModel[] = day.sacks.map((entry) => {
      const meta = [friendlyFieldLabel(labelOf(entry.fieldId))];
      if (entry.kgPerSack) {
        meta.push(t('harvestCampaign.dayActivity.kgPerSackShort', { kg: entry.kgPerSack }));
      }
      return {
        id: entry.id,
        target: { kind: 'sack', entry },
        title: `${entry.sacks} ${t('harvestCampaign.sacks.unit')}`,
        meta,
        status: entry.millWeightId
          ? { label: t('harvestCampaign.dayActivity.weighed'), tone: 'ok' as const }
          : { label: t('harvestCampaign.dayActivity.open'), tone: 'warn' as const },
        canEdit: true,
      };
    });

    const millRows: RowModel[] = day.mills.map((entry) => {
      const meta = [
        fieldNames(entry.fieldIds).join(' · ') || t('harvestCampaign.shared.badge'),
      ];
      if (entry.sackIds.length > 0) {
        meta.push(t('harvestCampaign.dayActivity.fromSacksShort', { count: entry.sackIds.length }));
      }
      if (entry.receiptRef) meta.push(entry.receiptRef);
      if (entry.note) meta.push(entry.note);
      return {
        id: entry.id,
        target: { kind: 'mill', entry },
        title: `${formatGroveMassKg(entry.kg, locale)} kg`,
        meta,
        canEdit: true,
      };
    });

    const oilRows: RowModel[] = day.oils.map((entry) => {
      const meta = [
        entry.fieldIds.length
          ? fieldNames(entry.fieldIds).join(' · ')
          : t('harvestCampaign.dayActivity.fromMills', { count: entry.millWeightIds.length }),
        ...oilStorageBits(entry, locale, t),
      ];
      if (entry.acidity != null) {
        meta.push(t('harvestCampaign.dayActivity.acidityShort', { value: entry.acidity }));
      }
      if (entry.note) meta.push(entry.note);
      return {
        id: entry.id,
        target: { kind: 'oil', entry },
        title:
          entry.unit === 'litres'
            ? `${Math.round(entry.amount)} L`
            : `${formatGroveMassKg(oilAmountToKg(entry), locale)} kg`,
        meta,
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
      const meta = [hours];
      if (entry.costEur != null && entry.costEur > 0) {
        meta.push(`${entry.costEur} €`);
      }
      return {
        id: entry.id,
        target: { kind: 'people', entry },
        title: t('harvestCampaign.today.people', { count: entry.people }),
        meta,
        canEdit: true,
      };
    });

    const expenseRows: RowModel[] = day.expenses.map((entry) => ({
      id: entry.id,
      target: { kind: 'expense' as const, entry },
      title: `${entry.amountEur} €`,
      meta: [entry.note || t('harvestCampaign.expense.moneyDescription')],
      canEdit: false,
    }));

    const noteRows: RowModel[] = day.notes.map((entry) => ({
      id: entry.id,
      target: { kind: 'note' as const, entry },
      title: entry.body || t('harvestCampaign.actions.note'),
      meta: entry.photoCount
        ? [t('harvestCampaign.today.photos', { count: entry.photoCount })]
        : [],
      canEdit: false,
    }));

    return [
      {
        key: 'sacks',
        label: t('harvestCampaign.actions.sacks'),
        rows: sackRows,
      },
      {
        key: 'mill',
        label: t('harvestCampaign.actions.millShort', {
          defaultValue: t('harvestCampaign.actions.mill'),
        }),
        rows: millRows,
      },
      {
        key: 'oil',
        label: t('harvestCampaign.actions.oil'),
        rows: oilRows,
      },
      {
        key: 'people',
        label: t('harvestCampaign.actions.people'),
        rows: peopleRows,
      },
      {
        key: 'expense',
        label: t('harvestCampaign.actions.expense'),
        rows: expenseRows,
      },
      {
        key: 'note',
        label: t('harvestCampaign.actions.note'),
        rows: noteRows,
      },
    ].filter((group) => group.rows.length > 0);
  }, [day, labelOf, locale, t]);

  const empty = groups.length === 0;

  const confirmRemove = (target: DayActivityEditTarget) => {
    const ok = window.confirm(t('harvestCampaign.dayActivity.removeConfirm'));
    if (ok) onRemove(target);
  };

  const candidateAddKinds: { kind: DayActivityKind; label: string }[] = [
    { kind: 'sack', label: t('harvestCampaign.actions.sacks') },
    { kind: 'mill', label: t('harvestCampaign.actions.millShort', { defaultValue: t('harvestCampaign.actions.mill') }) },
    { kind: 'oil', label: t('harvestCampaign.actions.oil') },
    { kind: 'people', label: t('harvestCampaign.actions.people') },
    { kind: 'expense', label: t('harvestCampaign.actions.expense') },
    { kind: 'note', label: t('harvestCampaign.actions.note') },
  ];
  const addKinds = candidateAddKinds.filter((item) => allow(item.kind));

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
          <div className="hc-day-activity-closed">
            <p className="hc-help">{t('harvestCampaign.dayActivity.closedHint')}</p>
            {onReopen ? (
              <button type="button" className="hc-ghost" onClick={onReopen}>
                {t('harvestCampaign.dayNav.reopen')}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      {!closed && addKinds.length > 0 ? (
        <div
          className="hc-day-activity-add"
          role="group"
          aria-label={t('harvestCampaign.home.whatAdd')}
        >
          {addKinds.map((item) => (
            <button
              key={item.kind}
              type="button"
              className="hc-day-add-chip"
              onClick={() => onAdd(item.kind)}
            >
              <span aria-hidden>+</span> {item.label}
            </button>
          ))}
        </div>
      ) : null}

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
                      {row.meta.length > 0 || row.status ? (
                        <div className="hc-day-row-meta">
                          {row.meta.map((bit) => (
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
                    {!closed ? (
                      <div className="hc-day-activity-actions">
                        {row.canEdit ? (
                          <button
                            type="button"
                            className="hc-icon-btn"
                            onClick={() => onEdit(row.target)}
                            aria-label={t('harvestCampaign.dayActivity.edit')}
                            title={t('harvestCampaign.dayActivity.edit')}
                          >
                            <Pencil size={16} aria-hidden />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="hc-icon-btn is-danger"
                          onClick={() => confirmRemove(row.target)}
                          aria-label={t('harvestCampaign.dayActivity.remove')}
                          title={t('harvestCampaign.dayActivity.remove')}
                        >
                          <Trash2 size={16} aria-hidden />
                        </button>
                      </div>
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
