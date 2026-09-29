import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import { formatHeroStock, formatOilNumber, formatOilPack } from '../../myOil/formatOilPack';
import {
  isHouseholdCommitment,
  sumCommitmentPack,
  sumHouseholdPack,
  tinCount,
  visibleHouseholdCommitments,
} from '../../myOil/commitmentCopy';
import type { OilCommitment, OilStockSummary } from '../../services/oilStockService';
import { Home, Bookmark, Warehouse } from 'lucide-react';

type Props = {
  summary: OilStockSummary;
  closed?: OilCommitment[];
  busy: boolean;
  onGive: () => void;
  onFill: () => void;
  onCorrect: () => void;
  onHomeUse: () => void;
  onLoss: () => void;
};

/** Decorative cellar silhouette — subtle, non-competing. */
function CellarArt() {
  return (
    <svg
      className="my-oil-hero__art"
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden
    >
      <rect x="18" y="28" width="34" height="52" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <rect x="58" y="18" width="38" height="62" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <rect x="102" y="34" width="34" height="46" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
      <path d="M20 92h114" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path d="M20 100h114" stroke="currentColor" strokeWidth="1.25" opacity="0.22" />
      <ellipse cx="76" cy="48" rx="8" ry="11" stroke="currentColor" strokeWidth="1.25" opacity="0.45" />
      <path d="M76 37c6 4 6 14 0 22" stroke="currentColor" strokeWidth="1.25" opacity="0.35" />
    </svg>
  );
}

export function OilStockHero({
  summary,
  closed = [],
  busy,
  onGive,
  onFill,
  onCorrect,
  onHomeUse,
  onLoss,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const physical = summary.physical;
  const available = summary.available;
  const locale = i18n.language;
  const homeHeld = sumHouseholdPack(visibleHouseholdCommitments(summary.openCommitments, closed));
  const thirdParty = summary.openCommitments.filter((c) => !isHouseholdCommitment(c));
  const thirdHeld = sumCommitmentPack(thirdParty);
  const held = thirdParty.filter((c) => c.derivedStatus === 'reserved').length;
  const pending = thirdParty.filter((c) => c.derivedStatus === 'pending_delivery').length;

  const heroLine = formatHeroStock(physical, locale, {
    tins: (count) => t('hero.tins', { count }),
    bulkPlus: (amount) => t('hero.bulkPlus', { amount }),
    bulkOnly: (amount) => t('hero.bulkOnly', { amount }),
    empty: t('hero.empty'),
  });

  const warehouseLine = formatHeroStock(available, locale, {
    tins: (count) => t('hero.tins', { count }),
    bulkPlus: (amount) => t('hero.bulkPlus', { amount }),
    bulkOnly: (amount) => t('hero.bulkOnly', { amount }),
    empty: t('hero.zero'),
  });

  const hasHome = tinCount(homeHeld) > 0 || homeHeld.bulkLitres > 0.05;
  const homeLine = hasHome
    ? formatOilPack(homeHeld, {
        tin: (count, size) => t('tin', { count, size }),
        bulk: (amount) => t('bulk', { amount: formatOilNumber(amount, locale) }),
        litres: (amount) => t('litres', { amount: formatOilNumber(amount, locale) }),
      })
    : t('hero.householdEmpty');

  const hasThird = tinCount(thirdHeld) > 0 || thirdHeld.bulkLitres > 0.05;
  const othersLine = !hasThird
    ? t('hero.holdsEmpty')
    : held + pending > 0
      ? t('hero.forOthersDetail', { held, pending })
      : formatOilPack(thirdHeld, {
          tin: (count, size) => t('tin', { count, size }),
          bulk: (amount) => t('bulk', { amount: formatOilNumber(amount, locale) }),
          litres: (amount) => t('litres', { amount: formatOilNumber(amount, locale) }),
        });

  return (
    <header className="my-oil-hero">
      <div className="my-oil-hero__top">
        <div className="my-oil-hero__main">
          <p className="my-oil-hero__eyebrow">{t('hero.eyebrow')}</p>
          <p className="my-oil-hero__litres">
            {t('hero.approxTotal', {
              amount: formatOilNumber(physical.litres || 0, locale),
            })}
          </p>
          <p className="my-oil-hero__pack">{heroLine}</p>
          <div className="my-oil-hero__chips">
            {physical.tin16 > 0 ? (
              <span className="my-oil-chip">{t('hero.chip16', { count: physical.tin16 })}</span>
            ) : null}
            {physical.tin17 > 0 ? (
              <span className="my-oil-chip">{t('hero.chip17', { count: physical.tin17 })}</span>
            ) : null}
            {physical.bulkLitres > 0.05 ? (
              <span className="my-oil-chip">
                {t('hero.chipBulk', {
                  amount: formatOilNumber(physical.bulkLitres, locale),
                })}
              </span>
            ) : null}
          </div>
        </div>
        <CellarArt />
      </div>

      <div className="my-oil-hero__split my-oil-hero__split--3">
        <div className="my-oil-hero__block my-oil-hero__block--warehouse">
          <span className="my-oil-hero__split-label">
            <Warehouse size={12} strokeWidth={1.75} aria-hidden />
            {t('hero.warehouse')}
          </span>
          <div className="my-oil-hero__split-value">{warehouseLine}</div>
        </div>
        <div className={`my-oil-hero__block my-oil-hero__block--home${hasHome ? ' is-on' : ''}`}>
          <span className="my-oil-hero__split-label">
            <Home size={12} strokeWidth={1.75} aria-hidden />
            {t('hero.household')}
          </span>
          <div className="my-oil-hero__split-value">{homeLine}</div>
        </div>
        <div className="my-oil-hero__block">
          <span className="my-oil-hero__split-label">
            <Bookmark size={12} strokeWidth={1.75} aria-hidden />
            {t('hero.holds')}
          </span>
          <div className="my-oil-hero__split-value">{othersLine}</div>
        </div>
      </div>

      <div className="my-oil-quick">
        <Button variant="primary" onClick={onGive} disabled={busy}>
          {t('actions.give')}
        </Button>
        <Button variant="secondary" onClick={onFill} disabled={busy}>
          {t('actions.fillTins')}
        </Button>
        <div className="my-oil-quick__more" ref={menuRef}>
          <Button
            variant="ghost"
            aria-label={t('actions.more')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ···
          </Button>
          {menuOpen ? (
            <div className="my-oil-quick__menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onCorrect();
                }}
              >
                {t('actions.correct')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onHomeUse();
                }}
              >
                {t('actions.homeUse')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onLoss();
                }}
              >
                {t('actions.loss')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
