import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Cylinder, Droplets, HandCoins, PackagePlus, Ruler } from 'lucide-react';
import Button from '../Common/Button';
import { formatOilNumber } from '../../myOil/formatOilPack';
import type { OilStockSummary } from '../../services/oilStockService';

type Props = {
  summary: OilStockSummary;
  busy: boolean;
  onGive: () => void;
  onSell: () => void;
  onHold: () => void;
  onFill: () => void;
  onCount: () => void;
};

/** Decorative cellar silhouette — subtle, non-competing. */
function CellarArt() {
  return (
    <svg className="my-oil-hero__art" viewBox="0 0 160 120" fill="none" aria-hidden>
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

/**
 * Everything in the cellar, then how much of it is already promised, then the packaging it
 * sits in. One screenful, no drill-in needed.
 */
export function OilStockHero({ summary, busy, onGive, onSell, onHold, onFill, onCount }: Props) {
  const { t, i18n } = useTranslation('myOil');
  const locale = i18n.language;
  const { onHand, held, available } = summary;

  const total = onHand.litres || 0;
  const heldLitres = Math.min(held.litres || 0, total);
  const freeLitres = Math.max(0, total - heldLitres);
  const freePct = total > 0 ? Math.round((freeLitres / total) * 100) : 0;

  const packs: { key: string; label: string; value: string; Icon: typeof Cylinder }[] = [
    {
      key: 'bulk',
      label: t('warehouse.packBulk'),
      value: `${formatOilNumber(onHand.bulkLitres, locale)} L`,
      Icon: Droplets,
    },
    { key: 'tin16', label: t('warehouse.pack16'), value: String(onHand.tin16), Icon: Cylinder },
    { key: 'tin17', label: t('warehouse.pack17'), value: String(onHand.tin17), Icon: Cylinder },
  ];

  return (
    <header className="my-oil-hero">
      <div className="my-oil-hero__top">
        <div className="my-oil-hero__main">
          <p className="my-oil-hero__eyebrow">{t('hero.onHandLabel')}</p>
          <p className="my-oil-hero__litres">
            {t('litres', { amount: formatOilNumber(total, locale) })}
          </p>
          <p className="my-oil-hero__pack">
            {t('hero.freeOfTotal', { amount: formatOilNumber(freeLitres, locale) })}
          </p>
        </div>
        <CellarArt />
      </div>

      <div className="my-oil-hero__bar">
        <div className="my-oil-meter" aria-hidden>
          <span className="my-oil-meter__avail" style={{ width: `${freePct}%` }} />
          <span className="my-oil-meter__held" style={{ width: `${100 - freePct}%` }} />
        </div>
        <div className="my-oil-hero__bar-legend">
          <span className="my-oil-hero__legend my-oil-hero__legend--free">
            {t('hero.available')} · {formatOilNumber(available.litres || 0, locale)} L
          </span>
          <span className="my-oil-hero__legend my-oil-hero__legend--held">
            <Bookmark size={12} strokeWidth={1.75} aria-hidden />
            {t('hero.holds')} · {formatOilNumber(heldLitres, locale)} L
          </span>
        </div>
      </div>

      <ul className="my-oil-packstrip">
        {packs.map(({ key, label, value, Icon }) => (
          <li key={key} className="my-oil-packstrip__item">
            <Icon size={16} strokeWidth={1.6} aria-hidden />
            <span className="my-oil-packstrip__label">{label}</span>
            <strong className="my-oil-packstrip__value">{value}</strong>
          </li>
        ))}
      </ul>

      <div className="my-oil-quick">
        <Button variant="primary" onClick={onGive} disabled={busy}>
          <Droplets size={16} strokeWidth={1.8} aria-hidden />
          {t('actions.give')}
        </Button>
        <Button variant="primary" onClick={onSell} disabled={busy}>
          <HandCoins size={16} strokeWidth={1.8} aria-hidden />
          {t('actions.sell')}
        </Button>
        <Button variant="secondary" onClick={onHold} disabled={busy}>
          <Bookmark size={16} strokeWidth={1.8} aria-hidden />
          {t('actions.hold')}
        </Button>
        <Button variant="secondary" onClick={onFill} disabled={busy}>
          <PackagePlus size={16} strokeWidth={1.8} aria-hidden />
          {t('actions.fillTins')}
        </Button>
      </div>

      <button type="button" className="my-oil-hero__minor" onClick={onCount} disabled={busy}>
        <Ruler size={14} strokeWidth={1.7} aria-hidden />
        {t('actions.count')}
      </button>
    </header>
  );
}
