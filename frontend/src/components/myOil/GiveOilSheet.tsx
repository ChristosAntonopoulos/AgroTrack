import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplets } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import SaleBuyerPicker from '../money/SaleBuyerPicker';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../../myOil/packInput';
import { formatOilNumber } from '../../myOil/formatOilPack';
import type { OilPack } from '../../services/oilStockService';

export type GiveOilSaveInput = {
  counterpartyName: string;
  requested: OilPackInput;
  isSale: boolean;
  amount?: number;
  alreadyDelivered: boolean;
  alreadyPaid: boolean;
  forHome: boolean;
};

type WhoMode = 'someone' | 'home' | 'unnamed';

type Props = {
  open: boolean;
  available?: OilPack;
  busy: boolean;
  onClose: () => void;
  onSave: (input: GiveOilSaveInput) => Promise<void>;
  /** Prefill who-mode (e.g. set-aside for home). */
  initialWho?: WhoMode;
};

export function GiveOilSheet({ open, available, busy, onClose, onSave, initialWho = 'someone' }: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const [whoMode, setWhoMode] = useState<WhoMode>(initialWho);
  const [name, setName] = useState('');
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const [takesNow, setTakesNow] = useState(false);
  const [isSale, setIsSale] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(true);
  const [amount, setAmount] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setWhoMode(initialWho);
      if (initialWho === 'home') {
        setIsSale(false);
        setTakesNow(false);
      }
    }
  }, [open, initialWho]);

  const totalLitres = packLitresOf(pack);
  const max = available;

  const bump = (key: keyof OilPackInput, delta: number) => {
    setPack((prev) => {
      const next = { ...prev };
      if (key === 'bulkLitres') {
        next.bulkLitres = Math.max(0, Math.round((prev.bulkLitres + delta) * 10) / 10);
      } else {
        next[key] = Math.max(0, prev[key] + delta);
      }
      return clampPackInput(next, max);
    });
  };

  const nameOk =
    whoMode === 'home' || whoMode === 'unnamed' || (whoMode === 'someone' && name.trim().length > 0);

  const canSave =
    nameOk &&
    totalLitres > 0.05 &&
    (!isSale || whoMode !== 'home') &&
    (!isSale || Number(amount) > 0);

  const resolvedName = useMemo(() => {
    if (whoMode === 'home') return t('give.homeName');
    if (whoMode === 'unnamed') return t('give.unnamed');
    return name.trim();
  }, [whoMode, name, t]);

  const requestClose = () => {
    if (!busy) onClose();
  };

  const submit = () => {
    setSaveError(null);
    void onSave({
      counterpartyName: resolvedName,
      requested: pack,
      isSale: whoMode === 'home' ? false : isSale,
      amount: isSale && whoMode !== 'home' ? Number(amount) : undefined,
      alreadyDelivered: takesNow,
      alreadyPaid: isSale ? alreadyPaid : false,
      forHome: whoMode === 'home',
    }).catch(() => setSaveError(t('error')));
  };

  return (
    <RightDrawer
      open={open}
      onClose={requestClose}
      size="md"
      title={t('give.title')}
      icon={<Droplets size={18} strokeWidth={1.75} aria-hidden />}
      closeDisabled={busy}
      closeLabel={t('common:close', { defaultValue: 'Κλείσιμο' })}
      footer={
        <>
          <Button variant="secondary" onClick={requestClose} disabled={busy}>
            {t('give.cancel')}
          </Button>
          <Button variant="primary" disabled={!canSave || busy} onClick={submit}>
            {busy ? t('give.saving') : t('give.save')}
          </Button>
        </>
      }
    >
      <div className="my-oil-give">
        <p className="my-oil-give__step">{t('give.who')}</p>
        <div className="my-oil-toggle">
          <button
            type="button"
            className={whoMode === 'someone' ? 'is-on' : ''}
            onClick={() => setWhoMode('someone')}
          >
            {t('give.forSomeone')}
          </button>
          <button
            type="button"
            className={whoMode === 'unnamed' ? 'is-on' : ''}
            onClick={() => setWhoMode('unnamed')}
          >
            {t('give.noName')}
          </button>
          <button
            type="button"
            className={whoMode === 'home' ? 'is-on' : ''}
            onClick={() => {
              setWhoMode('home');
              setIsSale(false);
            }}
          >
            {t('give.forHome')}
          </button>
        </div>
        {whoMode === 'someone' ? (
          <div className="my-oil-field">
            <SaleBuyerPicker value={name} onChange={setName} compact />
          </div>
        ) : null}

        <p className="my-oil-give__step">{t('give.what')}</p>
        <div className="my-oil-stepper">
          {(
            [
              ['tin16', t('give.tin16')],
              ['tin17', t('give.tin17')],
              ['bulkLitres', t('give.bulk')],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="my-oil-stepper__row">
              <span>{label}</span>
              <div className="my-oil-stepper__controls">
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => bump(key, -1)}
                  disabled={pack[key] <= 0}
                >
                  −
                </button>
                <strong>{pack[key] || 0}</strong>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => bump(key, 1)}
                  disabled={
                    max != null &&
                    (key === 'bulkLitres'
                      ? pack.bulkLitres >= max.bulkLitres
                      : pack[key] >= max[key])
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        {totalLitres > 0.05 ? (
          <p className="my-oil-give__total">
            {t('give.totalLitres', { amount: formatOilNumber(totalLitres, i18n.language) })}
          </p>
        ) : null}

        <p className="my-oil-give__step">{t('give.when')}</p>
        <div className="my-oil-toggle">
          <button type="button" className={!takesNow ? 'is-on' : ''} onClick={() => setTakesNow(false)}>
            {t('give.later')}
          </button>
          <button type="button" className={takesNow ? 'is-on' : ''} onClick={() => setTakesNow(true)}>
            {t('give.now')}
          </button>
        </div>

        {whoMode !== 'home' ? (
          <>
            <p className="my-oil-give__step">{t('give.isSale')}</p>
            <div className="my-oil-toggle">
              <button type="button" className={!isSale ? 'is-on' : ''} onClick={() => setIsSale(false)}>
                {t('give.no')}
              </button>
              <button type="button" className={isSale ? 'is-on' : ''} onClick={() => setIsSale(true)}>
                {t('give.yes')}
              </button>
            </div>
            {isSale ? (
              <>
                <div className="my-oil-field">
                  <label htmlFor="give-oil-eur">{t('give.amount')}</label>
                  <input
                    id="give-oil-eur"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                  />
                </div>
                <label className="my-oil-check">
                  <input
                    type="checkbox"
                    checked={alreadyPaid}
                    onChange={(e) => setAlreadyPaid(e.target.checked)}
                  />
                  {t('give.alreadyPaid')}
                </label>
              </>
            ) : null}
          </>
        ) : null}

        {saveError ? <p className="my-oil-give__error">{saveError}</p> : null}
      </div>
    </RightDrawer>
  );
}
