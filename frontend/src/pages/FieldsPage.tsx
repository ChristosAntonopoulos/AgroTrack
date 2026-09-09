import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useExperienceMode } from '../context/ExperienceModeContext';
import { useOfflineMode } from '../context/OfflineContext';
import { getFieldService, getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { getApiErrorMessage } from '../utils/translateApiError';
import { isDeviceOnline } from '../utils/networkStatus';
import { locationService } from '../services/locationService';
import { resolveFieldCenter } from '../utils/fieldGeo';
import { getFieldShortLocation } from '../utils/shortLocation';
import { countTasksToday, fieldSearchHaystack } from '../utils/fieldDisplay';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import FieldsMap from '../components/Field/FieldsMap';
import FieldCard, { FieldCardStats } from '../components/Field/FieldCard';
import { Plus, Layers, Map as MapIcon, List as ListIcon, Search } from 'lucide-react';
import './FieldsPage.css';

type SortKey = 'name' | 'area' | 'activity' | 'distance';
type ViewMode = 'list' | 'map';

const FieldsPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common', 'errors']);
  const { user } = useAuth();
  const { isEveryday } = useExperienceMode();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldTasks, setFieldTasks] = useState<Map<string, Task[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadFields();
  }, [refreshGeneration]);

  useEffect(() => {
    if (fields.length > 0) loadFieldTasks();
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
      setFields(await getFieldService().getFields());
      setShowingCachedData(!isDeviceOnline());
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadFieldTasks = async () => {
    try {
      const taskService = getTaskService();
      const tasksMap = new Map<string, Task[]>();
      await Promise.all(
        fields.map(async (field) => {
          tasksMap.set(field.id, await taskService.getTasks(field.id));
        })
      );
      setFieldTasks(tasksMap);
    } catch (err) {
      console.error('Error loading field tasks:', err);
    }
  };

  const getFieldCardStats = (fieldId: string): FieldCardStats => ({
    todayTaskCount: countTasksToday(fieldTasks.get(fieldId) || []),
  });

  const canSortByDistance = Boolean(
    userCoords && fields.some((field) => resolveFieldCenter(field))
  );

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = fields;
    if (q) {
      list = list.filter((f) => {
        const short = getFieldShortLocation(f).toLowerCase();
        return fieldSearchHaystack(f).includes(q) || short.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'area') {
        const areaA = a.appMeasuredAreaSqm || a.area || 0;
        const areaB = b.appMeasuredAreaSqm || b.area || 0;
        return areaB - areaA;
      }
      if (sortBy === 'activity') {
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
  }, [fields, search, sortBy, userCoords]);

  const subtitle =
    user?.role === 'Producer'
      ? t('fields:subtitleProducer')
      : user?.role === 'FieldOwner'
        ? t('fields:subtitleOwner')
        : t('fields:subtitleDefault');

  const canCreate = user?.role !== 'Producer';

  return (
    <PageContainer>
      <div className={`fields-page ${isEveryday ? 'fields-page--everyday' : ''}`}>
        <Breadcrumbs />

        <header className="fields-page-header">
          <div className="fields-page-header-text">
            <h1>{t('fields:title')}</h1>
            <p className="fields-subtitle">{subtitle}</p>
          </div>
          {canCreate && (
            <Button to="/fields/new" icon={<Plus />} className="fields-add-btn">
              {t('fields:addFieldCta')}
            </Button>
          )}
        </header>

        {loading ? (
          <LoadingSpinner className="page-inline-loading" />
        ) : (
          <>
            {error && <div className="fields-error">{error}</div>}

            {fields.length === 0 ? (
              <EmptyState
                icon={<Layers size={64} />}
                title={t('fields:emptyTitle')}
                description={t('fields:emptyDescription')}
                action={
                  canCreate ? (
                    <Button to="/fields/new" icon={<Plus />}>
                      {t('fields:addFieldCta')}
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <div className="fields-toolbar">
                  <div className="fields-search-wrap">
                    <Search size={18} className="fields-search-icon" />
                    <input
                      type="search"
                      className="fields-search-input"
                      placeholder={t('fields:searchPlaceholder')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label={t('fields:searchPlaceholder')}
                    />
                  </div>
                  <div className="fields-toolbar-right">
                    <label className="fields-sort">
                      <span className="sr-only">{t('fields:sortLabel')}</span>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                        <option value="name">{t('fields:sortName')}</option>
                        <option value="area">{t('fields:sortArea')}</option>
                        <option value="activity">{t('fields:sortActivity')}</option>
                        {canSortByDistance ? (
                          <option value="distance">{t('fields:sortDistance')}</option>
                        ) : null}
                      </select>
                    </label>
                    <div className="fields-view-toggle" role="group" aria-label={t('fields:viewModeAria')}>
                      <button
                        type="button"
                        className={`fields-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                      >
                        <ListIcon size={16} />
                        <span>{t('fields:viewList')}</span>
                      </button>
                      <button
                        type="button"
                        className={`fields-view-btn ${viewMode === 'map' ? 'active' : ''}`}
                        onClick={() => setViewMode('map')}
                      >
                        <MapIcon size={16} />
                        <span>{t('fields:viewMap')}</span>
                      </button>
                    </div>
                  </div>
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
                        fields={filteredFields}
                        selectedFieldId={selectedFieldId || undefined}
                        onFieldSelect={(fieldId) => setSelectedFieldId(fieldId)}
                        onFieldPress={(fieldId) => navigate(`/fields/${fieldId}`)}
                        heightPx={560}
                      />
                    </div>
                    <div className="fields-split-list">
                      {filteredFields.map((field) => (
                        <FieldCard
                          key={field.id}
                          field={field}
                          stats={getFieldCardStats(field.id)}
                          compact
                          selected={selectedFieldId === field.id}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="fields-list">
                    {filteredFields.map((field) => (
                      <FieldCard key={field.id} field={field} stats={getFieldCardStats(field.id)} />
                    ))}
                  </div>
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
