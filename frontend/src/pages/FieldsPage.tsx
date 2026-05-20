import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFieldService } from '../services/serviceFactory';
import { getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { demoStore } from '../services/demo/demoStore';
import { getApiErrorMessage } from '../utils/translateApiError';
import { useLocaleFormatters } from '../hooks/useLocaleFormatters';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LifecycleIndicator from '../components/Field/LifecycleIndicator';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import EmptyState from '../components/Common/EmptyState';
import FieldsMap from '../components/Field/FieldsMap';
import { CheckCircle, Clock, AlertCircle, Plus, Layers, Map as MapIcon, List as ListIcon } from 'lucide-react';
import './FieldsPage.css';

const FieldsPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common', 'errors']);
  const { formatDate } = useLocaleFormatters();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldTasks, setFieldTasks] = useState<Map<string, Task[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    if (fields.length > 0) {
      loadFieldTasks();
    }
  }, [fields]);

  const loadFields = async () => {
    try {
      setLoading(true);
      const fieldService = getFieldService();
      const data = await fieldService.getFields();
      setFields(data);
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

      for (const field of fields) {
        const tasks = await taskService.getTasks(field.id);
        tasksMap.set(field.id, tasks);
      }

      setFieldTasks(tasksMap);
    } catch (err) {
      console.error('Error loading field tasks:', err);
    }
  };

  const getFieldTaskStats = (fieldId: string) => {
    const tasks = fieldTasks.get(fieldId) || [];
    const now = new Date();
    const overdue = tasks.filter(
      (task) => task.status !== 'completed' && task.scheduledEnd && new Date(task.scheduledEnd) < now
    ).length;
    const pendingApprovals = tasks.filter(
      (task) => task.status === 'completed' && task.approvalStatus === 'pending'
    ).length;
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
      overdue,
      pendingApprovals,
    };
  };

  const getNextRecommendedTask = (fieldId: string) => {
    const tasks = fieldTasks.get(fieldId) || [];
    const relevant = tasks
      .filter((task) => task.status !== 'completed')
      .filter((task) => !user?.userId || !task.assignedTo || task.assignedTo === user.userId)
      .filter((task) => task.scheduledEnd)
      .sort((a, b) => new Date(a.scheduledEnd!).getTime() - new Date(b.scheduledEnd!).getTime());
    return relevant[0];
  };

  const getAssignedProducerNames = (fieldId: string) => {
    demoStore.ensureSeeded();
    const assignments = demoStore.getAssignments();
    const users = demoStore.getUsers();
    const producerIds = assignments[fieldId] || [];
    return producerIds
      .map((id) => users.find((u) => u.id === id))
      .filter(Boolean)
      .map((u) => `${u!.firstName || ''} ${u!.lastName || ''}`.trim() || u!.email);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('fields:deleteConfirm'))) {
      try {
        const fieldService = getFieldService();
        await fieldService.deleteField(id);
        await loadFields();
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, t) || t('fields:failedDelete'));
      }
    }
  };

  const subtitle =
    user?.role === 'Producer'
      ? t('fields:subtitleProducer')
      : user?.role === 'FieldOwner'
        ? t('fields:subtitleOwner')
        : t('fields:subtitleDefault');

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <PageContainer>
      <div className="fields-page">
        <Breadcrumbs />
        <div className="fields-header">
          <div>
            <h1>{t('fields:title')}</h1>
            <p className="fields-subtitle">{subtitle}</p>
          </div>
          <div className="fields-header-actions">
            <div className="fields-view-toggle" role="group" aria-label={t('fields:viewModeAria')}>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'outline'}
                size="sm"
                icon={<ListIcon />}
                onClick={() => setViewMode('list')}
              >
                {t('fields:viewList')}
              </Button>
              <Button
                variant={viewMode === 'map' ? 'secondary' : 'outline'}
                size="sm"
                icon={<MapIcon />}
                onClick={() => setViewMode('map')}
              >
                {t('fields:viewMap')}
              </Button>
            </div>
            {user?.role !== 'Producer' ? (
              <Button to="/fields/new" icon={<Plus />}>
                {t('fields:createNewField')}
              </Button>
            ) : null}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {fields.length === 0 ? (
          <EmptyState
            icon={<Layers size={64} />}
            title={t('fields:emptyTitle')}
            description={t('fields:emptyDescription')}
            action={
              <Button to="/fields/new" icon={<Plus />}>
                {t('fields:createNewField')}
              </Button>
            }
          />
        ) : (
          <>
            {viewMode === 'map' ? (
              <Card
                title={t('fields:mapTitle')}
                subtitle={t('fields:mapSubtitle')}
                padding="none"
                className="fields-map-card"
              >
                <FieldsMap
                  fields={fields}
                  onFieldPress={(fieldId) => navigate(`/fields/${fieldId}`)}
                  onStartNextTask={(fieldId) => navigate(`/fields/${fieldId}?action=start`)}
                  onReportIssue={(fieldId) => navigate(`/fields/${fieldId}?action=issue`)}
                  heightPx={520}
                />
              </Card>
            ) : (
              <div className="fields-grid">
                {fields.map((field) => {
                  const stats = getFieldTaskStats(field.id);
                  const isOwner = field.ownerId === user?.userId;
                  const nextTask = getNextRecommendedTask(field.id);
                  const assignedProducers = getAssignedProducerNames(field.id);

                  return (
                    <Card key={field.id} hover className="field-card">
                      <div className="field-card-header">
                        <h3>{field.name}</h3>
                        {!isOwner && <Badge variant="info">{t('common:assigned')}</Badge>}
                      </div>
                      <div className="field-details">
                        <p>
                          <strong>{t('fields:card.area')}:</strong> {t('common:hectares', { count: field.area })}
                        </p>
                        {field.variety && (
                          <p>
                            <strong>{t('fields:card.variety')}:</strong> {field.variety}
                          </p>
                        )}
                        <div className="field-lifecycle">
                          <LifecycleIndicator year={field.currentLifecycleYear} />
                        </div>
                        {field.irrigationStatus && (
                          <p>
                            <strong>{t('fields:card.irrigation')}:</strong> {t('fields:card.irrigationYes')}
                          </p>
                        )}
                        {user?.role !== 'Producer' && assignedProducers.length > 0 ? (
                          <p className="field-assignees">
                            <strong>{t('fields:card.producers')}:</strong> {assignedProducers.join(', ')}
                          </p>
                        ) : null}
                        {user?.role === 'Producer' && nextTask ? (
                          <div className="field-next-task">
                            <strong>{t('fields:card.next')}:</strong> {nextTask.type} ({t('common:due')}:{' '}
                            {formatDate(nextTask.scheduledEnd!)})
                          </div>
                        ) : null}
                      </div>
                      {stats.total > 0 && (
                        <div className="field-monitoring">
                          <div className="monitoring-stats">
                            <div className="stat-item">
                              <CheckCircle className="stat-icon completed" />
                              <span>{stats.completed}</span>
                            </div>
                            <div className="stat-item">
                              <Clock className="stat-icon in-progress" />
                              <span>{stats.inProgress}</span>
                            </div>
                            <div className="stat-item">
                              <AlertCircle className="stat-icon pending" />
                              <span>{stats.pending}</span>
                            </div>
                          </div>
                          <div className="monitoring-total">
                            <strong>{stats.total}</strong> {t('fields:card.tasks', { count: stats.total })}
                          </div>
                        </div>
                      )}

                      {(stats.overdue > 0 || stats.pendingApprovals > 0) && user?.role !== 'Producer' ? (
                        <div className="field-risk-row">
                          {stats.overdue > 0 ? (
                            <Badge variant="warning" size="sm">
                              {t('fields:card.overdue', { count: stats.overdue })}
                            </Badge>
                          ) : null}
                          {stats.pendingApprovals > 0 ? (
                            <Badge variant="info" size="sm">
                              {t('fields:card.awaitingApproval', { count: stats.pendingApprovals })}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="field-actions">
                        <Button to={`/fields/${field.id}`} variant="primary" size="sm">
                          {t('fields:card.view')}
                        </Button>
                        {isOwner && (
                          <>
                            <Button to={`/fields/${field.id}/edit`} variant="success" size="sm">
                              {t('common:edit')}
                            </Button>
                            <Button onClick={() => handleDelete(field.id)} variant="error" size="sm">
                              {t('common:delete')}
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default FieldsPage;
