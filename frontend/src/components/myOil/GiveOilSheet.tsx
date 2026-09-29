import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Droplets, HandCoins, Minus, Plus } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
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
type Intent = 'hold' | 'give' | 'sell';

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
  const [intent, setIntent] = useState<Intent>('hold');
  const [sellTaken, setSellTaken] = useState(true);
  const [alreadyPaid, setAlreadyPaid] = useState(true);
  const [amount, setAmount] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setWhoMode(initialWho);
    setName('');
    setPack(emptyOilPackInput());
    setIntent('hold');
    setSellTaken(true);
    setAlreadyPaid(true);
    setAmount('');
    setSaveError(null);
  }, [open, initialWho]);

  const totalLitres = packLitresOf(pack);
  const max = available;
  const locale = i18n.language;

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

  const chooseWho = (mode: WhoMode) => {
    setWhoMode(mode);
    if (mode === 'home' && intent === 'sell') setIntent('hold');
  };

  const nameOk =
    whoMode === 'home' || whoMode === 'unnamed' || (whoMode === 'someone' && name.trim().length > 0);
  const isSale = intent === 'sell' && whoMode !== 'home';
  const alreadyDelivered = intent === 'give' || (isSale && sellTaken);

  const canSave = nameOk && totalLitres > 0.05 && (!isSale || Number(amount) > 0);

  const resolvedName = useMemo(() => {
    if (whoMode === 'home') return t('give.homeName');
    if (whoMode === 'unnamed') return t('give.unnamed');
    return name.trim();
  }, [whoMode, name, t]);

  const saveLabel =
    intent === 'sell' && whoMode !== 'home'
      ? t('give.saveSell')
      : intent === 'give'
        ? t('give.saveGive')
        : t('give.saveHold');

  const requestClose = () => {
    if (!busy) onClose();
  };

  const submit = () => {
    setSaveError(null);
    void onSave({
      counterpartyName: resolvedName,
      requested: pack,
      isSale,
      amount: isSale ? Number(amount) : undefined,
      alreadyDelivered,
      alreadyPaid: isSale ? alreadyPaid : false,
      forHome: whoMode === 'home',
    }).catch(() => setSaveError(t('error')));
  };

  const intents: Array<{ id: Intent; title: string; hint: string; icon: React.ReactNode }> = [
    {
      id: 'hold',
      title: t('give.intentHold'),
      hint: t('give.intentHoldHint'),
      icon: <Bookmark size={18} aria-hidden />,
    },
    {
      id: 'give',
      title: t('give.intentGive'),
      hint: t('give.intentGiveHint'),
      icon: <Droplets size={18} aria-hidden />,
    },
    ...(whoMode === 'home'
      ? []
      : [
          {
            id: 'sell' as const,
            title: t('give.intentSell'),
            hint: t('give.intentSellHint'),
            icon: <HandCoins size={18} aria-hidden />,
          },
        ]),
  ];

  return (
    <RightDrawer
      open={open}
      onClose={requestClose}
      size="md"
      title={t('give.title')}
      subtitle={t('give.subtitle')}
      icon={<Droplets size={18} strokeWidth={1.75} aria-hidden />}
      closeDisabled={busy}
      closeLabel={t('common:close', { defaultValue: 'Κλείσιμο' })}
      footer={
        <>
          <Button variant="secondary" onClick={requestClose} disabled={busy}>
            {t('give.cancel')}
          </Button>
          <Button variant="primary" disabled={!canSave || busy} onClick={submit}>
            {busy ? t('give.saving') : saveLabel}
          </Button>
        </>
      }
    >
      <div className="my-oil-give">
        <p className="my-oil-give__step">{t('give.who')}</p>
        {whoMode === 'someone' ? (
          <div className="my-oil-field">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('give.namePlaceholder')}
              autoComplete="name"
              aria-label={t('give.who')}
            />
          </div>
        ) : (
          <p className="my-oil-give__picked">
            {whoMode === 'home' ? t('give.homeName') : t('give.unnamed')}
          </p>
        )}
        <div className="my-oil-toggle">
          <button
            type="button"
            className={whoMode === 'home' ? 'is-on' : ''}
            onClick={() => chooseWho(whoMode === 'home' ? 'someone' : 'home')}
          >
            {t('give.forHome')}
          </button>
          <button
            type="button"
            className={whoMode === 'unnamed' ? 'is-on' : ''}
            onClick={() => chooseWho(whoMode === 'unnamed' ? 'someone' : 'unnamed')}
          >
            {t('give.noName')}
          </button>
        </div>

        <p className="my-oil-give__step">{t('give.what')}</p>
        <div className="my-oil-tin-grid">
          {(
            [
              ['tin16', '16', t('give.tinName')],
              ['tin17', '17', t('give.tinName')],
              ['bulkLitres', null, t('give.bulk')],
            ] as const
          ).map(([key, size, label]) => (
            <div key={key} className={`my-oil-tin${pack[key] > 0 ? ' is-on' : ''}`}>
              <div className={`my-oil-tin__size${size ? '' : ' is-word'}`}>
                <strong>{size ?? t('give.bulkShort')}</strong>
                {size ? <span>{t('give.unitLitres')}</span> : null}
              </div>
              <div className="my-oil-tin__copy">
                <span>{label}</span>
                {key === 'bulkLitres' && pack.bulkLitres > 0 ? (
                  <em>
                    {formatOilNumber(pack.bulkLitres, locale)} {t('give.unitLitres')}
                  </em>
                ) : null}
              </div>
              <div className="my-oil-tin__controls">
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => bump(key, key === 'bulkLitres' ? -1 : -1)}
                  disabled={pack[key] <= 0}
                >
                  <Minus size={18} aria-hidden />
                </button>
                <strong>{key === 'bulkLitres' ? formatOilNumber(pack.bulkLitres, locale) : pack[key] || 0}</strong>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => bump(key, 1)}
                  disabled={
                    max != null &&
                    (key === 'bulkLitres' ? pack.bulkLitres >= max.bulkLitres : pack[key] >= max[key])
                  }
                >
                  <Plus size={18} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
        {totalLitres > 0.05 ? (
          <p className="my-oil-give__total">
            {t('give.totalLitres', { amount: formatOilNumber(totalLitres, locale) })}
          </p>
        ) : null}

        <p className="my-oil-give__step">{t('give.intent')}</p>
        <div className="my-oil-intent">
          {intents.map((item) => (
            <button
              key={item.id}
              type="button"
              className={intent === item.id ? 'is-on' : ''}
              onClick={() => setIntent(item.id)}
            >
              {item.icon}
              <span>
                <strong>{item.title}</strong>
                <em>{item.hint}</em>
              </span>
            </button>
          ))}
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
            <div className="my-oil-toggle">
              <button type="button" className={alreadyPaid ? 'is-on' : ''} onClick={() => setAlreadyPaid(true)}>
                {t('give.paid')}
              </button>
              <button type="button" className={!alreadyPaid ? 'is-on' : ''} onClick={() => setAlreadyPaid(false)}>
                {t('give.notPaid')}
              </button>
            </div>
            <div className="my-oil-toggle">
              <button type="button" className={sellTaken ? 'is-on' : ''} onClick={() => setSellTaken(true)}>
                {t('give.tookIt')}
              </button>
              <button type="button" className={!sellTaken ? 'is-on' : ''} onClick={() => setSellTaken(false)}>
                {t('give.stillHere')}
              </button>
            </div>
          </>
        ) : null}

        {saveError ? <p className="my-oil-give__error">{saveError}</p> : null}
      </div>
    </RightDrawer>
  );
}
