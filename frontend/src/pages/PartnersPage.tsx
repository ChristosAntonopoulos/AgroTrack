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
import AddPersonSheet from '../components/Partners/AddPersonSheet';
import AddFamilySheet from '../components/Partners/AddFamilySheet';
import AddPartnerSheet from '../components/Partners/AddPartnerSheet';
import TeamAccessSection from '../components/Partners/TeamAccessSection';
import SavedContactSheet from '../components/Partners/SavedContactSheet';
import ImportPhoneContactsSheet from '../components/Partners/ImportPhoneContactsSheet';
import NeedHelpSection from '../components/Partners/NeedHelpSection';
import { mergeGrovePeople, GrovePerson } from '../components/Partners/grovePeople';
import { getFieldService, getPartnerService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { fieldPeopleService } from '../services/fieldPeopleService';
import { FamilyCircle, familyService } from '../services/familyService';
import { OwnerPartnerSeat, ownerPartnerService } from '../services/ownerPartnerService';
import {
  SavedContact,
  ServiceCategory,
  ServiceContactRequest,
  categorySlugForTaskType,
  rememberPartnerFieldId,
  rememberedPartnerFieldId,
} from '../services/partnerService';
import { useAuth } from '../context/AuthContext';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import { canPickDeviceContact } from '../utils/pickDeviceContact';
import './PartnersPage.css';

/** Marketplace browse / offer / requests — hidden until we ship it. */
const SHOW_PARTNER_MARKETPLACE = false;

const PartnersPage: React.FC = () => {
  const { t, i18n } = useTranslation(['partners', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fieldIdParam = params.get('fieldId') || '';
  const addParam = params.get('add') === '1';
  const fromParam = params.get('from') || '';
  const taskTypeParam = params.get('taskType') || params.get('category') || '';
  const [fields, setFields] = useState<Field[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [fieldId, setFieldId] = useState(fieldIdParam || rememberedPartnerFieldId());
  const [people, setPeople] = useState<GrovePerson[]>([]);
  const [family, setFamily] = useState<FamilyCircle | null>(null);
  const [partnerSeat, setPartnerSeat] = useState<OwnerPartnerSeat | null>(null);
  const [loading, setLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [partnerLoading, setPartnerLoading] = useState(false);
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
  const [familyTick, setFamilyTick] = useState(0);
  const [partnerTick, setPartnerTick] = useState(0);
  const canPickPhone = useMemo(() => canPickDeviceContact(), []);

  const canManage =
    user?.role === 'FieldOwner' ||
    user?.role === 'Administrator' ||
    fields.some((f) => f.ownerId === user?.userId);
  const canManageFamily = canManage;

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
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldIdParam]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setPeopleLoading(true);
      try {
        const memberLists = await Promise.all(
          fields.map(async (field) => {
            const rows = await fieldPeopleService.getPeople(field.id).catch(() => []);
            return rows.map((member) => ({ ...member, fieldId: field.id }));
          })
        );
        const [outgoing, saved] = await Promise.all([
          getPartnerService()
            .getRequests('outgoing')
            .catch(() => [] as ServiceContactRequest[]),
          getPartnerService()
            .getContacts()
            .catch(() => [] as SavedContact[]),
        ]);
        if (cancelled) return;
        setPeople(
          mergeGrovePeople(memberLists.flat(), outgoing, saved, '', i18n.language, categories)
        );
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
  }, [fields, peopleTick, i18n.language, categories]);

  useEffect(() => {
    if (!user) {
      setFamily(null);
      setPartnerSeat(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setFamilyLoading(true);
      setPartnerLoading(true);
      try {
        const [circle, seat] = await Promise.all([
          familyService.getMine(),
          ownerPartnerService.getMine(),
        ]);
        if (!cancelled) {
          setFamily(circle);
          setPartnerSeat(seat);
        }
      } catch {
        if (!cancelled) {
          setFamily(null);
          setPartnerSeat(null);
        }
      } finally {
        if (!cancelled) {
          setFamilyLoading(false);
          setPartnerLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, familyTick, partnerTick]);

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

  const visiblePeople = useMemo(
    () =>
      people.filter((person) => {
        // Don't list yourself as “looks after the field” — this list is your contacts & helpers.
        if (user?.userId && person.userId === user.userId && !person.savedContact) {
          return false;
        }
        return true;
      }),
    [people, user?.userId]
  );
  const peopleCount = visiblePeople.length;

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

        <section className="partners-section partners-contacts-hero" aria-labelledby="my-people-title">
          <div className="partners-section-head">
            <div>
              <h1 id="my-people-title" className="partners-page-title">
                {t('partners:myPeople')}
                {!peopleLoading && peopleCount > 0 ? (
                  <span className="partners-count">{peopleCount}</span>
                ) : null}
              </h1>
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
                canManage={canManage}
                onEditContact={(row) => setEditing(row.savedContact || null)}
                onRemoved={() => setPeopleTick((n) => n + 1)}
              />
            ))}
          </div>
        </section>

        {user ? (
          <TeamAccessSection
            family={family}
            partnerSeat={partnerSeat}
            loading={familyLoading || partnerLoading}
            canManage={canManageFamily}
            onAddFamily={() => setAddingFamily(true)}
            onAddPartner={() => setAddingPartner(true)}
            onFamilyChanged={() => setFamilyTick((n) => n + 1)}
            onPartnerChanged={() => setPartnerTick((n) => n + 1)}
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
            canInviteFamily={Boolean(
              canManageFamily && (family?.seatsUsed ?? 0) < (family?.seatsMax ?? 2)
            )}
            canInvitePartner={Boolean(
              canManageFamily && (partnerSeat?.seatsUsed ?? 0) < (partnerSeat?.seatsMax ?? 1)
            )}
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

        {addFamilyDrawer.mounted ? (
          <AddFamilySheet
            open={addFamilyDrawer.open}
            onClose={() => setAddingFamily(false)}
            onCreated={() => setFamilyTick((n) => n + 1)}
          />
        ) : null}

        {addPartnerDrawer.mounted ? (
          <AddPartnerSheet
            open={addPartnerDrawer.open}
            onClose={() => setAddingPartner(false)}
            onCreated={() => setPartnerTick((n) => n + 1)}
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
