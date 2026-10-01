import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, BookUser, Droplets, HandCoins, Minus, Plus, UserRound } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../../myOil/packInput';
import { formatOilNumber } from '../../myOil/formatOilPack';
import type { OilCellarCandidate, OilPack } from '../../services/oilStockService';
import { partnerService, type SavedContact } from '../../services/partnerService';
import { canPickDeviceContact, pickDeviceContact } from '../../utils/pickDeviceContact';

export type GiveOilSaveInput = {
  counterpartyName: string;
  requested: OilPackInput;
  isSale: boolean;
  amount?: number;
  alreadyDelivered: boolean;
  alreadyPaid: boolean;
  forHome: boolean;
  /** Platform cellar transfer — oil lands in this user's My Oil. */
  toUserId?: string;
  contactId?: string;
};

type WhoMode = 'platform' | 'someone' | 'home' | 'unnamed';
export type GiveOilIntent = 'hold' | 'give' | 'sell';
type Intent = GiveOilIntent;
type Step = 'who' | 'howMuch' | 'intent';

const STEPS: Step[] = ['who', 'howMuch', 'intent'];

type Props = {
  open: boolean;
  available?: OilPack;
  busy: boolean;
  onClose: () => void;
  onSave: (input: GiveOilSaveInput) => Promise<void>;
  /** Prefill who-mode (e.g. set-aside for home). */
  initialWho?: WhoMode;
  /** Prefill what is happening, so Give / Sell / Hold each open ready to go. */
  initialIntent?: Intent;
  /** Eligible platform people (Family/Admin) who can receive a cellar transfer. Excludes self. */
  platformPeople?: OilCellarCandidate[];
};

