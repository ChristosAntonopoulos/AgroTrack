import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bookmark,
  Cylinder,
  Droplets,
  HandCoins,
  Package,
  PackagePlus,
  Plus,
  Ruler,
} from 'lucide-react';
import Button from '../Common/Button';
import { formatOilNumber } from '../../myOil/formatOilPack';
import type { OilStockSummary } from '../../services/oilStockService';

type Props = {
  summary: OilStockSummary;
  busy: boolean;
  onAdd: () => void;
  onGive: () => void;
  onSell: () => void;
  onHold: () => void;
  onFill: () => void;
  onCount: () => void;
};

type CycleSlice = { key: string; litres: number; color: string };

/** Ring of how the oil is packed. Starts at the top and walks clockwise. */
function CycleRing({ slices, label }: { slices: CycleSlice[]; label: string }) {
  const size = 156;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const active = slices.filter((slice) => slice.litres > 0.05);
  const total = active.reduce((sum, slice) => sum + slice.litres, 0);
  const gap = active.length > 1 ? 5 : 0;
  let offset = 0;

  return (
    <svg className="my-oil-cycle__svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--my-oil-border-soft)"
        strokeWidth={stroke}
      />
      <g transform={`rotate(-90 ${center} ${center})`}>
        {active.map((slice) => {
          const full = total > 0 ? (slice.litres / total) * circumference : 0;
          const length = Math.max(full - gap, full > 0 ? 1 : 0);
          const arc = (
            <circle
              key={slice.key}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={stroke}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += full;
          return arc;
        })}
      </g>
    </svg>
  );
}

/**
 * Everything in the cellar, then how much of it is already promised, then the packaging it
 * sits in. One screenful, no drill-in needed.
 */
export function OilStockHero({
  summary,
  busy,
  onAdd,
  onGive,
  onSell,
  onHold,
  onFill,
  onCount,
}: Props) {
  const { t, i18n } = useTranslation('myOil');
  const locale = i18n.language;
  const { onHand, held, available } = summary;

  const total = onHand.litres || 0;
  const heldLitres = Math.min(held.litres || 0, total);
  const freeLitres = Math.max(0, total - heldLitres);
  const freePct = total > 0 ? Math.round((freeLitres / total) * 100) : 0;

  const tin16Litres = Math.max(0, onHand.tin16) * 16;
  const tin17Litres = Math.max(0, onHand.tin17) * 17;
  const bulkLitres = Math.max(0, onHand.bulkLitres);
  const packed = bulkLitres + tin16Litres + tin17Litres;
  const pctOf = (litres: number) => {
    if (packed <= 0.05 || litres <= 0.05) return '0%';
    const raw = (litres / packed) * 100;
    if (raw < 1) return '<1%';
    return `${Math.round(raw)}%`;
  };

  const slices: CycleSlice[] = [
    { key: 'bulk', litres: bulkLitres, color: 'var(--olive-primary)' },
    { key: 'tin16', litres: tin16Litres, color: 'var(--oleachron-gold, #b48a47)' },
    { key: 'tin17', litres: tin17Litres, color: 'var(--status-warning, #c47a3a)' },
  ];

  const rows: {
    key: string;
    label: string;
    value: string;
    pct: string;
    Icon: typeof Droplets;
    swatch: string;
  }[] = [
    {
      key: 'bulk',
      label: t('warehouse.packBulk'),
      value: `${formatOilNumber(bulkLitres, locale)} L`,
      pct: pctOf(bulkLitres),
      Icon: Droplets,
      swatch: 'var(--olive-primary)',
    },
    {
      key: 'tin16',
      label: t('warehouse.pack16'),
      value: t('hero.tinCount', { count: onHand.tin16, litres: formatOilNumber(tin16Litres, locale) }),
      pct: pctOf(tin16Litres),
      Icon: Cylinder,
      swatch: 'var(--oleachron-gold, #b48a47)',
    },
    {
      key: 'tin17',
      label: t('warehouse.pack17'),
      value: t('hero.tinCount', { count: onHand.tin17, litres: formatOilNumber(tin17Litres, locale) }),
      pct: pctOf(tin17Litres),
      Icon: Package,
      swatch: 'var(--status-warning, #c47a3a)',
    },
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
      </div>

      <div className="my-oil-cycle">
        <div className="my-oil-cycle__ring">
          <CycleRing slices={slices} label={t('hero.cycle')} />
          <div className="my-oil-cycle__center">
            <Droplets size={18} strokeWidth={1.75} aria-hidden />
            <strong>{freePct}%</strong>
            <span>{t('hero.available')}</span>
          </div>
        </div>
        <ul className="my-oil-cycle__legend">
          {rows.map(({ key, label, value, pct, Icon, swatch }) => (
            <li key={key}>
              <span className="my-oil-cycle__icon" style={{ color: swatch }}>
                <Icon size={16} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="my-oil-cycle__name">{label}</span>
              <strong>{value}</strong>
              <em>{pct}</em>
            </li>
          ))}
          <li className="my-oil-cycle__split">
            <span className="my-oil-cycle__icon my-oil-cycle__icon--free">
              <Droplets size={16} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="my-oil-cycle__name">{t('hero.available')}</span>
            <strong>{formatOilNumber(available.litres || 0, locale)} L</strong>
            <em>{freePct}%</em>
          </li>
          <li>
            <span className="my-oil-cycle__icon my-oil-cycle__icon--held">
              <Bookmark size={16} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="my-oil-cycle__name">{t('hero.holds')}</span>
            <strong>{formatOilNumber(heldLitres, locale)} L</strong>
            <em>{total > 0 ? 100 - freePct : 0}%</em>
          </li>
        </ul>
      </div>

      <div className="my-oil-quick">
        {(
          [
            { key: 'add', label: t('actions.add'), Icon: Plus, accent: 'add', onClick: onAdd },
            { key: 'give', label: t('actions.give'), Icon: Droplets, accent: 'give', onClick: onGive },
            { key: 'sell', label: t('actions.sell'), Icon: HandCoins, accent: 'sell', onClick: onSell },
            { key: 'hold', label: t('actions.hold'), Icon: Bookmark, accent: 'hold', onClick: onHold },
            { key: 'fill', label: t('actions.fillTins'), Icon: PackagePlus, accent: 'fill', onClick: onFill },
          ] as const
        ).map(({ key, label, Icon, accent, onClick }) => (
          <Button
            key={key}
            variant="secondary"
            className="my-oil-verb"
            onClick={onClick}
            disabled={busy}
          >
            <span className={`my-oil-verb__icon my-oil-verb__icon--${accent}`}>
              <Icon size={16} strokeWidth={1.8} aria-hidden />
            </span>
            {label}
          </Button>
        ))}
      </div>

      <button type="button" className="my-oil-hero__minor" onClick={onCount} disabled={busy}>
        <Ruler size={14} strokeWidth={1.7} aria-hidden />
        {t('actions.count')}
      </button>
    </header>
  );
}
