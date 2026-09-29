import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Cylinder, Droplets, Home, Warehouse } from 'lucide-react';
import Button from '../Common/Button';
import { formatOilPack, formatOilNumber, formatHeroStock } from '../../myOil/formatOilPack';
import {
  commitmentStoryKey,
  deliverButtonKey,
  isHouseholdCommitment,
  sumCommitmentPack,
  tinCount,
} from '../../myOil/commitmentCopy';
import { OilSectionHeader } from './OilStockChrome';
import type { OilCommitment, OilPack, OilStockSummary } from '../../services/oilStockService';

type PackLabels = {
  tin: (count: number, size: number) => string;
  bulk: (amount: number) => string;
  litres: (amount: number) => string;
};

type PendingProps = {
  waiting: OilCommitment[];
  busy: boolean;
  packLabels: PackLabels;
  onDeliver: (c: OilCommitment) => void;
  onDetails: (c: OilCommitment) => void;
  formatDate: (iso: string) => string;
};

export function OilPendingSection({
  waiting,
  busy,
  packLabels,
  onDeliver,
  onDetails,
  formatDate,
}: PendingProps) {
  const { t } = useTranslation('myOil');

  const storyFor = (c: OilCommitment) => {
    const key = commitmentStoryKey(c);
    if (key === 'heldForDate' && c.promisedFor) {
      return t('story.heldForDate', { date: formatDate(c.promisedFor) });
    }
    if (key === 'heldForSomeone') {
      return t('story.heldForSomeone', { name: c.counterpartyName });
    }
    return t(`story.${key}`);
  };

  return (
    <section className={`my-oil-panel ${waiting.length ? 'my-oil-panel--action' : 'my-oil-panel--calm'}`}>
      <OilSectionHeader titleKey="needsNow.title" />
      {waiting.length === 0 ? (
        <div className="my-oil-empty my-oil-empty--visual">
          <CheckCircle2 size={28} strokeWidth={1.5} className="my-oil-empty__icon" aria-hidden />
          <p className="my-oil-empty__title">{t('needsNow.emptyTitle')}</p>
        </div>
      ) : (
        <ul className="my-oil-waiting">
          {waiting.slice(0, 3).map((c) => (
            <li key={c.id} className="my-oil-waiting__item">
              <div className="my-oil-waiting__name">{c.counterpartyName}</div>
              <div className="my-oil-waiting__pack">{formatOilPack(c.remaining, packLabels)}</div>
              <p className="my-oil-waiting__story">{storyFor(c)}</p>
              {c.promisedFor ? (
                <p className="my-oil-waiting__story">
                  {t('needsNow.deliverBy', { date: formatDate(c.promisedFor) })}
                </p>
              ) : null}
              <div className="my-oil-waiting__actions">
                <Button variant="primary" size="sm" disabled={busy} onClick={() => onDeliver(c)}>
                  {t(deliverButtonKey(c))}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDetails(c)}>
                  {c.isSale ? t('needsNow.details') : t('needsNow.change')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type InvProps = {
  summary: OilStockSummary;
  onSelectPack: (kind: 'tin16' | 'tin17' | 'bulk') => void;
};

function Meter({ free, held, total }: { free: number; held: number; total: number }) {
  if (total <= 0) return null;
  const freePct = Math.min(100, Math.round((free / total) * 100));
  const heldPct = Math.min(100 - freePct, Math.round((held / total) * 100));
  return (
    <div className="my-oil-meter" aria-hidden>
      <span className="my-oil-meter__avail" style={{ width: `${freePct}%` }} />
      <span className="my-oil-meter__held" style={{ width: `${heldPct}%` }} />
    </div>
  );
}

/** Remaining free stock in the warehouse — not household set-aside. */
export function OilInventorySummary({ summary, onSelectPack }: InvProps) {
  const { t, i18n } = useTranslation('myOil');
  const locale = i18n.language;
  const { physical, available } = summary;
  const held16 = Math.max(0, physical.tin16 - available.tin16);
  const held17 = Math.max(0, physical.tin17 - available.tin17);
  const heldBulk = Math.max(0, Math.round((physical.bulkLitres - available.bulkLitres) * 10) / 10);

  const warehouseLine = formatHeroStock(available, locale, {
    tins: (count) => t('hero.tins', { count }),
    bulkPlus: (amount) => t('hero.bulkPlus', { amount }),
    bulkOnly: (amount) => t('hero.bulkOnly', { amount }),
    empty: t('hero.zero'),
  });

  const cards: {
    key: 'tin16' | 'tin17' | 'bulk';
    label: string;
    value: string;
    meta: string;
    Icon: typeof Cylinder;
    free: number;
    held: number;
    total: number;
    show: boolean;
  }[] = [
    {
      key: 'tin16',
      label: t('warehouse.pack16'),
      value: String(available.tin16),
      meta: held16 > 0 ? t('warehouse.heldCount', { count: held16 }) : t('warehouse.free'),
      Icon: Cylinder,
      free: available.tin16,
      held: held16,
      total: physical.tin16,
      show: physical.tin16 > 0 || available.tin16 > 0,
    },
    {
      key: 'tin17',
      label: t('warehouse.pack17'),
      value: String(available.tin17),
      meta: held17 > 0 ? t('warehouse.heldCount', { count: held17 }) : t('warehouse.free'),
      Icon: Cylinder,
      free: available.tin17,
      held: held17,
      total: physical.tin17,
      show: physical.tin17 > 0 || available.tin17 > 0,
    },
    {
      key: 'bulk',
      label: t('warehouse.packBulk'),
      value: `${formatOilNumber(available.bulkLitres, locale)} L`,
      meta:
        heldBulk > 0.05
          ? t('warehouse.heldLitres', { amount: formatOilNumber(heldBulk, locale) })
          : t('warehouse.free'),
      Icon: Droplets,
      free: available.bulkLitres,
      held: heldBulk,
      total: physical.bulkLitres,
      show: physical.bulkLitres > 0.05 || available.bulkLitres > 0.05,
    },
  ];

  return (
    <section className="my-oil-panel my-oil-panel--warehouse">
      <OilSectionHeader titleKey="warehouse.title" icon={Warehouse} />
      <div className="my-oil-household-banner">
        <strong className="my-oil-household-banner__qty">{warehouseLine}</strong>
        <span className="my-oil-household-banner__note">{t('warehouse.readyNote')}</span>
      </div>
      <div className="my-oil-inv">
        {cards
          .filter((c) => c.show)
          .map((c) => (
            <button
              key={c.key}
              type="button"
              className="my-oil-inv-card"
              onClick={() => onSelectPack(c.key)}
            >
              <span className="my-oil-inv-card__icon" aria-hidden>
                <c.Icon size={18} strokeWidth={1.6} />
              </span>
              <span className="my-oil-inv-card__label">{c.label}</span>
              <span className="my-oil-inv-card__value">{c.value}</span>
              <span className="my-oil-inv-card__meta">{c.meta}</span>
              <Meter free={c.free} held={c.held} total={c.total} />
            </button>
          ))}
      </div>
    </section>
  );
}

type HouseholdProps = {
  summary: OilStockSummary;
  packLabels: PackLabels;
  onSetAside: () => void;
  onOpenHolds: () => void;
};

/** Only oil explicitly set aside for the house — not the whole warehouse. */
export function OilHouseholdAside({ summary, packLabels, onSetAside, onOpenHolds }: HouseholdProps) {
  const { t, i18n } = useTranslation('myOil');
  const locale = i18n.language;
  const homeItems = summary.openCommitments.filter(isHouseholdCommitment);
  const homeHeld = sumCommitmentPack(homeItems);
  const hasHome = tinCount(homeHeld) > 0 || homeHeld.bulkLitres > 0.05;

  return (
    <section className="my-oil-panel my-oil-panel--household">
      <OilSectionHeader titleKey="household.title" icon={Home} />
      {hasHome ? (
        <>
          <div className="my-oil-household-banner">
            <strong className="my-oil-household-banner__qty">
              {formatOilPack(homeHeld, packLabels)}
            </strong>
            <span className="my-oil-household-banner__note">{t('household.setAsideNote')}</span>
          </div>
          <ul className="my-oil-household-bits">
            {homeHeld.tin16 > 0 ? (
              <li>
                <span>{t('warehouse.pack16')}</span>
                <strong>{homeHeld.tin16}</strong>
              </li>
            ) : null}
            {homeHeld.tin17 > 0 ? (
              <li>
                <span>{t('warehouse.pack17')}</span>
                <strong>{homeHeld.tin17}</strong>
              </li>
            ) : null}
            {homeHeld.bulkLitres > 0.05 ? (
              <li>
                <span>{t('warehouse.packBulk')}</span>
                <strong>{formatOilNumber(homeHeld.bulkLitres, locale)} L</strong>
              </li>
            ) : null}
          </ul>
          <button type="button" className="my-oil-linkish" onClick={onOpenHolds}>
            {t('household.manage')}
          </button>
        </>
      ) : (
        <div className="my-oil-empty">
          <p className="my-oil-empty__body">{t('household.empty')}</p>
          <div style={{ marginTop: '0.75rem' }}>
            <Button variant="secondary" size="sm" onClick={onSetAside}>
              {t('household.setAsideCta')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

type OthersSummaryProps = {
  summary: OilStockSummary;
  packLabels: PackLabels;
  onSeeAll: () => void;
  onOpen: (c: OilCommitment) => void;
  formatDate: (iso: string) => string;
};

export function OilForOthersSummary({
  summary,
  packLabels,
  onSeeAll,
  onOpen,
  formatDate,
}: OthersSummaryProps) {
  const { t } = useTranslation('myOil');
  const waiting = summary.openCommitments.filter((c) => !isHouseholdCommitment(c));
  const held = waiting.filter((c) => c.derivedStatus === 'reserved').length;
  const pending = waiting.filter((c) => c.derivedStatus === 'pending_delivery').length;

  return (
    <section className="my-oil-panel">
      <OilSectionHeader titleKey="forOthersSummary.title" />
      {waiting.length === 0 ? (
        <div className="my-oil-empty">
          <p className="my-oil-empty__body">{t('forOthersSummary.empty')}</p>
        </div>
      ) : (
        <>
          <div className="my-oil-hero__chips" style={{ marginBottom: '0.75rem' }}>
            <span className="my-oil-chip">{t('forOthersSummary.held', { count: held })}</span>
            <span className="my-oil-chip">{t('forOthersSummary.pending', { count: pending })}</span>
          </div>
          <ul className="my-oil-waiting">
            {waiting.slice(0, 2).map((c) => (
              <li key={c.id} className="my-oil-waiting__item">
                <button type="button" className="my-oil-linkish" onClick={() => onOpen(c)}>
                  {c.counterpartyName} — {formatOilPack(c.remaining, packLabels)}
                </button>
                {c.promisedFor ? (
                  <span className="my-oil-waiting__story">{formatDate(c.promisedFor)}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <button type="button" className="my-oil-linkish" onClick={onSeeAll}>
            {t('forOthersSummary.seeAll')}
          </button>
        </>
      )}
    </section>
  );
}

export function packHasType(pack: OilPack, kind: 'tin16' | 'tin17' | 'bulk'): boolean {
  if (kind === 'tin16') return pack.tin16 > 0;
  if (kind === 'tin17') return pack.tin17 > 0;
  return pack.bulkLitres > 0.05;
}
