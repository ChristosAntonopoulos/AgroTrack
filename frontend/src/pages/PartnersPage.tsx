import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Smartphone } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Button from '../components/Common/Button';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import PersonCard from '../components/Partners/PersonCard';
import PartnersFieldPicker from '../components/Partners/PartnersFieldPicker';
import AddFamilySheet from '../components/Partners/AddFamilySheet';
import AddPartnerSheet from '../components/Partners/AddPartnerSheet';
import TeamAccessSection from '../components/Partners/TeamAccessSection';
import SavedContactSheet from '../components/Partners/SavedContactSheet';
import ImportPhoneContactsSheet from '../components/Partners/ImportPhoneContactsSheet';
import NeedHelpSection from '../components/Partners/NeedHelpSection';
import { fromSavedContacts, GrovePerson, linkedFieldIds, occupiesAccessSeat } from '../components/Partners/grovePeople';
import { getFieldService, getPartnerService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import {
  FieldInvite,
  FieldMembership,
  fieldPeopleService,
} from '../services/fieldPeopleService';
import {
  SavedContact,
  ServiceCategory,
  categorySlugForTaskType,
  rememberPartnerFieldId,
} from '../services/partnerService';
import { useAuth } from '../context/AuthContext';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import { canPickDeviceContact } from '../utils/pickDeviceContact';
import { invalidateAccessContext } from '../hooks/useAccessContext';
import { isListedGrove } from '../utils/fieldDisplay';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import './PartnersPage.css';

/** Marketplace browse / offer / requests — hidden until we ship it. */
const SHOW_PARTNER_MARKETPLACE = false;

type InvitePrefill = { name?: string; email?: string };

const PartnersPage: React.FC = () => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const fieldIdParam = params.get('fieldId') || '';
  const addParam = params.get('add') === '1';
  const fromParam = params.get('from') || '';
  const taskTypeParam = params.get('taskType') || params.get('category') || '';
  const [fields, setFields] = useState<Field[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [fieldId, setFieldId] = useState(fieldIdParam && fieldIdParam !== 'all' ? fieldIdParam : '');
  const [people, setPeople] = useState<GrovePerson[]>([]);
  const [peopleByField, setPeopleByField] = useState<Record<string, FieldMembership[]>>({});
  const [loading, setLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [adding, setAdding] = useState(addParam);
  const [addingFamily, setAddingFamily] = useState(false);
  const [addingPartner, setAddingPartner] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<InvitePrefill>({});
  const [inviteTargetFieldId, setInviteTargetFieldId] = useState('');
  const [pendingInvitesById, setPendingInvitesById] = useState<Record<string, FieldInvite>>({});
  const [importingPhone, setImportingPhone] = useState(false);
  const [editing, setEditing] = useState<SavedContact | null>(null);
  const addPersonDrawer = useDrawerPresence(adding);
  const addFamilyDrawer = useDrawerPresence(addingFamily);
  const addPartnerDrawer = useDrawerPresence(addingPartner);
  const importPhoneDrawer = useDrawerPresence(importingPhone);
  const editContactDrawer = useDrawerPresence(editing);
  const [peopleTick, setPeopleTick] = useState(0);
  const [seatsTick, setSeatsTick] = useState(0);
  const canPickPhone = useMemo(() => canPickDeviceContact(), []);

  const groveFields = useMemo(() => fields.filter(isListedGrove), [fields]);
  const listedFields = useMemo(() => {
    if (fieldId && !groveFields.some((field) => field.id === fieldId)) {
      const extra = fields.find((field) => field.id === fieldId);
      if (extra) return [extra, ...groveFields];
    }
    return groveFields;
  }, [fields, fieldId, groveFields]);

  const fieldPeople = useMemo(
    () => (fieldId ? peopleByField[fieldId] || [] : Object.values(peopleByField).flat()),
    [fieldId, peopleByField]
  );

  const canManageField = (id: string) => {
    if (!id || !user?.userId) return false;
    if (user.role === 'Administrator') return true;
    const field = fields.find((row) => row.id === id);
    if (field?.ownerId === user.userId) return true;
    return (peopleByField[id] || []).some(
      (person) => person.userId === user.userId && person.role === 'Admin'
    );
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [fieldRows, cats] = await Promise.all([
          getFieldService().getFields().catch(() => []),
          getPartnerService().getCategories().catch(() => [] as ServiceCategory[]),
        ]);
        if (cancelled) return;
        setFields(fieldRows);
        setCategories(Array.isArray(cats) ? cats : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!fieldIdParam || fieldIdParam === 'all') {
      setFieldId('');
      return;
    }
    if (fields.some((field) => field.id === fieldIdParam)) {
      setFieldId(fieldIdParam);
      rememberPartnerFieldId(fieldIdParam);
      return;
    }
    setFieldId('');
  }, [loading, fieldIdParam, fields]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setPeopleLoading(true);
      try {
        const saved = await getPartnerService()
          .getContacts()
          .catch(() => [] as SavedContact[]);
        if (cancelled) return;
        setPeople(fromSavedContacts(saved, i18n.language, categories));
      } catch {
        if (!cancelled) {
          setPeople([]);
        }
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peopleTick, i18n.language, categories]);

  useEffect(() => {
    if (!user || listedFields.length === 0) {
      setPeopleByField({});
      return;
    }
    let cancelled = false;
    void (async () => {
      setSeatsLoading(true);
      try {
        const entries = await Promise.all(
          listedFields.map(async (field) => {
            try {
              const rows = await fieldPeopleService.getPeople(field.id);
              return [field.id, rows.map((row) => ({ ...row, fieldId: field.id }))] as const;
            } catch {
              return [field.id, [] as FieldMembership[]] as const;
            }
          })
        );
        if (!cancelled) setPeopleByField(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setPeopleByField({});
      } finally {
        if (!cancelled) setSeatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, groveFields, seatsTick]);

  const onFieldChange = (nextId: string) => {
    setFieldId(nextId);
    rememberPartnerFieldId(nextId);
    const next = new URLSearchParams(params);
    if (nextId) next.set('fieldId', nextId);
    else next.delete('fieldId');
    setSearchParams(next, { replace: true });
  };

  const goSearch = (category: ServiceCategory) => {
    if (!fieldId) return;
    rememberPartnerFieldId(fieldId);
    const q = new URLSearchParams({ fieldId, category: category.slug, categoryId: category.id, radiusKm: '50' });
    const taskId = params.get('taskId');
    if (taskId) q.set('taskId', taskId);
    const start = params.get('start');
    const end = params.get('end');
    if (start) q.set('start', start);
    if (end) q.set('end', end);
    if (params.get('from')) q.set('from', params.get('from')!);
    navigate(`/partners/search?${q.toString()}`);
  };

  useEffect(() => {
    if (!SHOW_PARTNER_MARKETPLACE) return;
    if (loading || !fieldId || categories.length === 0) return;
    if (!taskTypeParam || fromParam !== 'task') return;
    const slug = categorySlugForTaskType(taskTypeParam, categories);
    const match = categories.find((c) => c.slug === slug) || categories.find((c) => c.slug === taskTypeParam);
    if (match) goSearch(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, fieldId, categories, taskTypeParam, fromParam]);

  const scrollToHelp = () => {
    document.getElementById('need-help')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const accessUserIds = useMemo(() => {
    const ids = new Set<string>();
    fieldPeople.forEach((person) => {
      if (person.userId && person.role !== 'Admin') ids.add(person.userId);
    });
    return ids;
  }, [fieldPeople]);

  const accessEmails = useMemo(() => {
    const emails = new Set<string>();
    fieldPeople.forEach((person) => {
      if (person.email) emails.add(person.email.trim().toLowerCase());
    });
    return emails;
  }, [fieldPeople]);

  const visiblePeople = useMemo(
    () =>
      people.filter((person) => {
        if (!person.savedContact) return false;
        if (user?.userId && person.userId === user.userId) return false;
        if (occupiesAccessSeat(person, accessUserIds, accessEmails)) return false;
        if (!fieldId) return true;
        return linkedFieldIds(person).includes(fieldId);
      }),
    [people, user?.userId, accessUserIds, accessEmails, fieldId]
  );
  const peopleCount = visiblePeople.length;

  const fieldPeopleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    listedFields.forEach((field) => {
      const members = (peopleByField[field.id] || []).filter(
        (person) =>
          person.role !== 'Admin' &&
          !/^revoked$/i.test(person.status) &&
          !/^removed$/i.test(person.status)
      );
      const memberUsers = new Set(members.map((person) => person.userId).filter(Boolean));
      const memberEmails = new Set(
        members.map((person) => person.email?.trim().toLowerCase()).filter(Boolean) as string[]
      );
      const extraContacts = people.filter((person) => {
        if (!linkedFieldIds(person).includes(field.id)) return false;
        if (person.userId && memberUsers.has(person.userId)) return false;
        const email = (person.email || person.savedContact?.email || '').trim().toLowerCase();
        if (email && memberEmails.has(email)) return false;
        return true;
      });
      counts[field.id] = members.length + extraContacts.length;
    });
    return counts;
  }, [listedFields, peopleByField, people]);

  const onSeatsChanged = (invite?: FieldInvite) => {
    if (invite?.id) {
      setPendingInvitesById((prev) => ({ ...prev, [invite.id]: invite }));
    }
    setSeatsTick((n) => n + 1);
    invalidateAccessContext();
  };

  const openInviteFamily = (prefill: InvitePrefill = {}, targetFieldId?: string) => {
    const next = targetFieldId || fieldId;
    if (!next) return;
    setInviteTargetFieldId(next);
    setInvitePrefill(prefill);
    setAddingFamily(true);
  };

  const openInvitePartner = (prefill: InvitePrefill = {}, targetFieldId?: string) => {
    const next = targetFieldId || fieldId;
    if (!next) return;
    setInviteTargetFieldId(next);
    setInvitePrefill(prefill);
    setAddingPartner(true);
  };

  const inviteFieldId = inviteTargetFieldId || fieldId;
  const inviteField = fields.find((field) => field.id === inviteFieldId);
  const accessFields = fieldId ? listedFields.filter((field) => field.id === fieldId) : listedFields;

  if (loading) {
    return (
      <PageContainer>
        <div className="partners-page">
          <Breadcrumbs />
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="partners-page">
        <Breadcrumbs />

        <h1 className="partners-page-title">{t('partners:title')}</h1>

        {listedFields.length > 0 ? (
          <PartnersFieldPicker
            fields={listedFields}
            value={fieldId}
            onChange={onFieldChange}
            counts={fieldPeopleCounts}
          />
        ) : null}

        <section className="partners-section partners-contacts-hero" aria-labelledby="my-people-title">
          <div className="partners-section-head">
            <div>
              <h2 id="my-people-title" className="partners-section-title">
                {t('partners:contactsSection')}
                {!peopleLoading && peopleCount > 0 ? (
                  <span className="partners-count">{peopleCount}</span>
                ) : null}
              </h2>
              <p className="partners-lead">{t('partners:contactsSectionHint')}</p>
              <p className="partners-inline-hint">{t('partners:contactsVsUsers')}</p>
            </div>
            {user && (peopleLoading || peopleCount > 0) ? (
              <div className="partners-hero-actions">
                {canPickPhone ? (
                  <Button
                    variant="outline"
                    onClick={() => setImportingPhone(true)}
                    icon={<Smartphone size={18} aria-hidden />}
                  >
                    {t('partners:importPhone.openPhone')}
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  onClick={() => setAdding(true)}
                  icon={<Plus size={18} aria-hidden />}
                >
                  {t('partners:addContact')}
                </Button>
              </div>
            ) : null}
          </div>

          {peopleLoading && <LoadingSpinner className="page-inline-loading" />}

          {!peopleLoading && visiblePeople.length === 0 ? (
            <EmptyState
              title={t('partners:emptyPeople')}
              description={
                fieldId ? t('partners:emptyPeopleHintField') : t('partners:emptyPeopleHint')
              }
              action={
                <div className="partner-actions">
                  {user ? (
                    <Button
                      variant="primary"
                      onClick={() => setAdding(true)}
                      icon={<Plus size={18} aria-hidden />}
                    >
                      {t('partners:addContact')}
                    </Button>
                  ) : null}
                  {user && canPickPhone ? (
                    <Button
                      variant="outline"
                      onClick={() => setImportingPhone(true)}
                      icon={<Smartphone size={18} aria-hidden />}
                    >
                      {t('partners:importPhone.openPhone')}
                    </Button>
                  ) : null}
                  {SHOW_PARTNER_MARKETPLACE ? (
                    <Button variant="outline" onClick={scrollToHelp}>
                      {t('partners:findHelp')}
                    </Button>
                  ) : null}
                </div>
              }
            />
          ) : null}

          <div className="partners-people-list">
            {visiblePeople.map((person) => {
              const inviteField = fieldId
                ? canManageField(fieldId)
                  ? fieldId
                  : ''
                : linkedFieldIds(person).find((id) => canManageField(id)) || '';
              return (
              <PersonCard
                key={person.id}
                person={person}
                fieldId={fieldId}
                fields={fields}
                canManage={Boolean(fieldId) && canManageField(fieldId)}
                onEditContact={(row) => setEditing(row.savedContact || null)}
                onInviteContact={
                  inviteField
                    ? () =>
                        openInviteFamily(
                          {
                            name: person.displayName,
                            email: person.email || person.savedContact?.email || '',
                          },
                          inviteField
                        )
                    : undefined
                }
                onRemoved={() => setPeopleTick((n) => n + 1)}
              />
              );
            })}
          </div>
        </section>

        {user
          ? accessFields.map((field) => (
              <TeamAccessSection
                key={field.id}
                fieldId={field.id}
                fieldName={friendlyFieldLabel(field.name)}
                fieldColor={field.color}
                showFieldHeading={!fieldId}
                people={peopleByField[field.id] || []}
                loading={seatsLoading}
                canManage={canManageField(field.id)}
                pendingInvitesById={pendingInvitesById}
                onAddFamily={() => openInviteFamily({}, field.id)}
                onAddPartner={() => openInvitePartner({}, field.id)}
                onChanged={() => onSeatsChanged()}
              />
            ))
          : null}

        {SHOW_PARTNER_MARKETPLACE ? (
          <>
            <NeedHelpSection categories={categories} disabled={!fieldId} onPick={goSearch} />
            <nav className="partners-footer-links" aria-label={t('partners:nav')}>
              <Link to="/partners/me">{t('partners:offerCta')}</Link>
              <Link to="/partners/requests">{t('partners:requests')}</Link>
            </nav>
          </>
        ) : null}

        {addPersonDrawer.mounted ? (
          <SavedContactSheet
            open={addPersonDrawer.open}
            fieldId={fieldId || undefined}
            fields={fields}
            categories={categories}
            onClose={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              setPeopleTick((n) => n + 1);
            }}
          />
        ) : null}

        {importPhoneDrawer.mounted ? (
          <ImportPhoneContactsSheet
            open={importPhoneDrawer.open}
            fieldId={fieldId || undefined}
            fields={fields}
            categories={categories}
            onClose={() => setImportingPhone(false)}
            onImported={() => setPeopleTick((n) => n + 1)}
          />
        ) : null}

        {addFamilyDrawer.mounted && inviteFieldId ? (
          <AddFamilySheet
            open={addFamilyDrawer.open}
            fieldId={inviteFieldId}
            fieldName={inviteField?.name}
            initialName={invitePrefill.name}
            initialEmail={invitePrefill.email}
            onClose={() => {
              setAddingFamily(false);
              setInvitePrefill({});
              setInviteTargetFieldId('');
            }}
            onCreated={onSeatsChanged}
          />
        ) : null}

        {addPartnerDrawer.mounted && inviteFieldId ? (
          <AddPartnerSheet
            open={addPartnerDrawer.open}
            fieldId={inviteFieldId}
            fieldName={inviteField?.name}
            initialName={invitePrefill.name}
            initialEmail={invitePrefill.email}
            onClose={() => {
              setAddingPartner(false);
              setInvitePrefill({});
              setInviteTargetFieldId('');
            }}
            onCreated={onSeatsChanged}
          />
        ) : null}

        {editContactDrawer.mounted && editContactDrawer.value ? (
          <SavedContactSheet
            open={editContactDrawer.open}
            fieldId={fieldId || undefined}
            fields={fields}
            categories={categories}
            existing={editContactDrawer.value}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              setPeopleTick((n) => n + 1);
            }}
          />
        ) : null}
      </div>
    </PageContainer>
  );
};

export default PartnersPage;
