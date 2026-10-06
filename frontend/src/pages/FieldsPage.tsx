import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOfflineMode } from '../context/OfflineContext';
import { getFieldService, getFieldWorkService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import type { FieldTask } from '../services/fieldWorkService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { isDeviceOnline } from '../utils/networkStatus';
import { locationService } from '../services/locationService';
import { resolveFieldCenter } from '../utils/fieldGeo';
import { getFieldShortLocation } from '../utils/shortLocation';
import {
  countFieldListBuckets,
  countTasksToday,
  fieldHasBoundary,
  fieldSearchHaystack,
  getFieldOpenPath,
  isOwnedField,
  isVisibleOnFieldsList,
} from '../utils/fieldDisplay';
import { distinctFieldColors } from '../utils/fieldColors';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import SegmentedControl from '../components/Common/SegmentedControl';
import FieldsMap from '../components/Field/FieldsMap';
import FieldCard, { FieldCardStats } from '../components/Field/FieldCard';
import { Plus, Layers, Map as MapIcon, List as ListIcon, Search } from 'lucide-react';
import { useModulePageGuard } from '../hooks/useModulePageGuard';
import { useOwnerActivationOptional } from '../onboarding/OwnerActivationContext';
import './FieldsPage.css';

type SortKey = 'name' | 'area' | 'activity' | 'attention' | 'distance';
type ViewMode = 'list' | 'map';
type StatusFilter = 'all' | 'active' | 'archived';

const FieldsPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common', 'errors', 'onboarding']);
  const { user } = useAuth();
  const activation = useOwnerActivationOptional();
  const pageGuard = useModulePageGuard({ module: 'fields' });
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldTasks, setFieldTasks] = useState<Map<string, FieldTask[]>>(new Map());
  const [tasksReady, setTasksReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    void loadFields();
  }, [refreshGeneration, statusFilter]);

  useEffect(() => {
    if (fields.length > 0) void loadFieldTasks();
  }, [fields]);

  useEffect(() => {
    let cancelled = false;
    locationService
      .getCurrentLocation({ enableHighAccuracy: false, timeoutMs: 5000 })
      .then((loc) => {
        if (!cancelled) setUserCoords({ lat: loc.latitude, lng: loc.longitude });
      })
      .catch(() => {
        if (!cancelled) setUserCoords(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFields = async () => {
    try {
      if (fields.length === 0) setLoading(true);
      const status =
        statusFilter === 'archived' ? 'archived' : statusFilter === 'all' ? 'all' : 'active';
      setFields(await getFieldService().getFields('fields', status));
      setShowingCachedData(!isDeviceOnline());
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadFieldTasks = async () => {
    try {
      const fieldWork = getFieldWorkService();
      const all = await fieldWork.listFieldTasks();
      const tasksMap = new Map<string, FieldTask[]>();
      for (const field of fields) {
        tasksMap.set(
          field.id,
          all.filter((task) => task.fieldId === field.id)
        );
      }
      setFieldTasks(tasksMap);
    } catch (err) {
      console.error('Error loading field tasks:', err);
    } finally {
      setTasksReady(true);
    }
  };

  const getFieldCardStats = (fieldId: string): FieldCardStats => ({
    todayTaskCount: countTasksToday(fieldTasks.get(fieldId) || []),
    tasksReady,
  });

  const canSortByDistance = Boolean(
    userCoords && fields.some((field) => resolveFieldCenter(field))
  );

  const sortFields = (list: Field[]): Field[] =>
    [...list].sort((a, b) => {
      if (sortBy === 'area') {
        const areaA = a.appMeasuredAreaSqm || a.area || 0;
        const areaB = b.appMeasuredAreaSqm || b.area || 0;
        return areaB - areaA;
      }
      if (sortBy === 'activity' || sortBy === 'attention') {
        const tasksA = countTasksToday(fieldTasks.get(a.id) || []);
        const tasksB = countTasksToday(fieldTasks.get(b.id) || []);
        if (sortBy === 'attention' && tasksA !== tasksB) return tasksB - tasksA;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'distance' && userCoords) {
        const centerA = resolveFieldCenter(a);
        const centerB = resolveFieldCenter(b);
        const distA = centerA
          ? locationService.calculateDistance(userCoords.lat, userCoords.lng, centerA[0], centerA[1])
          : Number.POSITIVE_INFINITY;
        const distB = centerB
          ? locationService.calculateDistance(userCoords.lat, userCoords.lng, centerB[0], centerB[1])
          : Number.POSITIVE_INFINITY;
        return distA - distB;
      }
      return a.name.localeCompare(b.name);
    });

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = fields.filter((f) => {
      const named = Boolean((f.name || '').trim());
      if (!named) return false;
      if (statusFilter === 'archived') return f.status === 'Archived';
      if (statusFilter === 'all') return true;
      return isVisibleOnFieldsList(f);
    });
    if (q) {
      list = list.filter((f) => {
        const short = getFieldShortLocation(f).toLowerCase();
        return fieldSearchHaystack(f).includes(q) || short.includes(q);
      });
    }
    return sortFields(list);
  }, [fields, search, sortBy, userCoords, statusFilter, fieldTasks]);

  const showCreateEmpty =
    statusFilter === 'archived'
      ? false
      : statusFilter === 'all'
        ? !fields.some((f) => Boolean((f.name || '').trim()))
        : fields.filter(isVisibleOnFieldsList).length === 0;

  const listCounts = useMemo(
    () => countFieldListBuckets(filteredFields, user?.userId),
    [filteredFields, user?.userId]
  );

  const ownedFields = useMemo(
    () => filteredFields.filter((f) => isOwnedField(f, user?.userId)),
    [filteredFields, user?.userId]
  );
  const sharedFields = useMemo(
    () => filteredFields.filter((f) => !isOwnedField(f, user?.userId)),
    [filteredFields, user?.userId]
  );

  const fieldAccents = useMemo(() => distinctFieldColors(fields), [fields]);
  const paintField = (field: Field): Field => ({
    ...field,
    color: fieldAccents[field.id] || field.color,
  });

  useEffect(() => {
    if (selectedFieldId && !filteredFields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(null);
    }
  }, [filteredFields, selectedFieldId]);

  useEffect(() => {
    if (!selectedFieldId) return;
    document.getElementById(`fields-split-item-${selectedFieldId}`)?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    });
  }, [selectedFieldId]);

  const subtitle =
    user?.role === 'Producer'
      ? t('fields:subtitleProducer')
      : user?.role === 'FieldOwner'
        ? t('fields:subtitleOwner')
        : t('fields:subtitleDefault');

  const canCreate = user?.role !== 'Producer';

  const renderCard = (field: Field, compact = false) => (
    <FieldCard
      key={field.id}
      field={paintField(field)}
      stats={getFieldCardStats(field.id)}
      currentUserId={user?.userId}
      compact={compact}
      selected={compact ? selectedFieldId === field.id : undefined}
      onSelect={compact ? setSelectedFieldId : undefined}
      onHover={compact ? setHoveredFieldId : undefined}
      showActivityDate={sortBy === 'activity'}
    />
  );

  const renderSections = (compact = false) => {
    if (ownedFields.length === 0 && sharedFields.length === 0) return null;
    const showSections = ownedFields.length > 0 && sharedFields.length > 0;
    return (
      <>
        {ownedFields.length > 0 ? (
          <section className="fields-section" aria-label={t('fields:summary.mineSection')}>
            {showSections ? <h2 className="fields-section-title">{t('fields:summary.mineSection')}</h2> : null}
            <div className={compact ? undefined : 'fields-list'}>
              {ownedFields.map((field) =>
                compact ? (
                  <div key={field.id} id={`fields-split-item-${field.id}`} role="listitem">
                    {renderCard(field, true)}
                  </div>
                ) : (
                  renderCard(field)
                )
              )}
            </div>
          </section>
        ) : null}
        {sharedFields.length > 0 ? (
          <section className="fields-section" aria-label={t('fields:summary.sharedSection')}>
            {showSections || ownedFields.length === 0 ? (
              <h2 className="fields-section-title">{t('fields:summary.sharedSection')}</h2>
            ) : null}
            <div className={compact ? undefined : 'fields-list'}>
              {sharedFields.map((field) =>
                compact ? (
                  <div key={field.id} id={`fields-split-item-${field.id}`} role="listitem">
                    {renderCard(field, true)}
                  </div>
                ) : (
                  renderCard(field)
                )
              )}
            </div>
          </section>
        ) : null}
      </>
    );
  };

  if (pageGuard.loading) {
    return (
      <PageContainer padding="none">
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer padding="none">
      <div className="fields-page">
        <Breadcrumbs />

        <header className="fields-page-header">
          <div className="fields-page-header-text">
            <h1>{t('fields:title')}</h1>
            <p className="fields-subtitle">{subtitle}</p>
          </div>
          {canCreate ? (
            <div className="fields-page-header-actions">
              <span className="fields-add-btn" data-guide-target="createField">
                <Button
                  to="/fields/new"
                  icon={<Plus size={20} strokeWidth={2.5} />}
                  size="md"
                >
                  {t('fields:addFieldCta')}
                </Button>
              </span>
            </div>
          ) : null}
        </header>

        {loading ? (
          <LoadingSpinner className="page-inline-loading" />
        ) : (
          <>
            {error && <div className="fields-error">{error}</div>}

            {activation?.eligible &&
            activation.primaryField &&
            !fieldHasBoundary(activation.primaryField) ? (
              <div className="fields-setup-nudge" role="status">
                <div>
                  <strong>{t('fields:almostReady.title')}</strong>
                  <p>{t('fields:almostReady.body', { name: activation.primaryField.name })}</p>
                </div>
                <div className="fields-setup-nudge-actions">
                  <Button
                    type="button"
                    onClick={() =>
                      navigate(`/fields/${activation.primaryField!.id}/edit?focus=boundary`)
                    }
                  >
                    {t('fields:almostReady.continuePlace')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate(`/fields/${activation.primaryField!.id}`)}
                  >
                    {t('fields:almostReady.viewGrove')}
                  </Button>
                </div>
              </div>
            ) : null}

            {showCreateEmpty ? (
              <EmptyState
                icon={<Layers size={40} />}
                title={t('fields:emptyTitle')}
                description={t('fields:emptyDescription')}
                action={
                  canCreate ? (
                    <Button
                      icon={<Plus />}
                      onClick={() => {
                        if (activation?.eligible) activation.goToStep('createGrove');
                        else navigate('/fields/new');
                      }}
                    >
                      {t('fields:addFieldCta')}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="fields-toolbar">
                  <div className="fields-toolbar-primary">
                    <div className="fields-search-wrap">
                      <Search size={18} className="fields-search-icon" aria-hidden />
                      <input
                        type="search"
                        className="fields-search-input"
                        placeholder={t('fields:searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label={t('fields:searchPlaceholder')}
                      />
                    </div>
                    <p className="fields-count" aria-live="polite">
                      {statusFilter === 'archived'
                        ? t('fields:summary.archivedCount', {
                            count: filteredFields.length,
                          })
                        : statusFilter === 'all'
                          ? t('fields:summary.fieldsCount', {
                              count: filteredFields.length,
                            })
                          : t('fields:summary.activeCount', {
                              count: listCounts.active,
                            })}
                    </p>
                  </div>
                  <div className="fields-toolbar-right">
                    <label className="fields-sort">
                      <span className="fields-sort-label">{t('fields:sortLabel')}</span>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                        <option value="name">{t('fields:sortName')}</option>
                        <option value="activity">{t('fields:sortActivity')}</option>
                        <option value="attention">{t('fields:sortAttention')}</option>
                        <option value="area">{t('fields:sortArea')}</option>
                        {canSortByDistance ? (
                          <option value="distance">{t('fields:sortDistance')}</option>
                        ) : null}
                      </select>
                    </label>
                    <SegmentedControl
                      ariaLabel={t('fields:viewModeAria')}
                      value={viewMode}
                      onChange={setViewMode}
                      options={[
                        {
                          value: 'list',
                          label: (
                            <>
                              <ListIcon size={16} aria-hidden />
                              <span>{t('fields:viewList')}</span>
                            </>
                          ),
                        },
                        {
                          value: 'map',
                          label: (
                            <>
                              <MapIcon size={16} aria-hidden />
                              <span>{t('fields:viewMap')}</span>
                            </>
                          ),
                        },
                      ]}
                    />
                  </div>
                  <SegmentedControl
                    className="fields-status-tabs"
                    fullWidth
                    ariaLabel={t('fields:summary.filtersAria')}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      {
                        value: 'all',
                        label: t('fields:summary.filter.all'),
                      },
                      {
                        value: 'active',
                        label: t('fields:summary.filter.active'),
                      },
                      {
                        value: 'archived',
                        label: t('fields:summary.filter.archived'),
                      },
                    ]}
                  />
                </div>

                {filteredFields.length === 0 ? (
                  <EmptyState
                    title={t('fields:emptySearchTitle')}
                    description={t('fields:emptySearchDescription')}
                  />
                ) : viewMode === 'map' ? (
                  <div className="fields-split">
                    <div className="fields-split-map">
                      <FieldsMap
                        fields={filteredFields.map(paintField)}
                        selectedFieldId={selectedFieldId || undefined}
                        hoveredFieldId={hoveredFieldId}
                        onFieldSelect={(fieldId) => setSelectedFieldId(fieldId)}
                        onFieldHover={setHoveredFieldId}
                        onFieldPress={(fieldId) => {
                          const field = filteredFields.find((f) => f.id === fieldId);
                          navigate(field ? getFieldOpenPath(field) : `/fields/${fieldId}`);
                        }}
                      />
                    </div>
                    <div className="fields-split-list" role="list" aria-label={t('fields:title')}>
                      {renderSections(true)}
                    </div>
                  </div>
                ) : (
                  renderSections(false)
                )}
              </>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default FieldsPage;
