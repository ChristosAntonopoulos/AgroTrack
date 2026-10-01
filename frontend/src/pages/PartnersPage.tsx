import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import SavedContactSheet from '../components/Partners/SavedContactSheet';
import EditAccessSheet from '../components/people/EditAccessSheet';
import InvitePersonSheet from '../components/people/InvitePersonSheet';
import { useAuth } from '../context/AuthContext';
import { aggregateManagedPeople, presetLabelKey } from '../people/aggregatePeople';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import { getFieldService, getPartnerService, isMockMode } from '../services/serviceFactory';
import { rememberPartnerFieldId, rememberedPartnerFieldId, SavedContact } from '../services/partnerService';
import {
  FieldInvite,
  ManagedContact,
  ManagedPeople,
  PersonAccess,
  PersonFieldAccess,
  fieldPeopleService,
} from '../services/fieldPeopleService';
import './PeoplePage.css';

const emptyManaged = (): ManagedPeople => ({
  people: [],
  pendingInvites: [],
  contacts: [],
  manageableFields: [],
});

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const dayCount = (iso?: string) => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  return Math.round(diff / 86400000);
};

const reachEmail = (value?: string) => (value || '').trim().toLowerCase();
const reachPhone = (value?: string) => (value || '').replace(/[^\d]/g, '');

