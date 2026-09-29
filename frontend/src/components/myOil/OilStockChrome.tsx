import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Bookmark, Warehouse, Clock, Truck } from 'lucide-react';
import { formatHeroStock, formatOilPack } from '../../myOil/formatOilPack';
import {
  isHouseholdCommitment,
  movementActionKey,
  sumHouseholdPack,
  tinCount,
  visibleHouseholdCommitments,
} from '../../myOil/commitmentCopy';
import type { OilCommitment, OilStockSummary, StockMovement } from '../../services/oilStockService';

type PackLabels = {
  tin: (count: number, size: number) => string;
  bulk: (amount: number) => string;
  litres: (amount: number) => string;
};

type Props = {
  summary: OilStockSummary;
  closed?: OilCommitment[];
  waiting: OilCommitment[];
  latestMove?: StockMovement | null;
  packLabels: PackLabels;
  formatDate: (iso: string) => string;
};

export function OilStockActivityBar({
  summary,
  closed = [],
  waiting,
  latestMove,
  packLabels,
  formatDate,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  const locale = i18n.language;
  const available = summary.available;
  const homeHeld = sumHouseholdPack(visibleHouseholdCommitments(summary.openCommitments, closed));
  const thirdParty = waiting.filter((c) => !isHouseholdCommitment(c));
  const held = thirdParty.filter((c) => c.derivedStatus === 'reserved').length;
  const pending = thirdParty.filter((c) => c.derivedStatus === 'pending_delivery').length;

  const warehouseLine = formatHeroStock(available, locale, {
    tins: (count) => t('hero.tins', { count }),
    bulkPlus: (amount) => t('hero.bulkPlus', { amount }),
    bulkOnly: (amount) => t('hero.bulkOnly', { amount }),
    empty: t('hero.zero'),
  });

  const hasHome = tinCount(homeHeld) > 0 || homeHeld.bulkLitres > 0.05;
  const homeLine = hasHome
    ? formatOilPack(homeHeld, packLabels)
    : t('activity.householdEmpty');

  const othersLine =
    held === 0 && pending === 0
      ? t('activity.noneHeld')
      : t('activity.heldPending', { held, pending });

  let lastMove = t('activity.lastMoveEmpty');
  if (latestMove) {
    const action = movementActionKey(latestMove.kind);
    lastMove = `${t(`timeline.${action}`)} · ${formatDate(latestMove.occurredOn)}`;
  }

  const next =
    thirdParty.length > 0
      ? t('activity.nextPerson', {
          name: thirdParty[0].counterpartyName,
          pack: formatOilPack(thirdParty[0].remaining, packLabels),
        })
      : t('activity.nextNone');

  const pills = [
    { icon: Warehouse, label: t('activity.warehouse'), value: warehouseLine },
    { icon: Home, label: t('activity.household'), value: homeLine },
    { icon: Bookmark, label: t('activity.holds'), value: othersLine },
    {
      icon: thirdParty.length ? Truck : Clock,
      label: t('activity.nextAction'),
      value: next || lastMove,
    },
  ];

  return (
    <section className="my-oil-activity" aria-label={t('activity.title')}>
      <p className="my-oil-activity__title">{t('activity.title')}</p>
      <div className="my-oil-activity__row">
        {pills.map((p) => (
          <div key={p.label} className="my-oil-activity__pill">
            <p.icon size={16} strokeWidth={1.75} aria-hidden className="my-oil-activity__icon" />
            <div>
              <span className="my-oil-activity__label">{p.label}</span>
              <strong className="my-oil-activity__value">{p.value}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function OilStockPageHeader({ season }: { season: string }) {
  const { t } = useTranslation('myOil');
  return (
    <header className="my-oil-header">
      <div>
        <h1 className="my-oil-title">{t('title')}</h1>
      </div>
      <div className="my-oil-season-badge">
        <span className="my-oil-season">{t('seasonLabel', { season })}</span>
      </div>
    </header>
  );
}

export function OilSectionHeader({
  titleKey,
  introKey,
  icon: Icon,
}: {
  titleKey: string;
  introKey?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean }>;
}) {
  const { t } = useTranslation('myOil');
  return (
    <div className="my-oil-section-head">
      <h2 className="my-oil-panel__title">
        {Icon ? <Icon size={14} strokeWidth={1.75} aria-hidden className="my-oil-section-head__icon" /> : null}
        {t(titleKey)}
      </h2>
      {introKey ? <p className="my-oil-section-intro">{t(introKey)}</p> : null}
    </div>
  );
}
