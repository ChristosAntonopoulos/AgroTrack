import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Mail, Phone, Search, User, UserPlus } from 'lucide-react';
import Button from '../Common/Button';
import PartnersSheet from '../Partners/PartnersSheet';
import { FieldModule, ManagedContact, fieldPeopleService } from '../../services/fieldPeopleService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import {
  AccessChoice,
  defaultPresetForRelationship,
  levelForChoice,
  modulesForChoice,
} from '../../people/aggregatePeople';
import FieldPermissionPanel from './FieldPermissionPanel';

type Relationship = 'Family' | 'Collaborator';
type WhoMode = 'search' | 'new';

type KnownPerson = {
  email?: string;
  displayName: string;
  memberships: { fieldId: string }[];
};

type Props = {
  open?: boolean;
  fields: { id: string; name: string }[];
  contacts: ManagedContact[];
  people?: KnownPerson[];
  initialFieldIds?: string[];
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  onClose: () => void;
  onSent: () => void;
};

const STEPS = 5;

const looksLikeEmail = (value: string) => value.includes('@');
const looksLikePhone = (value: string) => !looksLikeEmail(value) && /\d{6,}/.test(value.replace(/\s/g, ''));

const InvitePersonSheet: React.FC<Props> = ({
  open = true,
  fields,
  contacts,
  people = [],
  initialFieldIds = [],
  initialName = '',
  initialEmail = '',
  initialPhone = '',
  onClose,
  onSent,
}) => {
  const { t } = useTranslation(['partners', 'common']);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<WhoMode>(
    initialEmail || initialPhone || initialName ? 'new' : contacts.length > 0 ? 'search' : 'new'
  );
  const [query, setQuery] = useState('');
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [fieldIds, setFieldIds] = useState<string[]>(
    initialFieldIds.filter((id) => fields.some((field) => field.id === id))
  );
  const [relationship, setRelationship] = useState<Relationship>('Family');
  const [choice, setChoice] = useState<AccessChoice>('view');
  const [choiceTouched, setChoiceTouched] = useState(false);
  const [modules, setModules] = useState<FieldModule[]>(modulesForChoice('view'));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successHint, setSuccessHint] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setAttempted(false);
    setError('');
    setSuccessHint('');
  }, [open]);

  const typedEmail = email.trim() || (looksLikeEmail(query) ? query.trim() : '');
  const typedPhone = phone.trim() || (looksLikePhone(query) ? query.trim() : '');

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return contacts.slice(0, 8);
    }
    return contacts
      .filter((contact) => {
        const hay = `${contact.displayName} ${contact.email || ''} ${contact.phone || ''}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 8);
  }, [contacts, query]);

  const takenFieldIds = useMemo(() => {
    const needle = typedEmail.toLowerCase();
    if (!needle) return new Set<string>();
    return new Set(
      people
        .filter((person) => person.email?.trim().toLowerCase() === needle)
        .flatMap((person) => person.memberships.map((membership) => membership.fieldId))
    );
  }, [people, typedEmail]);

  const chooseContact = (contact: ManagedContact) => {
    setSelectedContactId(contact.id);
    setName(contact.displayName);
    setEmail(contact.email || '');
    setPhone(contact.phone || '');
    setQuery('');
    setAttempted(false);
    if (!contact.email && !contact.phone) {
      setMode('new');
    }
  };

  const startNew = () => {
    setMode('new');
    setSelectedContactId(null);
    setAttempted(false);
    if (!name && query && !looksLikeEmail(query) && !looksLikePhone(query)) setName(query.trim());
    if (!email && looksLikeEmail(query)) setEmail(query.trim());
    if (!phone && looksLikePhone(query)) setPhone(query.trim());
  };

  const pickRelationship = (next: Relationship) => {
    setRelationship(next);
    if (!choiceTouched) {
      const nextChoice = defaultPresetForRelationship(next);
      setChoice(nextChoice);
      setModules(modulesForChoice(nextChoice));
    }
  };

  const pickChoice = (next: AccessChoice) => {
    setChoiceTouched(true);
    setChoice(next);
  };

  const toggleField = (id: string) => {
    if (takenFieldIds.has(id)) return;
    setFieldIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const canLeaveStep = () => {
    if (step === 1) return Boolean(typedEmail || typedPhone);
    if (step === 2) return fieldIds.some((id) => !takenFieldIds.has(id));
    return true;
  };

  const goNext = () => {
    if (!canLeaveStep()) {
      setAttempted(true);
      if (step === 1) setMode('new');
      return;
    }
    setAttempted(false);
    if (step === 1) {
      if (typedEmail) setEmail(typedEmail);
      if (typedPhone) setPhone(typedPhone);
      setFieldIds((current) => current.filter((id) => !takenFieldIds.has(id)));
    }
    setStep((value) => value + 1);
  };

  const send = async () => {
    const targets = fieldIds.filter((id) => !takenFieldIds.has(id));
    if (targets.length === 0) return;
    setSending(true);
    setError('');
    try {
      const created = await fieldPeopleService.createInvites({
        fieldIds: targets,
        relationship,
        accessPreset: levelForChoice(choice),
        modules: modules.length > 0 ? modules : modulesForChoice(choice),
        email: (email.trim() || typedEmail) || undefined,
        phone: (phone.trim() || typedPhone) || undefined,
        displayName: name.trim() || undefined,
      });
      const anyExisting = created.some((invite) => invite.inviteeHasAccount);
      const anyNotified = created.some((invite) => invite.notificationQueued);
      setSuccessHint(
        anyExisting
          ? t('partners:peoplePage.inviteSentExisting', {
              defaultValue: anyNotified
                ? 'They already use Oleachron — notified in the app and by email.'
                : 'They already use Oleachron — invite email sent.',
            })
          : t('partners:peoplePage.inviteSentNew', {
              defaultValue: 'Invite email sent. They can register with the link or code.',
            })
      );
      onSent();
    } catch (err) {
      setError(getApiErrorMessage(err, t));
    } finally {
      setSending(false);
    }
  };

  const selectedFields = fields.filter((field) => fieldIds.includes(field.id) && !takenFieldIds.has(field.id));
  const who = name.trim() || typedEmail || typedPhone;
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) || null;
  const reachReady = Boolean(typedEmail || typedPhone);

  return (
    <PartnersSheet
      open={open}
      size={step >= 4 ? 'lg' : 'md'}
      kicker={t('partners:peoplePage.inviteStep', { step, total: STEPS })}
      title={t(`partners:peoplePage.steps.${step}.title`)}
      subtitle={t(`partners:peoplePage.steps.${step}.hint`)}
      onClose={onClose}
      footer={
        successHint ? (
          <div className="invite-footer">
            <span className="invite-footer-spacer" />
            <Button variant="primary" onClick={onClose}>
              {t('common:done', { defaultValue: 'Done' })}
            </Button>
          </div>
        ) : (
        <div className="invite-footer">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((value) => value - 1)} disabled={sending}>
              {t('common:back')}
            </Button>
          ) : (
            <span className="invite-footer-spacer" />
          )}
          {step < STEPS ? (
            <Button variant="primary" onClick={goNext} disabled={sending}>
              {t('common:next')}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => void send()}
              loading={sending}
              disabled={selectedFields.length === 0}
            >
              {t('partners:peoplePage.sendInvite')}
            </Button>
          )}
        </div>
        )
      }
    >
      {error ? <p className="people-error">{error}</p> : null}
      {successHint ? (
        <p className="people-success" role="status">
          {successHint}
        </p>
      ) : null}

      {!successHint ? (
      <>
      <div className="invite-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS} aria-valuenow={step}>
        {Array.from({ length: STEPS }, (_, index) => {
          const number = index + 1;
          const state = number === step ? 'is-on' : number < step ? 'is-done' : '';
          return (
            <button
              key={number}
              type="button"
              className={`invite-progress-seg ${state}`.trim()}
              aria-label={t('partners:peoplePage.inviteStep', { step: number, total: STEPS })}
              aria-current={number === step ? 'step' : undefined}
              disabled={number > step}
              onClick={() => {
                if (number < step) setStep(number);
              }}
            />
          );
        })}
      </div>

      {step > 1 ? (
        <div className="invite-who">
          <div className="invite-who-avatar" aria-hidden>
            {(who || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="invite-who-copy">
            <strong>{who}</strong>
            <span>{typedEmail || typedPhone}</span>
          </div>
          <button type="button" className="invite-who-edit" onClick={() => setStep(1)}>
            {t('partners:peoplePage.changePerson')}
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="invite-form">
          <div className="invite-mode" role="tablist" aria-label={t('partners:peoplePage.steps.1.title')}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'search'}
              className={`invite-mode-btn${mode === 'search' ? ' is-on' : ''}`}
              onClick={() => {
                setMode('search');
                setAttempted(false);
              }}
            >
              <Search size={16} aria-hidden />
              {t('partners:peoplePage.fromContacts')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'new'}
              className={`invite-mode-btn${mode === 'new' ? ' is-on' : ''}`}
              onClick={startNew}
            >
              <UserPlus size={16} aria-hidden />
              {t('partners:peoplePage.newContact')}
            </button>
          </div>

          {mode === 'search' ? (
            <div className="invite-panel">
              <label className="invite-field" htmlFor="invite-query">
                <span>{t('partners:peoplePage.searchLabel')}</span>
                <span className="invite-input">
                  <Search size={18} aria-hidden />
                  <input
                    id="invite-query"
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedContactId(null);
                      setAttempted(false);
                    }}
                    placeholder={t('partners:peoplePage.searchPlaceholder')}
                    autoComplete="off"
                    autoFocus
                  />
                </span>
              </label>

              {selectedContact && reachReady ? (
                <div className="invite-selected">
                  <div>
                    <strong>{selectedContact.displayName}</strong>
                    <span>{selectedContact.email || selectedContact.phone}</span>
                  </div>
                  <Check size={18} aria-hidden />
                </div>
              ) : null}

              {matches.length > 0 ? (
                <ul className="invite-contact-list">
                  {matches.map((contact) => {
                    const selected = selectedContactId === contact.id;
                    return (
                      <li key={contact.id}>
                        <button
                          type="button"
                          className={`invite-contact${selected ? ' is-on' : ''}`}
                          onClick={() => chooseContact(contact)}
                          aria-pressed={selected}
                        >
                          <span className="invite-contact-avatar" aria-hidden>
                            {contact.displayName.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="invite-contact-copy">
                            <strong>{contact.displayName}</strong>
                            <span>{contact.email || contact.phone || t('partners:peoplePage.noReach')}</span>
                          </span>
                          {selected ? <Check size={16} aria-hidden /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="invite-empty">
                  {query.trim()
                    ? t('partners:peoplePage.noContactMatch')
                    : t('partners:peoplePage.noContactsYet')}
                </p>
              )}

              <button type="button" className="invite-link" onClick={startNew}>
                {t('partners:peoplePage.switchToNew')}
              </button>
            </div>
          ) : (
            <div className="invite-panel">
              <label className="invite-field" htmlFor="invite-name">
                <span>{t('partners:peoplePage.name')}</span>
                <span className="invite-input">
                  <User size={18} aria-hidden />
                  <input
                    id="invite-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t('partners:peoplePage.namePlaceholder')}
                    autoComplete="name"
                    autoFocus
                  />
                </span>
              </label>

              <label className="invite-field" htmlFor="invite-email">
                <span>
                  {t('partners:peoplePage.email')}
                  <em>{t('partners:peoplePage.orPhoneRequired')}</em>
                </span>
                <span className="invite-input">
                  <Mail size={18} aria-hidden />
                  <input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setSelectedContactId(null);
                      setAttempted(false);
                    }}
                    placeholder={t('partners:peoplePage.emailPlaceholder')}
                    autoComplete="email"
                  />
                </span>
              </label>

              <label className="invite-field" htmlFor="invite-phone">
                <span>{t('partners:peoplePage.phone')}</span>
                <span className="invite-input">
                  <Phone size={18} aria-hidden />
                  <input
                    id="invite-phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setSelectedContactId(null);
                      setAttempted(false);
                    }}
                    placeholder={t('partners:peoplePage.phonePlaceholder')}
                    autoComplete="tel"
                  />
                </span>
              </label>

              {reachReady ? (
                <p className="invite-confirm">
                  {t('partners:peoplePage.willRegister', { contact: typedEmail || typedPhone })}
                </p>
              ) : null}

              {contacts.length > 0 ? (
                <button
                  type="button"
                  className="invite-link"
                  onClick={() => {
                    setMode('search');
                    setAttempted(false);
                  }}
                >
                  {t('partners:peoplePage.switchToContacts')}
                </button>
              ) : null}
            </div>
          )}

          {attempted && !canLeaveStep() ? (
            <p className="people-error" role="alert">
              {t('partners:peoplePage.needReach')}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="invite-form">
          <ul className="invite-option-list">
            {fields.map((field) => {
              const taken = takenFieldIds.has(field.id);
              const selected = !taken && fieldIds.includes(field.id);
              return (
                <li key={field.id}>
                  <button
                    type="button"
                    className={`invite-option${selected ? ' is-on' : ''}${taken ? ' is-taken' : ''}`}
                    disabled={taken}
                    aria-pressed={selected}
                    onClick={() => {
                      toggleField(field.id);
                      setAttempted(false);
                    }}
                  >
                    <span className="invite-option-copy">
                      <strong>{field.name}</strong>
                      <span>
                        {taken
                          ? t('partners:peoplePage.alreadyAccess')
                          : selected
                            ? t('partners:peoplePage.groveSelected')
                            : t('partners:peoplePage.groveAdd')}
                      </span>
                    </span>
                    {selected ? <Check size={18} aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {attempted && !canLeaveStep() ? (
            <p className="people-error" role="alert">
              {t('partners:peoplePage.needGrove')}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 3 ? (
        <ul className="invite-option-list">
          {(['Family', 'Collaborator'] as Relationship[]).map((option) => {
            const selected = relationship === option;
            return (
              <li key={option}>
                <button
                  type="button"
                  className={`invite-option${selected ? ' is-on' : ''}`}
                  aria-pressed={selected}
                  onClick={() => pickRelationship(option)}
                >
                  <span className="invite-option-copy">
                    <strong>{t(`partners:peoplePage.relationship.${option}`)}</strong>
                    <span>{t(`partners:peoplePage.relationshipHint.${option}`)}</span>
                  </span>
                  {selected ? <Check size={18} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {step === 4 ? (
        <FieldPermissionPanel
          choice={choice}
          modules={modules}
          role={relationship === 'Collaborator' ? 'Partner' : 'Family'}
          previewMode="invite"
          onPickChoice={pickChoice}
          onChangeModules={(next) => {
            setChoiceTouched(true);
            setModules(next);
          }}
        />
      ) : null}

      {step === 5 ? (
        <div className="invite-preview">
          <div className="invite-preview-card">
            <p className="invite-confirm">
              {typedEmail
                ? t('partners:peoplePage.registerAccount', { email: typedEmail })
                : t('partners:peoplePage.registerAccountPhone', { phone: typedPhone })}
            </p>
            <p className="invite-preview-lead">{t('partners:peoplePage.previewLead', { name: who })}</p>
            {selectedFields.map((field) => (
              <section key={field.id} className="invite-preview-grove">
                <h3>{field.name}</h3>
                <p>
                  {t(`partners:peoplePage.relationship.${relationship}`)} ·{' '}
                  {t(`partners:peoplePage.preset.${choice}`)}
                </p>
                <ul>
                  {modules.map((module) => (
                    <li key={module}>
                      {t('partners:peoplePage.canSee', {
                        module: t(`partners:peoplePage.modules.${module}`),
                      })}
                    </li>
                  ))}
                  {choice !== 'view' ? <li>{t('partners:peoplePage.canRecord')}</li> : null}
                  {choice === 'work' ? <li>{t('partners:peoplePage.canWorkTasks')}</li> : null}
                </ul>
              </section>
            ))}
          </div>
          <div className="invite-preview-never">
            <p>{t('partners:peoplePage.willNot')}</p>
            <ul>
              <li>{t('partners:peoplePage.cannotInvite')}</li>
              <li>{t('partners:peoplePage.cannotChangeGrove')}</li>
              <li>{t('partners:peoplePage.cannotOwn')}</li>
            </ul>
          </div>
        </div>
      ) : null}
      </>
      ) : null}
    </PartnersSheet>
  );
};

export default InvitePersonSheet;
