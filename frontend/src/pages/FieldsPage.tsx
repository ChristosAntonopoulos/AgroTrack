import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFieldService, getTaskService, getUserService, isMockMode } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { User } from '../services/userService';
import { demoStore } from '../services/demo/demoStore';
import { getApiErrorMessage } from '../utils/translateApiError';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import FieldsMap from '../components/Field/FieldsMap';
import FieldCard, { FieldCardStats } from '../components/Field/FieldCard';
import {
  Plus,
  Layers,
  Map as MapIcon,
  List as ListIcon,
  Search,
  AlertTriangle,
  CheckSquare,
  Sprout,
} from 'lucide-react';
import './FieldsPage.css';

type SortKey = 'name' | 'area' | 'overdue';

const FieldsPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common', 'errors']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldTasks, setFieldTasks] = useState<Map<string, Task[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [producersById, setProducersById] = useState<Map<string, User>>(new Map());

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    if (!isMockMode() && user?.role === 'FieldOwner') {
      getUserService()
        .getUsers('Producer')
        .then((users) => setProducersById(new Map(users.map((u) => [u.id, u]))))
        .catch(() => undefined);
    }
  }, [user?.role]);

  useEffect(() => {
    if (fields.length > 0) loadFieldTasks();
  }, [fields]);

  const loadFields = async () => {
    try {
      setLoading(true);
      const fieldService = getFieldService();
      setFields(await fieldService.getFields());
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

  const getFieldTaskStats = (fieldId: string): FieldCardStats => {
    const tasks = fieldTasks.get(fieldId) || [];
    const now = new Date();
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
      overdue: tasks.filter(
        (task) => task.status !== 'completed' && task.scheduledEnd && new Date(task.scheduledEnd) < now
      ).length,
    };
  };

  const getNextRecommendedTask = (fieldId: string) => {
    const tasks = fieldTasks.get(fieldId) || [];
    return tasks
      .filter((task) => task.status !== 'completed')
      .filter((task) => !user?.userId || !task.assignedTo || task.assignedTo === user.userId)
      .filter((task) => task.scheduledEnd)
      .sort((a, b) => new Date(a.scheduledEnd!).getTime() - new Date(b.scheduledEnd!).getTime())[0];
  };

  const getAssignedProducerNames = (field: Field) => {
    if (isMockMode()) {
      demoStore.ensureSeeded();
      const assignments = demoStore.getAssignments();
      const users = demoStore.getUsers();
      return (assignments[field.id] || [])
        .map((id) => users.find((u) => u.id === id))
        .filter(Boolean)
        .map((u) => `${u!.firstName || ''} ${u!.lastName || ''}`.trim() || u!.email);
    }

    return (field.assignedProducerIds || [])
      .map((id) => producersById.get(id))
      .filter(Boolean)
      .map((u) => `${u!.firstName || ''} ${u!.lastName || ''}`.trim() || u!.email);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('fields:deleteConfirm'))) return;
    try {
      await getFieldService().deleteField(id);
      await loadFields();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fields:failedDelete'));
    }
  };

  const summary = useMemo(() => {
    let overdue = 0;
    let activeTasks = 0;
    fields.forEach((f) => {
      const s = getFieldTaskStats(f.id);
      overdue += s.overdue;
      activeTasks += s.pending + s.inProgress;
    });
    return { overdue, activeTasks };
  }, [fields, fieldTasks]);

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = fields;
    if (q) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.variety || '').toLowerCase().includes(q) ||
          (f.groundType || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'area') return b.area - a.area;
      if (sortBy === 'overdue') {
        return getFieldTaskStats(b.id).overdue - getFieldTaskStats(a.id).overdue;
      }
      return a.name.localeCompare(b.name);
    });
  }, [fields, search, sortBy, fieldTasks]);

  const subtitle =
    user?.role === 'Producer'
      ? t('fields:subtitleProducer')
      : user?.role === 'FieldOwner'
        ? t('fields:subtitleOwner')
        : t('fields:subtitleDefault');

  const canCreate = user?.role !== 'Producer';

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <PageContainer>
      <div className="fields-page">
        <Breadcrumbs />

        <header className="fields-page-header">
          <div className="fields-page-header-text">
            <h1>{t('fields:title')}</h1>
            <p className="fields-subtitle">{subtitle}</p>
          </div>
          {canCreate && (
            <Button to="/fields/new" icon={<Plus />} className="fields-add-btn">
              {t('fields:addField')}
            </Button>
          )}
        </header>

        {fields.length > 0 && (
          <div className="fields-summary-strip">
            <div className="fields-summary-item">
              <Sprout size={18} />
              <span>
                <strong>{fields.length}</strong> {t('fields:summary.fields')}
              </span>
            </div>
            <div className="fields-summary-item">
              <CheckSquare size={18} />
              <span>
                <strong>{summary.activeTasks}</strong> {t('fields:summary.activeTasks')}
              </span>
            </div>
            {summary.overdue > 0 && (
              <div className="fields-summary-item fields-summary-item--warn">
                <AlertTriangle size={18} />
                <span>
                  <strong>{summary.overdue}</strong> {t('fields:summary.overdue')}
                </span>
              </div>
            )}
          </div>
        )}

        {error && <div className="fields-error">{error}</div>}

        {fields.length === 0 ? (
          <EmptyState
            icon={<Layers size={64} />}
            title={t('fields:emptyTitle')}
            description={t('fields:emptyDescription')}
            action={
              canCreate ? (
                <Button to="/fields/new" icon={<Plus />}>
                  {t('fields:createNewField')}
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
                    <option value="overdue">{t('fields:sortOverdue')}</option>
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

            {viewMode === 'map' ? (
              <Card
                title={t('fields:mapTitle')}
                subtitle={t('fields:mapSubtitle')}
                padding="none"
                className="fields-map-card"
              >
                <FieldsMap
                  fields={filteredFields}
                  onFieldPress={(fieldId) => navigate(`/fields/${fieldId}`)}
                  onStartNextTask={(fieldId) => navigate(`/fields/${fieldId}?action=start`)}
                  heightPx={520}
                />
              </Card>
            ) : filteredFields.length === 0 ? (
              <EmptyState
                title={t('fields:emptySearchTitle')}
                description={t('fields:emptySearchDescription')}
              />
            ) : (
              <div className="fields-grid">
                {filteredFields.map((field) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    stats={getFieldTaskStats(field.id)}
                    isOwner={field.ownerId === user?.userId}
                    showProducerInfo={user?.role !== 'Producer'}
                    assignedProducers={getAssignedProducerNames(field)}
                    nextTask={
                      user?.role === 'Producer' ? getNextRecommendedTask(field.id) : undefined
                    }
                    onDelete={field.ownerId === user?.userId ? handleDelete : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default FieldsPage;
