import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, BookUser, Check, Droplets, Globe, HandCoins, Smartphone, UserRound } from 'lucide-react';
import Button from '../Common/Button';
import RightDrawer from '../Common/RightDrawer';
import { HarvestNumberStepper } from '../../harvestCampaign/components/HarvestNumberInput';
import { HarvestSegmentedControl } from '../../harvestCampaign/components/HarvestSegmentedControl';
import '../../harvestCampaign/HarvestSheets.css';
import '../money/Money.css';
import { clampPackInput, emptyOilPackInput, packLitresOf, type OilPackInput } from '../../myOil/packInput';
import { formatOilNumber } from '../../myOil/formatOilPack';
import type { OilCellarCandidate, OilPack } from '../../services/oilStockService';
import { partnerService, type SavedContact } from '../../services/partnerService';
import { fieldPeopleService } from '../../services/fieldPeopleService';
import { getFieldService } from '../../services/serviceFactory';
import { useAuth } from '../../context/AuthContext';
import { normalizePhoneNumber } from '../../utils/phoneLinks';
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
type RecipientPlace = 'inside' | 'outside';

const STEPS: Step[] = ['who', 'howMuch', 'intent'];

type AppPerson = { id: string; name: string };

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

const sameContact = (contact: SavedContact, label: string, phone?: string) => {
  const phoneKey = normalizePhoneNumber(phone);
  if (phoneKey && normalizePhoneNumber(contact.phone) === phoneKey) return true;
  return contact.displayName.trim().toLowerCase() === label.trim().toLowerCase();
};