const PartnersPage: React.FC = () => {
  const { t } = useTranslation(['partners', 'common']);
  const { user } = useAuth();
  const [params, setSearchParams] = useSearchParams();
  const fieldId = params.get('fieldId') || '';
  const [data, setData] = useState<ManagedPeople>(emptyManaged);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSeed, setInviteSeed] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [editing, setEditing] = useState<{ person: PersonAccess; membership: PersonFieldAccess } | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [editingContact, setEditingContact] = useState<ManagedContact | null>(null);
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<{ message: string; onYes: () => void } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user?.userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        if (!isMockMode()) {
          try {
            const managed = await fieldPeopleService.getManagedPeople();
            if (!cancelled && managed.manageableFields.length > 0) {
              setData(managed);
              return;
            }
          } catch {
            /* stitch from per-field reads when the aggregate endpoint is unavailable */
          }
        }
        const fields = await getFieldService().getFields().catch(() => []);
        const owned = fields.filter((field) => field.ownerId === user.userId);
        const membershipsByField: Record<string, Awaited<ReturnType<typeof fieldPeopleService.getPeople>>> = {};
        const invitesByField: Record<string, FieldInvite[]> = {};
        await Promise.all(
          owned.map(async (field) => {
            membershipsByField[field.id] = await fieldPeopleService.getPeople(field.id).catch(() => []);
            invitesByField[field.id] = await fieldPeopleService.listInvites(field.id).catch(() => []);
          })
        );
        const contacts = await getPartnerService().getContacts().catch(() => [] as SavedContact[]);
        if (cancelled) return;
        const ownerName = [user.firstName, user.lastName].filter(Boolean).join(' ');
        setData(
          aggregateManagedPeople({
            fields: owned,
            userId: user.userId,
            ownerDisplayName: ownerName || user.email,
            ownerEmail: user.email,
            membershipsByField,
            invitesByField,
            contacts,
          })
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  const fields = data.manageableFields;
  const selected = fields.find((field) => field.id === fieldId) || null;
  const needle = query.trim().toLowerCase();

  useEffect(() => {
    if (loading || fields.length === 0 || selected) return;
    const remembered = rememberedPartnerFieldId();
    const next = fields.some((field) => field.id === remembered) ? remembered : fields[0].id;
    const nextParams = new URLSearchParams(params);
    nextParams.set('fieldId', next);
    setSearchParams(nextParams, { replace: true });
  }, [loading, fields, selected, params, setSearchParams]);

  const people = useMemo(() => {
    return data.people
      .map((person) => ({
        ...person,
        memberships: fieldId
          ? person.memberships.filter((membership) => membership.fieldId === fieldId)
          : person.memberships,
      }))
      .filter((person) => person.memberships.length > 0)
      .filter((person) => {
        if (!needle) return true;
        const hay = `${person.displayName} ${person.email || ''} ${person.memberships
          .map((membership) => membership.fieldName)
          .join(' ')}`.toLowerCase();
        return hay.includes(needle);
      });
  }, [data.people, fieldId, needle]);

  const invites = useMemo(
    () =>
      data.pendingInvites.filter((invite) => {
        if (fieldId && invite.fieldId !== fieldId) return false;
        if (!needle) return true;
        const hay = `${invite.displayName || ''} ${invite.email || ''} ${invite.phone || ''} ${invite.fieldName}`.toLowerCase();
        return hay.includes(needle);
      }),
    [data.pendingInvites, fieldId, needle]
  );

  const contacts = useMemo(
    () =>
      data.contacts.filter((contact) => {
        if (!needle) return true;
        const hay = `${contact.displayName} ${contact.email || ''} ${contact.phone || ''} ${contact.notes || ''}`.toLowerCase();
        return hay.includes(needle);
      }),
    [data.contacts, needle]
  );

  const onFieldChange = (nextId: string) => {
    if (nextId) rememberPartnerFieldId(nextId);
    const next = new URLSearchParams(params);
    if (nextId) next.set('fieldId', nextId);
    else next.delete('fieldId');
    setSearchParams(next, { replace: true });
  };

  const onThisGrove = (contact: ManagedContact) => {
    const email = reachEmail(contact.email);
    const phone = reachPhone(contact.phone);
    const members = data.people.filter((person) =>
      person.memberships.some((membership) => membership.fieldId === fieldId)
    );
    if (contact.linkedUserId && members.some((person) => person.userId === contact.linkedUserId)) return true;
    if (email && members.some((person) => reachEmail(person.email) === email)) return true;
    return data.pendingInvites.some((invite) => {
      if (invite.fieldId !== fieldId) return false;
      if (email && reachEmail(invite.email) === email) return true;
      return Boolean(phone) && reachPhone(invite.phone) === phone;
    });
  };

  const refresh = () => setTick((value) => value + 1);

  const relationshipLabel = (role: string) =>
    t(`partners:peoplePage.relationship.${role === 'Partner' ? 'Collaborator' : 'Family'}`);

  const presetLabel = (level: string, modules: string[]) =>
    t(`partners:peoplePage.preset.${presetLabelKey(level, modules)}`);

  const ask = (message: string, onYes: () => void) => setConfirm({ message, onYes });

  const removeAccess = (person: PersonAccess, membership: PersonFieldAccess) => {
    const name = person.displayName || person.email || t('partners:peoplePage.thisPerson');
    const field = friendlyFieldLabel(membership.fieldName);
    ask(t('partners:peoplePage.removeConfirm', { name, field }), () => {
      void fieldPeopleService
        .removeMembership(membership.fieldId, person.userId)
        .then(refresh);
    });
  };

  const cancelInvite = (invite: FieldInvite) => {
    ask(t('partners:peoplePage.cancelInviteConfirm'), () => {
      void fieldPeopleService.removeMembership(invite.fieldId, invite.id).then(refresh);
    });
  };

  const copyLink = async (invite: FieldInvite) => {
    if (!invite.shareUrl) return;
    try {
      await navigator.clipboard.writeText(invite.shareUrl);
      setNotice(t('partners:peoplePage.linkCopied'));
    } catch {
      setNotice(invite.shareUrl);
    }
  };

  const asSaved = (contact: ManagedContact): SavedContact => ({
    id: contact.id,
    displayName: contact.displayName,
    phone: contact.phone,
    email: contact.email,
    notes: contact.notes,
    serviceCategoryIds: contact.serviceCategoryIds,
    fieldIds: contact.fieldIds,
    linkedUserId: contact.linkedUserId,
    source: contact.source,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  });

  const openInvite = (seed?: { name?: string; email?: string; phone?: string }) => {
    setInviteSeed(seed || {});
    setInviting(true);
  };

  return (
    <PageContainer>
      <div className="people-page">
        <header className="people-header">
          <div>
            {fields.length > 1 ? (
              <select
                className="people-grove-select"
                aria-label={t('partners:peoplePage.switchGrove')}
                value={selected?.id || ''}
                onChange={(event) => onFieldChange(event.target.value)}
              >
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {friendlyFieldLabel(field.name)}
                  </option>
                ))}
              </select>
            ) : (
              <h1 className="people-title">
                {selected ? friendlyFieldLabel(selected.name) : t('partners:peoplePage.title')}
              </h1>
            )}
            <p className="people-subtitle">{t('partners:peoplePage.focusLead')}</p>
          </div>
        </header>

        {!loading && fields.length === 0 ? (
          <p className="people-empty">
            {t('partners:peoplePage.needField')}{' '}
            <Link to="/fields/new">{t('partners:appAccessAddField')}</Link>
          </p>
        ) : null}
        {!loading && selected && (data.people.length > 0 || data.pendingInvites.length > 0 || data.contacts.length > 0) ? (
          <input
            className="people-input people-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('partners:peoplePage.search')}
            aria-label={t('partners:peoplePage.search')}
          />
        ) : null}

        {notice ? <p className="people-note">{notice}</p> : null}
        {loading ? <LoadingSpinner className="page-inline-loading" /> : null}

        {!loading && selected ? (
          <div className="people-split">
            <section className="people-block" aria-labelledby="people-on-grove">
              <div className="people-block-head">
                <h2 id="people-on-grove">{t('partners:peoplePage.onThisGrove')}</h2>
                <Button variant="primary" size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => openInvite()}>
                  {t('partners:peoplePage.addPerson')}
                </Button>
              </div>
              <p className="people-note">{t('partners:peoplePage.appLead')}</p>
              <div className="people-row">
                <span className="people-avatar" aria-hidden>
                  {initials(selected.ownerDisplayName || selected.ownerEmail || '?')}
                </span>
                <div className="people-row-main">
                  <strong>{selected.ownerDisplayName || selected.ownerEmail}</strong>
                  <div className="people-row-meta">
                    <span>{t('partners:peoplePage.owner')}</span>
                  </div>
                </div>
              </div>

              {people.map((person) =>
                person.memberships.map((membership) => (
                  <div className="people-row" key={`${person.userId}-${membership.fieldId}`}>
                    <span className="people-avatar" aria-hidden>
                      {initials(person.displayName || person.email || '?')}
                    </span>
                    <div className="people-row-main">
                      <strong>{person.displayName || person.email}</strong>
                      <div className="people-row-meta">
                        <span>
                          {relationshipLabel(membership.relationship)} · {presetLabel(membership.accessPreset, membership.modules)}
                        </span>
                      </div>
                    </div>
                    <details className="people-menu">
                      <summary aria-label={t('partners:moreActions')}>⋯</summary>
                      <div className="people-menu-panel">
                        <button type="button" onClick={() => setEditing({ person, membership })}>
                          {t('partners:peoplePage.manage')}
                        </button>
                        {person.email ? (
                          <button type="button" onClick={() => window.location.assign(`mailto:${person.email}`)}>
                            {t('partners:peoplePage.sendEmail')}
                          </button>
                        ) : null}
                        <button type="button" className="is-danger" onClick={() => removeAccess(person, membership)}>
                          {t('partners:peoplePage.removeOn', { field: friendlyFieldLabel(membership.fieldName) })}
                        </button>
                      </div>
                    </details>
                  </div>
                ))
              )}

              {invites.map((invite) => {
                const left = dayCount(invite.expiresAt);
                const who = invite.displayName || invite.email || invite.phone || t('partners:peoplePage.thisPerson');
                return (
                  <div className="people-row" key={invite.id}>
                    <span className="people-avatar" aria-hidden>
                      {initials(who)}
                    </span>
                    <div className="people-row-main">
                      <strong>{who}</strong>
                      <div className="people-row-meta">
                        <span className="people-kind is-invite">{t('partners:peoplePage.kindInvite')}</span>
                        <span>
                          {relationshipLabel(invite.role)} · {presetLabel(invite.accessLevel, invite.modules)}
                          {/^expired$/i.test(invite.status)
                            ? ` · ${t('partners:peoplePage.expired')}`
                            : left != null
                              ? ` · ${t('partners:peoplePage.expiresIn', { count: Math.max(left, 0) })}`
                              : ''}
                        </span>
                      </div>
                    </div>
                    <div className="people-row-actions">
                      <button type="button" className="people-text-button" onClick={() => void copyLink(invite)}>
                        {t('partners:peoplePage.copyLink')}
                      </button>
                      <button
                        type="button"
                        className="people-text-button"
                        onClick={() => void fieldPeopleService.resendInvite(invite.fieldId, invite.id).then(refresh)}
                      >
                        {t('partners:peoplePage.resend')}
                      </button>
                      <button type="button" className="people-text-button is-danger" onClick={() => cancelInvite(invite)}>
                        {t('partners:peoplePage.cancelInvite')}
                      </button>
                    </div>
                  </div>
                );
              })}

              {people.length === 0 && invites.length === 0 ? (
                <p className="people-empty-slot">{needle ? t('partners:peoplePage.noMatch') : t('partners:peoplePage.emptyGrove')}</p>
              ) : null}
            </section>

            <section className="people-block" aria-labelledby="people-notebook">
              <div className="people-block-head">
                <h2 id="people-notebook">{t('partners:peoplePage.yourContacts')}</h2>
                <Button variant="outline" size="sm" onClick={() => setAddingContact(true)} icon={<Plus size={16} aria-hidden />}>
                  {t('partners:peoplePage.notebookAdd')}
                </Button>
              </div>
              <p className="people-note">{t('partners:peoplePage.contactsConnect')}</p>
              {contacts.length === 0 ? (
                <p className="people-empty-slot">{needle ? t('partners:peoplePage.noMatch') : t('partners:peoplePage.emptyContactsShort')}</p>
              ) : null}
              {contacts.map((contact) => {
                const here = onThisGrove(contact);
                const reach = contact.email || contact.phone;
                return (
                  <div className="people-row" key={contact.id}>
                    <span className="people-avatar" aria-hidden>
                      {initials(contact.displayName || '?')}
                    </span>
                    <div className="people-row-main">
                      <strong>{contact.displayName}</strong>
                      <div className="people-row-meta">
                        {reach ? <span>{reach}</span> : <span>{t('partners:peoplePage.kindContact')}</span>}
                      </div>
                    </div>
                    <div className="people-row-actions">
                      {here ? (
                        <span className="people-here">{t('partners:peoplePage.alreadyHere')}</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openInvite({
                              name: contact.displayName,
                              email: contact.email,
                              phone: contact.phone,
                            })
                          }
                        >
                          {t('partners:peoplePage.giveAccess')}
                        </Button>
                      )}
                      <button type="button" className="people-text-button" onClick={() => setEditingContact(contact)}>
                        {t('partners:peoplePage.editContact')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        ) : null}

        {inviting ? (
          <InvitePersonSheet
            fields={fields.map((field) => ({ id: field.id, name: friendlyFieldLabel(field.name) }))}
            contacts={data.contacts}
            people={data.people}
            initialFieldIds={fieldId ? [fieldId] : []}
            initialName={inviteSeed.name}
            initialEmail={inviteSeed.email}
            initialPhone={inviteSeed.phone}
            onClose={() => setInviting(false)}
            onSent={() => {
              setNotice(t('partners:peoplePage.invitedNotice'));
              refresh();
            }}
          />
        ) : null}

        {editing ? (
          <EditAccessSheet
            key={`${editing.person.userId}-${editing.membership.fieldId}`}
            personName={editing.person.displayName || editing.person.email || ''}
            userId={editing.person.userId}
            activeFieldId={editing.membership.fieldId}
            memberships={editing.person.memberships.map((membership) => ({
              fieldId: membership.fieldId,
              fieldName: friendlyFieldLabel(membership.fieldName),
              relationship: membership.relationship,
              accessLevel: membership.accessPreset,
              modules: membership.modules,
            }))}
            onClose={() => setEditing(null)}
            onSaved={refresh}
          />
        ) : null}

        {confirm ? (
          <div className="people-confirm-backdrop" role="presentation" onClick={() => setConfirm(null)}>
            <div
              className="people-confirm"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <p>{confirm.message}</p>
              <div className="people-sheet-actions">
                <Button variant="ghost" onClick={() => setConfirm(null)}>
                  {t('common:cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const action = confirm.onYes;
                    setConfirm(null);
                    action();
                  }}
                >
                  {t('partners:peoplePage.confirmYes')}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {addingContact ? (
          <SavedContactSheet
            fields={fields}
            onClose={() => setAddingContact(false)}
            onSaved={refresh}
          />
        ) : null}
        {editingContact ? (
          <SavedContactSheet
            fields={fields}
            existing={asSaved(editingContact)}
            onClose={() => setEditingContact(null)}
            onSaved={refresh}
          />
        ) : null}
      </div>
    </PageContainer>
  );
};

export default PartnersPage;
