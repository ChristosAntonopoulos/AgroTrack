import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, MapPin } from 'lucide-react';
import PageContainer from '../components/Common/PageContainer';
import PageHeader from '../components/Common/PageHeader';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Button from '../components/Common/Button';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import PersonCard from '../components/Partners/PersonCard';
import AddPersonSheet from '../components/Partners/AddPersonSheet';
import AddFamilySheet from '../components/Partners/AddFamilySheet';
import FamilySection from '../components/Partners/FamilySection';
import SavedContactSheet from '../components/Partners/SavedContactSheet';
import NeedHelpSection from '../components/Partners/NeedHelpSection';
import { mergeGrovePeople, GrovePerson } from '../components/Partners/grovePeople';
import { getFieldService, getPartnerService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { getFieldShortLocation } from '../utils/shortLocation';
import { fieldPeopleService } from '../services/fieldPeopleService';
import { FamilyCircle, familyService } from '../services/familyService';
import {
  SavedContact,
  ServiceCategory,
  ServiceContactRequest,
  categorySlugForTaskType,
  rememberPartnerFieldId,
  rememberedPartnerFieldId,
} from '../services/partnerService';
import { useAuth } from '../context/AuthContext';
import { useFieldCapacity } from '../hooks/useFieldCapacity';
import { useDrawerPresence } from '../hooks/useDrawerPresence';
import './PartnersPage.css';

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
  const [unassigned, setUnassigned] = useState<GrovePerson[]>([]);
  const [family, setFamily] = useState<FamilyCircle | null>(null);
  const [loading, setLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [adding, setAdding] = useState(addParam);
  const [addingFamily, setAddingFamily] = useState(false);
  const [editing, setEditing] = useState<SavedContact | null>(null);
  const addPersonDrawer = useDrawerPresence(adding);
  const addFamilyDrawer = useDrawerPresence(addingFamily);
  const editContactDrawer = useDrawerPresence(editing);
  const [peopleTick, setPeopleTick] = useState(0);
  const [familyTick, setFamilyTick] = useState(0);

  const selectedField = fields.find((f) => f.id === fieldId) || null;
  const capacity = useFieldCapacity(selectedField);
  const canManage =
    capacity.canOwn || user?.role === 'FieldOwner' || user?.role === 'Administrator' || selectedField?.ownerId === user?.userId;
  const canManageFamily =
    user?.role === 'FieldOwner' ||
    user?.role === 'Administrator' ||
    fields.some((f) => f.ownerId === user?.userId);

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
        const [members, outgoing, saved] = await Promise.all([
          fieldId
            ? fieldPeopleService.getPeople(fieldId).catch(() => [] as Awaited<ReturnType<typeof fieldPeopleService.getPeople>>)
            : Promise.resolve([] as Awaited<ReturnType<typeof fieldPeopleService.getPeople>>),
          getPartnerService()
            .getRequests('outgoing')
            .catch(() => [] as ServiceContactRequest[]),
          getPartnerService()
            .getContacts(fieldId ? { fieldId, includeUnassigned: true } : undefined)
            .catch(() => [] as SavedContact[]),
        ]);
        if (cancelled) return;
        const linked = saved.filter((c) => (fieldId ? c.fieldIds.includes(fieldId) : true));
        const loose = saved.filter((c) => c.fieldIds.length === 0);
        setPeople(mergeGrovePeople(members, outgoing, linked, fieldId, i18n.language, categories));
        setUnassigned(
          fieldId
            ? mergeGrovePeople([], [], loose, fieldId, i18n.language, categories)
            : []
        );
      } catch {
        if (!cancelled) {
          setPeople([]);
          setUnassigned([]);
        }
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldId, peopleTick, i18n.language, categories]);

  useEffect(() => {
    if (!user) {
      setFamily(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setFamilyLoading(true);
      try {
        const circle = await familyService.getMine();
        if (!cancelled) setFamily(circle);
      } catch {
        if (!cancelled) setFamily(null);
      } finally {
        if (!cancelled) setFamilyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, familyTick]);

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
    if (loading || !fieldId || categories.length === 0) return;
    if (!taskTypeParam || fromParam !== 'task') return;
    const slug = categorySlugForTaskType(taskTypeParam, categories);
    const match = categories.find((c) => c.slug === slug) || categories.find((c) => c.slug === taskTypeParam);
    if (match) goSearch(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, fieldId, categories, taskTypeParam, fromParam]);

  const selectField = (id: string) => {
    setFieldId(id);
    rememberPartnerFieldId(id);
  };

  const scrollToHelp = () => {
    document.getElementById('need-help')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const fieldOptions = useMemo(() => fields, [fields]);
  const peopleCount = people.length + unassigned.length;

  if (loading) {
    return (
      <PageContainer>
        <div className="partners-page">
          <Breadcrumbs />
          <PageHeader title={t('partners:homeTitle')} subtitle={t('partners:homeLead')} />
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="partners-page">
        <Breadcrumbs />
        <PageHeader
          title={t('partners:homeTitle')}
          subtitle={t('partners:homeLead')}
          actions={
            user ? (
              <Button onClick={() => setAdding(true)} icon={<Plus size={18} aria-hidden />}>
                {t('partners:addPerson')}
              </Button>
            ) : null
          }
        />

        {user ? (
          <FamilySection
            circle={family}
            loading={familyLoading}
            canManage={canManageFamily}
            onAdd={() => setAddingFamily(true)}
            onChanged={() => setFamilyTick((n) => n + 1)}
          />
        ) : null}

        <div className="partners-context-card">
          <label className="partners-field-picker" htmlFor="partners-field-select">
            <span className="partners-field-picker-label">
              <MapPin size={16} aria-hidden />
              {t('partners:forWhichField')}
            </span>
            <select
              id="partners-field-select"
              value={fieldId}
              onChange={(e) => selectField(e.target.value)}
            >
              <option value="">{t('partners:selectField')}</option>
              {fieldOptions.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                  {getFieldShortLocation(field) ? ` — ${getFieldShortLocation(field)}` : ''}
                </option>
              ))}
            </select>
          </label>
          {fields.length === 0 ? (
            <p className="partners-inline-hint">{t('partners:noFields')}</p>
          ) : !fieldId ? (
            <p className="partners-inline-hint">{t('partners:needField')}</p>
          ) : null}
        </div>

        <section className="partners-section">
          <div className="partners-section-head">
            <div>
              <h2>
                {t('partners:myPeople')}
                {!peopleLoading && peopleCount > 0 ? (
                  <span className="partners-count">{people.length}</span>
                ) : null}
              </h2>
              <p className="partners-lead">{t('partners:myPeopleHint')}</p>
            </div>
          </div>

          {peopleLoading && <LoadingSpinner className="page-inline-loading" />}

          {!peopleLoading && people.length === 0 && unassigned.length === 0 ? (
            <EmptyState
              title={t('partners:emptyPeople')}
              description={t('partners:emptyPeopleHint')}
              action={
                <div className="partner-actions">
                  {user ? (
                    <Button onClick={() => setAdding(true)} icon={<Plus size={18} aria-hidden />}>
                      {t('partners:addPerson')}
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={scrollToHelp}>
                    {t('partners:findHelp')}
                  </Button>
                </div>
              }
            />
          ) : null}

          <div className="partners-people-list">
            {people.map((person) => (
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

        {unassigned.length > 0 ? (
          <section className="partners-section">
            <div className="partners-section-head">
              <div>
                <h2>
                  {t('partners:unassignedContacts')}
                  <span className="partners-count">{unassigned.length}</span>
                </h2>
                <p className="partners-lead">{t('partners:unassignedContactsHint')}</p>
              </div>
            </div>
            <div className="partners-people-list">
              {unassigned.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  fieldId={fieldId}
                  onEditContact={(row) => setEditing(row.savedContact || null)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <NeedHelpSection categories={categories} disabled={!fieldId} onPick={goSearch} />

        <nav className="partners-footer-links" aria-label={t('partners:nav')}>
          <Link to="/partners/me">{t('partners:offerCta')}</Link>
          <Link to="/partners/requests">{t('partners:requests')}</Link>
        </nav>

        {addPersonDrawer.mounted ? (
          <AddPersonSheet
            open={addPersonDrawer.open}
            fieldId={fieldId || undefined}
            fields={fields}
            categories={categories}
            canInvite={Boolean(canManage && fieldId)}
            onClose={() => setAdding(false)}
            onInvited={() => setPeopleTick((n) => n + 1)}
            onSaved={() => setPeopleTick((n) => n + 1)}
          />
        ) : null}

        {addFamilyDrawer.mounted ? (
          <AddFamilySheet
            open={addFamilyDrawer.open}
            onClose={() => setAddingFamily(false)}
            onCreated={() => setFamilyTick((n) => n + 1)}
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