export function OilMovementSheet({
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
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('who');
  const [whoMode, setWhoMode] = useState<WhoMode>(initialWho);
  const [place, setPlace] = useState<RecipientPlace>('outside');
  const [name, setName] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [people, setPeople] = useState<AppPerson[]>([]);
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [pack, setPack] = useState<OilPackInput>(emptyOilPackInput());
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [sellTaken, setSellTaken] = useState(true);
  const [alreadyPaid, setAlreadyPaid] = useState(true);
  const [amount, setAmount] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  const canImport = canPickDeviceContact();
  const knownRecipient = whoMode === 'home' || whoMode === 'unnamed';

  useEffect(() => {
    if (!open) return;
    const who =
      initialWho === 'someone' || initialWho === 'home' || initialWho === 'unnamed' || initialWho === 'platform'
        ? initialWho
        : 'someone';
    setWhoMode(who);
    setPlace(who === 'platform' ? 'inside' : 'outside');
    setName('');
    setContactId(null);
    setSelectedUserId('');
    setSavedNote(false);
    setPack(emptyOilPackInput());
    setIntent(who === 'home' && initialIntent === 'sell' ? 'hold' : initialIntent);
    setSellTaken(true);
    setAlreadyPaid(true);
    setAmount('');
    setSaveError(null);
    setStep(who === 'home' || who === 'unnamed' ? 'howMuch' : 'who');
  }, [open, initialWho, initialIntent]);

  useEffect(() => {
    if (!open || knownRecipient) return;
    let cancelled = false;
    void (async () => {
      setLoadingPeople(true);
      try {
        const [fields, saved] = await Promise.all([
          user?.userId
            ? getFieldService().getFields().catch(() => [])
            : Promise.resolve([]),
          partnerService.getContacts({ includeUnassigned: true }).catch(() => [] as SavedContact[]),
        ]);
        if (cancelled) return;
        setContacts(saved);
        const byId = new Map<string, AppPerson>();
        const lists = await Promise.all(
          fields.map((field) => fieldPeopleService.getPeople(field.id).catch(() => []))
        );
        if (cancelled) return;
        for (const member of lists.flat()) {
          if (!member.userId || member.userId === user?.userId || member.status === 'removed') continue;
          const label = (member.displayName || member.email || '').trim();
          if (!label || byId.has(member.userId)) continue;
          byId.set(member.userId, { id: member.userId, name: label });
        }
        for (const contact of saved) {
          if (!contact.linkedUserId || contact.linkedUserId === user?.userId) continue;
          if (byId.has(contact.linkedUserId)) continue;
          const label = contact.displayName.trim();
          if (!label) continue;
          byId.set(contact.linkedUserId, { id: contact.linkedUserId, name: label });
        }
        setPeople([...byId.values()].sort((a, b) => a.name.localeCompare(b.name)));
      } finally {
        if (!cancelled) setLoadingPeople(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, knownRecipient, user?.userId]);

  const insidePeople = useMemo(() => {
    const byId = new Map(people.map((person) => [person.id, person]));
    for (const person of platformPeople) {
      if (!person.userId || person.userId === user?.userId || byId.has(person.userId)) continue;
      const label = person.displayName?.trim() || person.userId;
      byId.set(person.userId, { id: person.userId, name: label });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [people, platformPeople, user?.userId]);

  const outsideContacts = useMemo(
    () => contacts.filter((contact) => !contact.linkedUserId && contact.displayName.trim()),
    [contacts]
  );

  const shownContacts = useMemo(() => {
    const needle = name.trim().toLowerCase();
    const rows = needle
      ? outsideContacts.filter((contact) => contact.displayName.toLowerCase().includes(needle))
      : outsideContacts;
    return rows.slice(0, 6);
  }, [outsideContacts, name]);

  const totalLitres = packLitresOf(pack);
  const max = available;
  const locale = i18n.language;
  const stepIndex = STEPS.indexOf(step);

  const choosePlace = (next: RecipientPlace) => {
    if (next === place) return;
    setSavedNote(false);
    setName('');
    setContactId(null);
    setSelectedUserId('');
    setPlace(next);
  };

  const choosePerson = (person: AppPerson) => {
    setSelectedUserId(person.id);
    setName(person.name);
    setContactId(null);
  };

  const chooseContact = (contact: SavedContact) => {
    setContactId(contact.id);
    setName(contact.displayName.trim());
    setSelectedUserId('');
    setSavedNote(false);
  };

  const importContact = async () => {
    if (!canImport || importing) return;
    setImporting(true);
    setSavedNote(false);
    try {
      const picked = await pickDeviceContact();
      if (!picked) return;
      const label = picked.displayName.trim() || picked.phone || picked.email || '';
      if (!label) return;
      setName(label);
      setContactId(null);
      setSelectedUserId('');
      if (outsideContacts.some((contact) => sameContact(contact, label, picked.phone))) return;
      const created = await partnerService.createContact({
        displayName: label,
        phone: picked.phone,
        email: picked.email,
        source: 'PhoneBook',
      });
      setContacts((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setContactId(created.id);
      setSavedNote(true);
    } catch {
      /* The name is already filled when the picker returned one. */
    } finally {
      setImporting(false);
    }
  };

  const setCount = (key: keyof OilPackInput, raw: number) => {
    setPack((prev) => clampPackInput({ ...prev, [key]: raw }, max));
  };

  const nameOk = knownRecipient || name.trim().length > 0;
  const transferUserId =
    intent === 'give' && selectedUserId && platformPeople.some((person) => person.userId === selectedUserId)
      ? selectedUserId
      : undefined;
  const isSale = intent === 'sell' && whoMode !== 'home' && !transferUserId;
  const alreadyDelivered = Boolean(transferUserId) || intent === 'give' || (isSale && sellTaken);
  const canContinueWho = nameOk;
  const canContinueHowMuch = totalLitres > 0.05;
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
    if (busy) return;
    setSaveError(null);
    void onSave({
      counterpartyName: resolvedName,
      requested: pack,
      isSale,
      amount: isSale ? Number(amount) : undefined,
      alreadyDelivered,
      alreadyPaid: isSale ? alreadyPaid : false,
      forHome: whoMode === 'home',
      toUserId: transferUserId,
      contactId: place === 'outside' && whoMode === 'someone' ? contactId || undefined : undefined,
    }).catch(() => setSaveError(t('error')));
  };

  const goBack = () => {
    if (step === 'intent') setStep('howMuch');
    else if (step === 'howMuch' && !knownRecipient) setStep('who');
    else requestClose();
  };

  const goNext = () => {
    if (step === 'who' && canContinueWho) setStep('howMuch');
    else if (step === 'howMuch' && canContinueHowMuch) setStep('intent');
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

  const steppers = (
    [
      ['tin16', t('give.tin16'), ''],
      ['tin17', t('give.tin17'), ''],
      ['bulkLitres', t('give.bulk'), 'L'],
    ] as const
  );

  const subtitle =
    step === 'who' ? t('give.who') : step === 'howMuch' ? t('give.what') : t('give.intent');

  const title =
    intent === 'sell' ? t('actions.sell') : intent === 'give' ? t('actions.give') : t('actions.hold');

  const footer =
    step === 'intent' ? (
      <>
        <Button variant="secondary" onClick={goBack} disabled={busy}>
          {t('give.back')}
        </Button>
        <Button variant="primary" disabled={!canSave || busy} onClick={submit}>
          {busy ? t('give.saving') : saveLabel}
        </Button>
      </>
    ) : (
      <>
        <Button variant="secondary" onClick={step === 'who' ? requestClose : goBack} disabled={busy}>
          {step === 'who' ? t('give.cancel') : t('give.back')}
        </Button>
        <Button
          variant="primary"
          disabled={(step === 'who' ? !canContinueWho : !canContinueHowMuch) || busy}
          onClick={goNext}
        >
          {t('give.continue')}
        </Button>
      </>
    );

  return (
    <RightDrawer
      open={open}
      onClose={requestClose}
      size="md"
      title={title}
      subtitle={subtitle}
      icon={<Droplets size={18} strokeWidth={1.75} aria-hidden />}
      closeDisabled={busy}
      closeLabel={t('common:close', { defaultValue: 'Close' })}
      footer={footer}
    >
      <div className="my-oil-flow my-oil-give">
        <div className="my-oil-pager-dots" role="tablist" aria-label={title}>
          {STEPS.map((id, i) => (
            <span
              key={id}
              className={`my-oil-pager-dot${i === stepIndex ? ' is-on' : ''}${i < stepIndex ? ' is-done' : ''}`}
              aria-current={i === stepIndex ? 'step' : undefined}
            />
          ))}
        </div>

        {step === 'who' ? (
          <div className="my-oil-source-list">
            <div className={`my-oil-source-card my-oil-give__place${place === 'inside' ? ' is-on' : ''}`}>
              <button type="button" className="my-oil-give__place-head" onClick={() => choosePlace('inside')}>
                <span className="my-oil-source-card__icon" aria-hidden>
                  <Smartphone size={18} strokeWidth={1.75} />
                </span>
                <span className="my-oil-source-card__body">
                  <strong>{t('give.inside')}</strong>
                  <em>{t('give.insideHint')}</em>
                </span>
              </button>
              {place === 'inside' ? (
                <div className="my-oil-give__place-body">
                  {loadingPeople ? (
                    <p className="my-oil-give__hint">{t('loading')}</p>
                  ) : insidePeople.length === 0 ? (
                    <p className="my-oil-give__hint">{t('give.insideEmpty')}</p>
                  ) : (
                    <ul className="my-oil-give__people">
                      {insidePeople.map((person) => {
                        const selected = selectedUserId === person.id;
                        return (
                          <li key={person.id}>
                            <button
                              type="button"
                              className={`my-oil-give__person${selected ? ' is-on' : ''}`}
                              onClick={() => choosePerson(person)}
                              aria-pressed={selected}
                            >
                              <span className="my-oil-give__avatar" aria-hidden>
                                <UserRound size={16} />
                              </span>
                              <span className="my-oil-give__person-copy">
                                <strong>{person.name}</strong>
                              </span>
                              {selected ? <Check size={16} aria-hidden /> : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            <div className={`my-oil-source-card my-oil-give__place${place === 'outside' ? ' is-on' : ''}`}>
              <button type="button" className="my-oil-give__place-head" onClick={() => choosePlace('outside')}>
                <span className="my-oil-source-card__icon" aria-hidden>
                  <Globe size={18} strokeWidth={1.75} />
                </span>
                <span className="my-oil-source-card__body">
                  <strong>{t('give.outside')}</strong>
                  <em>{t('give.outsideHint')}</em>
                </span>
              </button>
              {place === 'outside' ? (
                <div className="my-oil-give__place-body">
                  <div className="my-oil-give__name-row">
                    <div className="my-oil-field">
                      <input
                        value={name}
                        onChange={(e) => {
                          setSavedNote(false);
                          setContactId(null);
                          setSelectedUserId('');
                          setName(e.target.value);
                        }}
                        placeholder={t('give.outsidePlaceholder')}
                        autoComplete="name"
                        autoFocus
                        aria-label={t('give.outsidePlaceholder')}
                      />
                    </div>
                    {canImport ? (
                      <button
                        type="button"
                        className="my-oil-give__contact-icon"
                        onClick={() => void importContact()}
                        disabled={importing || busy}
                        aria-label={t('give.importContact')}
                      >
                        <BookUser size={18} strokeWidth={1.75} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  {savedNote ? <p className="my-oil-give__hint">{t('give.savedContact')}</p> : null}
                  {shownContacts.length > 0 ? (
                    <>
                      <p className="my-oil-give__hint">{t('give.yourContacts')}</p>
                      <ul className="my-oil-give__people">
                        {shownContacts.map((contact) => (
                          <li key={contact.id}>
                            <button
                              type="button"
                              className={`my-oil-give__person${contactId === contact.id ? ' is-on' : ''}`}
                              onClick={() => chooseContact(contact)}
                              aria-pressed={contactId === contact.id}
                            >
                              <span className="my-oil-give__avatar" aria-hidden>
                                <UserRound size={16} />
                              </span>
                              <span className="my-oil-give__person-copy">
                                <strong>{contact.displayName.trim()}</strong>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 'howMuch' ? (
          <>
            <p className="my-oil-give__step">{t('give.what')}</p>
            <div className="my-oil-give__amounts">
              {steppers.map(([key, label, suffix]) => (
                <HarvestNumberStepper
                  key={key}
                  label={label}
                  value={pack[key]}
                  min={0}
                  max={max ? (key === 'bulkLitres' ? max.bulkLitres : max[key]) : undefined}
                  step={1}
                  suffix={suffix}
                  onChange={(next) => setCount(key, next)}
                />
              ))}
            </div>
            {totalLitres > 0.05 ? (
              <p className="my-oil-give__total">
                {t('give.totalLitres', { amount: formatOilNumber(totalLitres, locale) })}
              </p>
            ) : null}
          </>
        ) : null}

        {step === 'intent' ? (
          <>
            <p className="my-oil-give__step">{t('give.intent')}</p>
            {transferUserId ? <p className="my-oil-give__hint">{t('give.platformTransferHint')}</p> : null}
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
                <div className="my-oil-give__toggles">
                  <HarvestSegmentedControl
                    value={alreadyPaid ? 'paid' : 'unpaid'}
                    ariaLabel={t('give.amount')}
                    onChange={(value) => setAlreadyPaid(value === 'paid')}
                    options={[
                      { value: 'paid', label: t('give.paid') },
                      { value: 'unpaid', label: t('give.notPaid') },
                    ]}
                  />
                  <HarvestSegmentedControl
                    value={sellTaken ? 'taken' : 'here'}
                    ariaLabel={t('give.intent')}
                    onChange={(value) => setSellTaken(value === 'taken')}
                    options={[
                      { value: 'taken', label: t('give.tookIt') },
                      { value: 'here', label: t('give.stillHere') },
                    ]}
                  />
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

export { OilMovementSheet as GiveOilSheet };
