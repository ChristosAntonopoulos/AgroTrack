import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Ban,
  Droplets,
  Gift,
  HandHelping,
  Home,
  Package,
  Pencil,
  Sprout,
  Truck,
  Undo2,
  type LucideIcon} from 'lucide-react';
import { formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import {
  canReverseMovement,
  groupMovementsByDay,
  movementActionKey,
  undoneMovementIds} from '../../myOil/commitmentCopy';
import { OilSectionHeader } from './OilStockChrome';
import type { OilLot, StockMovement } from '../../services/oilStockService';

type PackLabels = {
  tin: (count: number, size: number) => string;
  bulk: (amount: number) => string;
  litres: (amount: number) => string;
};

type Props = {
  movements: StockMovement[];
  lots: OilLot[];
  fieldNames: Record<string, string>;
  packLabels: PackLabels;
  preview?: boolean;
  onSeeAll?: () => void;
  busy?: boolean;
  /** Omitted on the stock-tab preview, where undo would be too easy to hit by accident. */
  onReverse?: (m: StockMovement) => void;
};

const ACTION_ICON: Record<string, LucideIcon> = {
  produced: Sprout,
  filledTins: Package,
  held: HandHelping,
  holdCancelled: Ban,
  sold: Droplets,
  delivered: Truck,
  homeUse: Home,
  gifted: Gift,
  consumed: Droplets,
  corrected: Pencil,
  other: Activity};

export function MovementsTab({
  movements,
  lots,
  fieldNames,
  packLabels,
  preview,
  onSeeAll,
  busy,
  onReverse}: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);

  const undone = useMemo(() => undoneMovementIds(movements), [movements]);
  const shown = preview ? movements.slice(0, 3) : movements;

  const groups = useMemo(
    () =>
      groupMovementsByDay(shown, i18n.language, {
        today: t('common:today'),
        yesterday: t('common:yesterday')}),
    [shown, i18n.language, t]
  );

  if (movements.length === 0) {
    return (
      <section className="my-oil-panel">
        <div className="my-oil-empty">
          <p className="my-oil-empty__title">{t('recent.emptyTitle')}</p>
          <p className="my-oil-empty__body">{t('recent.emptyBody')}</p>
        </div>
      </section>
    );
  }

  const detailFor = (m: StockMovement) => {
    const action = movementActionKey(m.kind);
    if (action === 'produced') {
      const lot = lots.find((l) => l.id === m.oilLotId);
      const where = lot?.fieldIds.map((id) => fieldNames[id]).filter(Boolean).join(' · ');
      return where || undefined;
    }
    if (action === 'filledTins') {
      const tins = Math.abs(m.packDelta.tin16) + Math.abs(m.packDelta.tin17);
      const bulk = Math.abs(m.packDelta.bulkLitres);
      if (tins > 0) {
        return t('timeline.bulkToTins', {
          bulk: `${formatOilNumber(bulk || tins * 16, i18n.language)} L`,
          tins});
      }
    }
    if (m.notes && !/oil lot|created|batch|allocation/i.test(m.notes)) return m.notes;
    return undefined;
  };

  return (
    <div>
      <OilSectionHeader titleKey="recent.title" icon={Activity} />
      <ul className="my-oil-timeline">
        {groups.map((g) => (
          <li key={g.dayKey} className="my-oil-timeline__day">
            <span className="my-oil-timeline__label">{g.label}</span>
            {g.items.map((m) => {
              const action = movementActionKey(m.kind);
              const Icon = ACTION_ICON[action] ?? Activity;
              const packAbs = {
                tin16: Math.abs(m.packDelta.tin16),
                tin17: Math.abs(m.packDelta.tin17),
                bulkLitres: Math.abs(m.packDelta.bulkLitres),
                litres: Math.abs(m.litresDelta)};
              const detail = detailFor(m);
              const hasDelta = Math.abs(m.litresDelta) > 0.05;
              const positive = m.litresDelta > 0;
              const delta = hasDelta
                ? `${positive ? '+' : '−'}${formatOilNumber(Math.abs(m.litresDelta), i18n.language)} L`
                : null;
              return (
                <div key={m.id} className="my-oil-timeline__item">
                  <span className={`my-oil-timeline__badge my-oil-timeline__badge--${action}`} aria-hidden>
                    <Icon size={15} strokeWidth={1.7} />
                  </span>
                  <div className="my-oil-timeline__body">
                    <div className="my-oil-timeline__row">
                      <div className="my-oil-timeline__action">{t(`timeline.${action}`)}</div>
                      {delta ? (
                        <div
                          className={`my-oil-timeline__delta ${
                            positive ? 'is-plus' : 'is-minus'
                          }`}
                        >
                          {delta}
                        </div>
                      ) : null}
                    </div>
                    {packAbs.tin16 + packAbs.tin17 + packAbs.bulkLitres > 0.05 ? (
                      <div className="my-oil-timeline__detail">
                        {formatOilPack(packAbs, packLabels)}
                      </div>
                    ) : null}
                    {detail ? <div className="my-oil-timeline__detail">{detail}</div> : null}
                    {m.reversalOfMovementId ? (
                      <div className="my-oil-timeline__detail">{t('timeline.isUndo')}</div>
                    ) : undone.has(m.id) ? (
                      <div className="my-oil-timeline__detail">{t('timeline.wasUndone')}</div>
                    ) : onReverse && canReverseMovement(m) ? (
                      <button
                        type="button"
                        className="my-oil-linkish my-oil-timeline__undo"
                        disabled={busy}
                        onClick={() => onReverse(m)}
                      >
                        <Undo2 size={13} strokeWidth={1.8} aria-hidden />
                        {t('timeline.undo')}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </li>
        ))}
      </ul>
      {preview && onSeeAll ? (
        <button type="button" className="my-oil-linkish" onClick={onSeeAll}>
          {t('recent.seeAll')}
        </button>
      ) : null}
    </div>
  );
}
