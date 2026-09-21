import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Smartphone } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Button from '../components/Common/Button';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import PersonCard from '../components/Partners/PersonCard';
import AddPersonSheet from '../components/Partners/AddPersonSheet';
import AddFamilySheet from '../components/Partners/AddFamilySheet';
import AddPartnerSheet from '../components/Partners/AddPartnerSheet';
import TeamAccessSection from '../components/Partners/TeamAccessSection';
import SavedContactSheet from '../components/Partners/SavedContactSheet';
import ImportPhoneContactsSheet from '../components/Partners/ImportPhoneContactsSheet';
import NeedHelpSection from '../components/Partners/NeedHelpSection';
import { fromSavedContacts, GrovePerson, occupiesAccessSeat } from '../components/Partners/grovePeople';
import { getFieldService, getPartnerService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import {
  FieldMembership,
  MAX_FAMILY_SEATS,
  MAX_PARTNER_SEATS,
  countSeats,
  fieldPeopleService,
} from '../services/fieldPeopleService';
import {
  SavedContact,
  ServiceCategory,
  categorySlugForTaskType,
  rememberPartnerFieldId,
  rememberedPartnerFieldId,
} from '../services/partnerService';
import { useAuth } from '../context/AuthContext';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import { canPickDeviceContact } from '../utils/pickDeviceContact';
import { invalidateAccessContext } from '../hooks/useAccessContext';
import './PartnersPage.css';

/** Marketplace browse / offer / requests — hidden until we ship it. */
const SHOW_PARTNER_MARKETPLACE = false;

const PartnersPage: React.FC = () => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const pageGuard = useModulePageGuard({ adminOnly: true });
  const fieldIdParam = params.get('fieldId') || '';
  const addParam = params.get('add') === '1';
  const fromParam = params.get('from') || '';
  const taskTypeParam = params.get('taskType') || params.get('category') || '';
  const [fields, setFields] = useState<Field[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [fieldId, setFieldId] = useState(fieldIdParam || rememberedPartnerFieldId());
  const [people, setPeople] = useState<GrovePerson[]>([]);
  const [fieldPeople, setFieldPeople] = useState<FieldMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [adding, setAdding] = useState(addParam);
  const [addingFamily, setAddingFamily] = useState(false);
  const [addingPartner, setAddingPartner] = useState(false);
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

  const selectedField = fields.find((f) => f.id === fieldId);
  const canManage =
    user?.role === 'FieldOwner' ||
    user?.role === 'Administrator' ||
    selectedField?.ownerId === user?.userId ||
    fieldPeople.some((p) => p.userId === user?.userId && p.role === 'Admin');

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
        const preferred = fieldIdParam || rememberedPartnerFieldId();
        const nextField = fieldRows.some((f) => f.id === preferred) ? preferred : fieldRows[0]?.id || '';
        if (nextField) {
          setFieldId(nextField);
          rememberPartnerFieldId(nextField);
          if (fieldIdParam !== nextField) {
            const next = new URLSearchParams(params);
            next.set('fieldId', nextField);
            setSearchParams(next, { replace: true });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldIdParam]);

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
    if (!user || !fieldId) {
      setFieldPeople([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setSeatsLoading(true);
      try {
        const rows = await fieldPeopleService.getPeople(fieldId);
        if (!cancelled) setFieldPeople(rows);
      } catch {
        if (!cancelled) setFieldPeople([]);
      } finally {
        if (!cancelled) setSeatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, fieldId, seatsTick]);

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
        return !occupiesAccessSeat(person, accessUserIds, accessEmails);
      }),
    [people, user?.userId, accessUserIds, accessEmails]
  );
  const peopleCount = visiblePeople.length;
  const familyUsed = countSeats(fieldPeople, 'Family');
  const partnerUsed = countSeats(fieldPeople, 'Partner');

  const onSeatsChanged = () => {
    setSeatsTick((n) => n + 1);
    invalidateAccessContext();
  };

  if (pageGuard.loading) {
    return (
      <PageContainer>
        <div className="partners-page">
          <Breadcrumbs />
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }
  if (!pageGuard.allowed) {
    return <Navigate to="/chronologio" replace />;
  }

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

        {fields.length > 0 ? (
          <div className="partners-field-picker">
            <label className="partners-field-picker-label">
              <span>{t('partners:forWhichField')}</span>
              <select value={fieldId} onChange={(e) => onFieldChange(e.target.value)}>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <section className="partners-section partners-contacts-hero" aria-labelledby="my-people-title">
          <div className="partners-section-head">
            <div>
              <h1 id="my-people-title" className="partners-page-title">
                {t('partners:contactsSection')}
                {!peopleLoading && peopleCount > 0 ? (
                  <span className="partners-count">{peopleCount}</span>
                ) : null}
              </h1>
              <p className="partners-lead">{t('partners:contactsSectionHint')}</p>
            </div>
            {user ? (
              <div className="partners-hero-actions">
                {canPickPhone ? (
                  <Button
                    onClick={() => setImportingPhone(true)}
                    icon={<Smartphone size={18} aria-hidden />}
                  >
                    {t('partners:importPhone.openPhone')}
                  </Button>
                ) : null}
                <Button
                  variant={canPickPhone ? 'outline' : 'primary'}
                  onClick={() => setAdding(true)}
                  icon={<Plus size={18} aria-hidden />}
                >
                  {t('partners:addPerson')}
                </Button>
              </div>
            ) : null}
          </div>

          {peopleLoading && <LoadingSpinner className="page-inline-loading" />}

          {!peopleLoading && visiblePeople.length === 0 ? (
            <EmptyState
              title={t('partners:emptyPeople')}
              description={t('partners:emptyPeopleHint')}
              action={
                <div className="partner-actions">
                  {user && canPickPhone ? (
                    <Button
                      onClick={() => setImportingPhone(true)}
                      icon={<Smartphone size={18} aria-hidden />}
                    >
                      {t('partners:importPhone.openPhone')}
                    </Button>
                  ) : null}
                  {user ? (
                    <Button
                      variant="outline"
                      onClick={() => setAdding(true)}
                      icon={<Plus size={18} aria-hidden />}
                    >
                      {t('partners:addPerson')}
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
            {visiblePeople.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                fieldId={fieldId}
                fields={fields}
                canManage={canManage}
                onEditContact={(row) => setEditing(row.savedContact || null)}
                onRemoved={() => setPeopleTick((n) => n + 1)}
              />
            ))}
          </div>
        </section>

        {user && fieldId ? (
          <TeamAccessSection
            fieldId={fieldId}
            people={fieldPeople}
            loading={seatsLoading}
            canManage={canManage}
            onAddFamily={() => setAddingFamily(true)}
            onAddPartner={() => setAddingPartner(true)}
            onChanged={onSeatsChanged}
          />
        ) : null}

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
          <AddPersonSheet
            open={addPersonDrawer.open}
            fieldId={fieldId || undefined}
            fields={fields}
            categories={categories}
            canInviteFamily={Boolean(canManage && fieldId && familyUsed < MAX_FAMILY_SEATS)}
            canInvitePartner={Boolean(canManage && fieldId && partnerUsed < MAX_PARTNER_SEATS)}
            onClose={() => setAdding(false)}
            onSaved={() => setPeopleTick((n) => n + 1)}
            onInviteFamily={() => setAddingFamily(true)}
            onInvitePartner={() => setAddingPartner(true)}
            onImportPhone={() => setImportingPhone(true)}
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

        {addFamilyDrawer.mounted && fieldId ? (
          <AddFamilySheet
            open={addFamilyDrawer.open}
            fieldId={fieldId}
            onClose={() => setAddingFamily(false)}
            onCreated={onSeatsChanged}
          />
        ) : null}

        {addPartnerDrawer.mounted && fieldId ? (
          <AddPartnerSheet
            open={addPartnerDrawer.open}
            fieldId={fieldId}
            onClose={() => setAddingPartner(false)}
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