export function GiveOilSheet({
  open,
  available,
  busy,
  onClose,
  onSave,
  initialWho = 'someone',
  initialIntent = 'hold',
  platformPeople = [],
}: Props) {
  const { t, i18n } = useTranslation(['myOil', 'common']);
  const [step, setStep] = useState<Step>('who');
  const [whoMode, setWhoMode] = useState<WhoMode>(initialWho);
  const [name, setName] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [platformUserId, setPlatformUserId] = useState('');
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [contactQuery, setContactQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [sellTaken, setSellTaken] = useState(true);
  const [alreadyPaid, setAlreadyPaid] = useState(true);
  const [amount, setAmount] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasPlatform = platformPeople.length > 0;
  const canImport = canPickDeviceContact();

  useEffect(() => {
    if (!open) return;
    const who =
      initialWho === 'platform' && !hasPlatform
        ? 'someone'
        : initialWho === 'someone' || initialWho === 'home' || initialWho === 'unnamed' || initialWho === 'platform'
          ? initialWho
          : 'someone';
    setWhoMode(who);
    setName('');
    setContactId(null);
    setPlatformUserId('');
    setContactQuery('');
    setPack(emptyOilPackInput());
    setIntent(
      who === 'home' && initialIntent === 'sell'
        ? 'hold'
        : who === 'platform'
          ? 'give'
          : initialIntent
    );
    setSellTaken(true);
    setAlreadyPaid(true);
    setAmount('');
    setSaveError(null);
    setStep(who === 'home' ? 'howMuch' : 'who');
  }, [open, initialWho, initialIntent, hasPlatform]);

  useEffect(() => {
    if (!open || whoMode !== 'someone') return;
    let cancelled = false;
    void partnerService
      .getContacts()
      .then((rows) => {
        if (!cancelled) setContacts(rows || []);
      })
      .catch(() => {
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, whoMode]);

  const totalLitres = packLitresOf(pack);
  const max = available;
  const locale = i18n.language;
  const stepIndex = STEPS.indexOf(step);

  const contactMatches = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    const rows = !q
      ? contacts
      : contacts.filter((c) => {
          const hay = `${c.displayName} ${c.phone || ''} ${c.email || ''}`.toLowerCase();
          return hay.includes(q);
        });
    return rows.slice(0, 8);
  }, [contacts, contactQuery]);

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
    if (mode === 'platform') {
      setIntent('give');
      setContactId(null);
      setName('');
    }
    if (mode !== 'platform') setPlatformUserId('');
    if (mode !== 'someone') {
      setContactId(null);
      setContactQuery('');
    }
  };

  const chooseContact = (contact: SavedContact) => {
    setContactId(contact.id);
    setName(contact.displayName);
    setContactQuery('');
  };

  const importContact = async () => {
    if (!canImport || importing) return;
    setImporting(true);
    setSaveError(null);
    try {
      const picked = await pickDeviceContact();
      if (!picked) return;
      const created = await partnerService.createContact({
        displayName: picked.displayName,
        phone: picked.phone,
        email: picked.email,
        source: 'PhoneBook',
      });
      setContacts((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      chooseContact(created);
    } catch {
      setSaveError(t('error'));
    } finally {
      setImporting(false);
    }
  };

  const nameOk =
    whoMode === 'home' ||
    whoMode === 'unnamed' ||
    (whoMode === 'someone' && name.trim().length > 0) ||
    (whoMode === 'platform' && Boolean(platformUserId));
  const isPlatform = whoMode === 'platform';
  const isSale = intent === 'sell' && whoMode !== 'home' && !isPlatform;
  const alreadyDelivered = isPlatform || intent === 'give' || (isSale && sellTaken);
  const canContinueWho = nameOk;
  const canContinueHowMuch = totalLitres > 0.05;
  const canSave = nameOk && totalLitres > 0.05 && (!isSale || Number(amount) > 0);

  const resolvedName = useMemo(() => {
    if (whoMode === 'home') return t('give.homeName');
    if (whoMode === 'unnamed') return t('give.unnamed');
    if (whoMode === 'platform') {
      const person = platformPeople.find((p) => p.userId === platformUserId);
      return person?.displayName?.trim() || person?.userId || name.trim();
    }
    return name.trim();
  }, [whoMode, name, platformUserId, platformPeople, t]);

  const saveLabel =
    isPlatform || intent === 'give'
      ? t('give.saveGive')
      : intent === 'sell' && whoMode !== 'home'
        ? t('give.saveSell')
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
      toUserId: isPlatform ? platformUserId : undefined,
      contactId: whoMode === 'someone' ? contactId || undefined : undefined,
    }).catch(() => setSaveError(t('error')));
  };

  const goBack = () => {
    if (step === 'howMuch') setStep('who');
    else if (step === 'intent') setStep('howMuch');
    else requestClose();
  };

  const goNext = () => {
    if (step === 'who' && canContinueWho) setStep('howMuch');
    else if (step === 'howMuch' && canContinueHowMuch) {
      if (isPlatform) {
        // Platform give is always an immediate cellar transfer — no hold/sell.
        submit();
        return;
      }
      setStep('intent');
    }
  };

  const intents: Array<{ id: Intent; title: string; hint: string; icon: React.ReactNode }> = [
    {
      id: 'hold',
      title: t('give.intentHold'),
      hint: t('give.intentHoldHint'),
      icon: <Bookmark size={18} strokeWidth={1.75} aria-hidden />,
    },
    {
      id: 'give',
      title: t('give.intentGive'),
      hint: t('give.intentGiveHint'),
      icon: <Droplets size={18} strokeWidth={1.75} aria-hidden />,
    },
    ...(whoMode === 'home'
      ? []
      : [
          {
            id: 'sell' as const,
            title: t('give.intentSell'),
            hint: t('give.intentSellHint'),
            icon: <HandCoins size={18} strokeWidth={1.75} aria-hidden />,
          },
        ]),
  ];

  const whoOptions: Array<[WhoMode, string]> = [
    ...(hasPlatform ? ([['platform', t('give.forPlatform')]] as const) : []),
    ['someone', t('give.forSomeone')],
    ['home', t('give.forHome')],
    ['unnamed', t('give.noName')],
  ];

  const subtitle =
    step === 'who' ? t('give.who') : step === 'howMuch' ? t('give.what') : t('give.intent');

  const howMuchPrimaryLabel = isPlatform
    ? busy
      ? t('give.saving')
      : t('give.saveGive')
    : t('give.continue');

  const footer =
    step === 'who' ? (
      <>
        <Button variant="secondary" onClick={requestClose} disabled={busy}>
          {t('give.cancel')}
        </Button>
        <Button variant="primary" disabled={!canContinueWho || busy} onClick={goNext}>
          {t('give.continue')}
        </Button>
      </>
    ) : step === 'howMuch' ? (
      <>
        <Button variant="secondary" onClick={goBack} disabled={busy}>
          {t('give.back')}
        </Button>
        <Button
          variant="primary"
          disabled={!canContinueHowMuch || busy}
          onClick={goNext}
        >
          {howMuchPrimaryLabel}
        </Button>
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={goBack} disabled={busy}>
          {t('give.back')}
        </Button>
        <Button variant="primary" disabled={!canSave || busy} onClick={submit}>
          {busy ? t('give.saving') : saveLabel}
        </Button>
      </>
    );

  return (
    <RightDrawer
      open={open}
      onClose={requestClose}
      size="md"
      title={t('give.title')}
      subtitle={subtitle}
      icon={<Droplets size={18} strokeWidth={1.75} aria-hidden />}
      closeDisabled={busy}
      closeLabel={t('common:close', { defaultValue: 'Κλείσιμο' })}
      footer={footer}
    >
      <div className="my-oil-give">
        <div className="my-oil-pager-dots" role="tablist" aria-label={t('give.title')}>
          {(isPlatform ? (['who', 'howMuch'] as Step[]) : STEPS).map((id, i) => {
            const activeIndex = isPlatform
              ? (['who', 'howMuch'] as Step[]).indexOf(step)
              : stepIndex;
            return (
              <span
                key={id}
                className={`my-oil-pager-dot${i === activeIndex ? ' is-on' : ''}${
                  i < activeIndex ? ' is-done' : ''
                }`}
                aria-current={i === activeIndex ? 'step' : undefined}
              />
            );
          })}
        </div>

        {step === 'who' ? (
          <>
            <p className="my-oil-give__step">{t('give.who')}</p>
            <div className="my-oil-toggle">
              {whoOptions.map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={whoMode === mode ? 'is-on' : ''}
                  onClick={() => chooseWho(mode)}
                >
                  {label}
                </button>
              ))}
            </div>

            {whoMode === 'platform' ? (
              <ul className="my-oil-give__people">
                {platformPeople.map((person) => {
                  const selected = platformUserId === person.userId;
                  return (
                    <li key={person.userId}>
                      <button
                        type="button"
                        className={`my-oil-give__person${selected ? ' is-on' : ''}`}
                        onClick={() => setPlatformUserId(person.userId)}
                        aria-pressed={selected}
                      >
                        <span className="my-oil-give__avatar" aria-hidden>
                          <UserRound size={16} />
                        </span>
                        <span className="my-oil-give__person-copy">
                          <strong>{person.displayName || person.userId}</strong>
                          <em>{t(`give.role.${person.role}`, { defaultValue: person.role })}</em>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {whoMode === 'someone' ? (
              <div className="my-oil-give__contacts">
                <div className="my-oil-field">
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setContactId(null);
                      setContactQuery(e.target.value);
                    }}
                    placeholder={t('give.namePlaceholder')}
                    autoComplete="name"
                    autoFocus
                    aria-label={t('give.who')}
                  />
                </div>
                {canImport ? (
                  <button
                    type="button"
                    className="my-oil-give__import"
                    onClick={() => void importContact()}
                    disabled={importing || busy}
                  >
                    <BookUser size={16} strokeWidth={1.75} aria-hidden />
                    {importing ? t('give.importing') : t('give.importContact')}
                  </button>
                ) : null}
                {contactMatches.length > 0 ? (
                  <ul className="my-oil-give__people">
                    {contactMatches.map((contact) => {
                      const selected = contactId === contact.id;
                      return (
                        <li key={contact.id}>
                          <button
                            type="button"
                            className={`my-oil-give__person${selected ? ' is-on' : ''}`}
                            onClick={() => chooseContact(contact)}
                            aria-pressed={selected}
                          >
                            <span className="my-oil-give__avatar" aria-hidden>
                              {(contact.displayName || '?').slice(0, 1).toUpperCase()}
                            </span>
                            <span className="my-oil-give__person-copy">
                              <strong>{contact.displayName}</strong>
                              <em>{contact.phone || contact.email || t('give.contactNoReach')}</em>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="my-oil-give__hint">{t('give.contactHint')}</p>
                )}
              </div>
            ) : null}

            {whoMode === 'home' || whoMode === 'unnamed' ? (
              <p className="my-oil-give__picked">
                {whoMode === 'home' ? t('give.homeName') : t('give.unnamed')}
              </p>
            ) : null}
          </>
        ) : null}

        {step === 'howMuch' ? (
          <>
            <p className="my-oil-give__step">{t('give.what')}</p>
            {isPlatform ? (
              <p className="my-oil-give__hint">{t('give.platformTransferHint')}</p>
            ) : null}
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
                      onClick={() => bump(key, -1)}
                      disabled={pack[key] <= 0}
                    >
                      <Minus size={18} aria-hidden />
                    </button>
                    <strong>
                      {key === 'bulkLitres' ? formatOilNumber(pack.bulkLitres, locale) : pack[key] || 0}
                    </strong>
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
          </>
        ) : null}

        {step === 'intent' && !isPlatform ? (
          <>
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
                    autoFocus
                  />
                </div>
                <div className="my-oil-toggle">
                  <button
                    type="button"
                    className={alreadyPaid ? 'is-on' : ''}
                    onClick={() => setAlreadyPaid(true)}
                  >
                    {t('give.paid')}
                  </button>
                  <button
                    type="button"
                    className={!alreadyPaid ? 'is-on' : ''}
                    onClick={() => setAlreadyPaid(false)}
                  >
                    {t('give.notPaid')}
                  </button>
                </div>
                <div className="my-oil-toggle">
                  <button
                    type="button"
                    className={sellTaken ? 'is-on' : ''}
                    onClick={() => setSellTaken(true)}
                  >
                    {t('give.tookIt')}
                  </button>
                  <button
                    type="button"
                    className={!sellTaken ? 'is-on' : ''}
                    onClick={() => setSellTaken(false)}
                  >
                    {t('give.stillHere')}
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {saveError ? <p className="my-oil-give__error">{saveError}</p> : null}
      </div>
    </RightDrawer>
  );
}
