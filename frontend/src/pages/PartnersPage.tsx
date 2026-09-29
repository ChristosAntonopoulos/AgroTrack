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
import { SavedContact } from '../services/partnerService';
import {
  FieldInvite,
  ManagedContact,
  ManagedPeople,
  PersonAccess,
  PersonFieldAccess,
  fieldPeopleService,
} from '../services/fieldPeopleService';
import './PeoplePage.css';

type Tab = 'people' | 'invites' | 'contacts';

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

const PartnersPage: React.FC = () => {
  const { t } = useTranslation(['partners', 'common']);
  const { user } = useAuth();
  const [params, setSearchParams] = useSearchParams();
  const fieldId = params.get('fieldId') || '';
  const [data, setData] = useState<ManagedPeople>(emptyManaged);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('people');
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

  const inviteGroups = useMemo(() => {
    const groups = new Map<string, FieldInvite[]>();
    invites.forEach((invite) => {
      const key = (invite.email || invite.phone || invite.displayName || invite.id).trim().toLowerCase();
      const rows = groups.get(key) || [];
      rows.push(invite);
      groups.set(key, rows);
    });
    return [...groups.entries()].map(([key, rows]) => ({ key, rows }));
  }, [invites]);

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
    const next = new URLSearchParams(params);
    if (nextId) next.set('fieldId', nextId);
    else next.delete('fieldId');
    setSearchParams(next, { replace: true });
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
            <h1 className="people-title">{t('partners:peoplePage.title')}</h1>
            <p className="people-subtitle">{t('partners:peoplePage.subtitle')}</p>
            <ul className="people-stats">
              <li>
                <strong>{data.people.length}</strong> {t('partners:peoplePage.statPeople')}
              </li>
              <li>
                <strong>{fields.length}</strong> {t('partners:peoplePage.statFields')}
              </li>
              <li>
                <strong>{data.pendingInvites.length}</strong> {t('partners:peoplePage.statInvites')}
              </li>
            </ul>
          </div>
          <Button
            variant="primary"
            icon={<Plus size={18} aria-hidden />}
            onClick={() => openInvite()}
            disabled={fields.length === 0}
          >
            {t('partners:peoplePage.invite')}
          </Button>
        </header>

        {!loading && fields.length === 0 ? (
          <p className="people-empty">
            {t('partners:peoplePage.needField')}{' '}
            <Link to="/fields/new">{t('partners:appAccessAddField')}</Link>
          </p>
        ) : null}
        {!loading && fields.length > 0 ? (
          <div className="people-toolbar">
            <label className="people-label">
              {t('partners:peoplePage.view')}
              <select
                className="people-select"
                value={fieldId}
                onChange={(event) => onFieldChange(event.target.value)}
              >
                <option value="">{t('partners:allFields')}</option>
                <optgroup label={t('partners:peoplePage.myGroves')}>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {friendlyFieldLabel(field.name)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="people-label">
              {t('partners:peoplePage.search')}
              <input
                className="people-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('partners:peoplePage.search')}
              />
            </label>
          </div>
        ) : null}

        <div className="people-tabs" role="tablist">
          {([
            ['people', t('partners:peoplePage.tabs.people', { count: people.length })],
            ['invites', t('partners:peoplePage.tabs.invites', { count: invites.length })],
            ['contacts', t('partners:peoplePage.tabs.contacts', { count: contacts.length })],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`people-tab${tab === id ? ' is-on' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {notice ? <p className="people-note">{notice}</p> : null}
        {loading ? <LoadingSpinner className="page-inline-loading" /> : null}

        {!loading && tab === 'people' && selected ? (
          <section>
            <h2 className="people-grove-title">{friendlyFieldLabel(selected.name)}</h2>
            <p className="people-note">{t('partners:peoplePage.groveLead')}</p>
            <p className="people-owner-kicker">{t('partners:peoplePage.owner')}</p>
            <article className="people-owner">
              <div className="people-owner-top">
                <span className="people-avatar" aria-hidden>
                  {initials(selected.ownerDisplayName || selected.ownerEmail || '?')}
                </span>
                <div className="people-identity">
                  <h2>{selected.ownerDisplayName || selected.ownerEmail}</h2>
                  <p className="people-meta">
                    {t('partners:peoplePage.owner')} · {t('partners:peoplePage.fullAccess')}
                  </p>
                </div>
                <details className="people-menu">
                  <summary aria-label={t('partners:moreActions')}>⋯</summary>
                  <div className="people-menu-panel">
                    <button type="button" onClick={() => setNotice(t('partners:peoplePage.transferLater'))}>
                      {t('partners:peoplePage.transfer')}
                    </button>
                  </div>
                </details>
              </div>
            </article>
            <div className="people-section-head">
              <h2 className="people-section-label">{t('partners:peoplePage.withAccess')}</h2>
              <Button variant="outline" size="sm" onClick={() => openInvite()} icon={<Plus size={16} aria-hidden />}>
                {t('partners:peoplePage.invite')}
              </Button>
            </div>
            {people.length === 0 ? <p className="people-empty">{t('partners:peoplePage.emptyPeople')}</p> : null}
            {people.map((person) =>
              person.memberships.map((membership) => (
                <div className="people-member-row" key={`${person.userId}-${membership.fieldId}`}>
                  <div>
                    <strong>{person.displayName || person.email}</strong>
                    <div className="people-badge">
                      {relationshipLabel(membership.relationship)} ·{' '}
                      {presetLabel(membership.accessPreset, membership.modules)}
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
          </section>
        ) : null}

        {!loading && tab === 'people' && !selected ? (
          <div className="people-list">
            {people.length === 0 ? <p className="people-empty">{t('partners:peoplePage.emptyPeople')}</p> : null}
            {people.map((person) => (
              <article className="people-card" key={person.userId || person.email || person.displayName}>
                <div className="people-card-top">
                  <span className="people-avatar" aria-hidden>
                    {initials(person.displayName || person.email || '?')}
                  </span>
                  <div className="people-identity">
                    <h2>{person.displayName || person.email}</h2>
                    {person.email ? <p className="people-meta">{person.email}</p> : null}
                  </div>
                  <details className="people-menu">
                    <summary aria-label={t('partners:moreActions')}>⋯</summary>
                    <div className="people-menu-panel">
                      {person.memberships.map((membership) => (
                        <button
                          key={`edit-${membership.fieldId}`}
                          type="button"
                          onClick={() => setEditing({ person, membership })}
                        >
                          {t('partners:peoplePage.editOn', { field: friendlyFieldLabel(membership.fieldName) })}
                        </button>
                      ))}
                      {person.email ? (
                        <button type="button" onClick={() => window.location.assign(`mailto:${person.email}`)}>
                          {t('partners:peoplePage.sendEmail')}
                        </button>
                      ) : null}
                      {person.memberships.map((membership) => (
                        <button
                          key={`remove-${membership.fieldId}`}
                          type="button"
                          className="is-danger"
                          onClick={() => void removeAccess(person, membership)}
                        >
                          {t('partners:peoplePage.removeOn', { field: friendlyFieldLabel(membership.fieldName) })}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
                <p className="people-access-count">
                  {t('partners:peoplePage.accessCount', { count: person.memberships.length })}
                </p>
                <ul className="people-field-rows">
                  {person.memberships.map((membership) => (
                    <li key={membership.fieldId} className="people-field-row">
                      <span className="people-field-name">
                        <span className="people-dot" aria-hidden />
                        {friendlyFieldLabel(membership.fieldName)}
                      </span>
                      <span className="people-field-access">
                        {relationshipLabel(membership.relationship)} · {presetLabel(membership.accessPreset, membership.modules)}
                      </span>
                    </li>
                  ))}
                </ul>
                <details className="people-details">
                  <summary>{t('partners:peoplePage.details')}</summary>
                  {person.memberships.map((membership) => (
                    <div key={`mods-${membership.fieldId}`}>
                      <p className="people-meta">{friendlyFieldLabel(membership.fieldName)}</p>
                      <ul className="people-module-list">
                        {membership.modules.map((module) => (
                          <li key={module}>{t(`partners:peoplePage.modules.${module}`, { defaultValue: module })}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </details>
                <div className="people-card-foot">
                  <button
                    type="button"
                    className="people-text-button"
                    onClick={() => setEditing({ person, membership: person.memberships[0] })}
                  >
                    {t('partners:peoplePage.manage')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && tab === 'invites' ? (
          <div className="people-list">
            {inviteGroups.length === 0 ? <p className="people-empty">{t('partners:peoplePage.emptyInvites')}</p> : null}
            {inviteGroups.map((group) => {
              const first = group.rows[0];
              const sent = dayCount(first.createdAt);
              return (
                <article className="people-card" key={group.key}>
                  <div className="people-invite-top">
                    <div className="people-identity">
                      <h2>{first.displayName || first.email || first.phone}</h2>
                      {first.email && first.displayName ? <p className="people-meta">{first.email}</p> : null}
                      {sent != null ? (
                        <p className="people-meta">{t('partners:peoplePage.sentAgo', { count: Math.abs(sent) })}</p>
                      ) : null}
                    </div>
                  </div>
                  <ul className="people-field-rows">
                    {group.rows.map((invite) => {
                      const left = dayCount(invite.expiresAt);
                      return (
                        <li key={invite.id} className="people-field-row">
                          <span className="people-field-name">
                            <span className="people-dot" aria-hidden />
                            {friendlyFieldLabel(invite.fieldName)}
                          </span>
                          <span className="people-field-access">
                            {relationshipLabel(invite.role)} · {presetLabel(invite.accessLevel, invite.modules)}
                            {/^expired$/i.test(invite.status)
                              ? ` · ${t('partners:peoplePage.expired')}`
                              : left != null
                                ? ` · ${t('partners:peoplePage.expiresIn', { count: Math.max(left, 0) })}`
                                : ''}
                          </span>
                          <span className="people-invite-actions">
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
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        ) : null}

        {!loading && tab === 'contacts' ? (
          <section>
            <p className="people-note">{t('partners:peoplePage.contactsLead')}</p>
            <div className="people-section-head">
              <span />
              <Button variant="outline" size="sm" onClick={() => setAddingContact(true)} icon={<Plus size={16} aria-hidden />}>
                {t('partners:addContact')}
              </Button>
            </div>
            <div className="people-list">
              {contacts.length === 0 ? <p className="people-empty">{t('partners:peoplePage.emptyContacts')}</p> : null}
              {contacts.map((contact) => (
                <article className="people-card" key={contact.id}>
                  <h2>{contact.displayName}</h2>
                  {contact.phone ? <p className="people-meta">{contact.phone}</p> : null}
                  {contact.email ? <p className="people-meta">{contact.email}</p> : null}
                  {contact.notes ? <p className="people-meta">{contact.notes}</p> : null}
                  <div className="people-invite-actions">
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
                      disabled={fields.length === 0}
                    >
                      {t('partners:peoplePage.inviteContact')}
                    </Button>
                    <button type="button" className="people-text-button" onClick={() => setEditingContact(contact)}>
                      {t('partners:peoplePage.editContact')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
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
              setTab('invites');
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
