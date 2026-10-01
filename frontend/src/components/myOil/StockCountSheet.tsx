import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ruler } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { formatOilNumber } from '../../myOil/formatOilPack';
import {
  deltaLitres,
  isEmptyDelta,
  stockCountDeltas,
  type PackDelta,
} from '../../myOil/stockCount';
import type { OilPack } from '../../services/oilStockService';

type Props = {
  open: boolean;
  /** What the books say is in the cellar right now. */
  expected: OilPack;
  busy: boolean;
  onClose: () => void;
  onSave: (actual: PackDelta, reason: string) => Promise<void>;
};

/**
 * The farmer walks the cellar and types what is actually there. The difference against the books
 * becomes one correction, with their own words as the reason.
 */
export function StockCountSheet({ open, expected, busy, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const locale = i18n.language;
  const [tin16, setTin16] = useState('');
  const [tin17, setTin17] = useState('');
  const [bulk, setBulk] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setTin16(String(expected.tin16));
    setTin17(String(expected.tin17));
    setBulk(String(expected.bulkLitres));
    setReason('');
  }, [open, expected.tin16, expected.tin17, expected.bulkLitres]);

  const actual: PackDelta = {
    tin16: Math.max(0, Math.round(Number(tin16) || 0)),
    tin17: Math.max(0, Math.round(Number(tin17) || 0)),
    bulkLitres: Math.max(0, Number(bulk) || 0),
  };
  const { add, remove } = stockCountDeltas(expected, actual);
  const changed = !isEmptyDelta(add) || !isEmptyDelta(remove);
  const net = deltaLitres(add) - deltaLitres(remove);

  const rows: {
    key: keyof PackDelta;
    label: string;
    value: string;
    set: (v: string) => void;
    /** What the books say, ready to drop back into the field. */
    book: string;
    bookLabel: string;
    step?: string;
  }[] = [
    {
      key: 'tin16',
      label: t('sheet.tin16'),
      value: tin16,
      set: setTin16,
      book: String(expected.tin16),
      bookLabel: `${t('warehouse.pack16')} · ${expected.tin16}`,
    },
    {
      key: 'tin17',
      label: t('sheet.tin17'),
      value: tin17,
      set: setTin17,
      book: String(expected.tin17),
      bookLabel: `${t('warehouse.pack17')} · ${expected.tin17}`,
    },
    {
      key: 'bulkLitres',
      label: t('sheet.bulk'),
      value: bulk,
      set: setBulk,
      book: String(expected.bulkLitres),
      bookLabel: `${t('warehouse.packBulk')} · ${formatOilNumber(expected.bulkLitres, locale)} L`,
      step: '0.1',
    },
  ];

  return (
    <RightDrawer
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      size="md"
      title={t('count.title')}
      subtitle={t('count.subtitle')}
      icon={<Ruler size={18} strokeWidth={1.75} aria-hidden />}
      closeDisabled={busy}
      closeLabel={t('common:close', { defaultValue: 'Κλείσιμο' })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('sheet.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={busy || !changed}
            onClick={() => void onSave(actual, reason.trim())}
          >
            {t('count.save')}
          </Button>
        </>
      }
    >
      <div className="my-oil-flow">
        <p className="my-oil-flow__step">{t('count.actual')}</p>
        {rows.map((row) => (
          <div className="my-oil-field" key={row.key}>
            <label htmlFor={`count-${row.key}`}>{row.label}</label>
            <input
              id={`count-${row.key}`}
              type="number"
              min={0}
              step={row.step}
              inputMode="decimal"
              value={row.value}
              onChange={(e) => row.set(e.target.value)}
              autoFocus={row.key === 'tin16'}
            />
          </div>
        ))}

        {/* The books stay a quiet reference; tapping one puts that number back in the field. */}
        <p className="my-oil-flow__step">{t('count.expected')}</p>
        <div className="my-oil-chips">
          {rows.map((row) => (
            <button key={row.key} type="button" onClick={() => row.set(row.book)}>
              {row.bookLabel}
            </button>
          ))}
        </div>

        <p className={`my-oil-flow__step${net < -0.05 ? ' is-warn' : ''}`}>
          {!changed
            ? t('count.matches')
            : net >= 0
              ? t('count.surplus', { amount: formatOilNumber(Math.abs(net), locale) })
              : t('count.shortfall', { amount: formatOilNumber(Math.abs(net), locale) })}
        </p>

        {changed ? (
          <div className="my-oil-field">
            <label htmlFor="count-reason">{t('count.reason')}</label>
            <input
              id="count-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('count.reasonPlaceholder')}
            />
          </div>
        ) : null}
      </div>
    </RightDrawer>
  );
}
