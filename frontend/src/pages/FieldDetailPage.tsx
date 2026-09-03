import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLocaleFormatters } from '../hooks/useLocaleFormatters';
import { useAuth } from '../context/AuthContext';
import { getFieldService } from '../services/serviceFactory';
import { getLifecycleService } from '../services/serviceFactory';
import { getTaskService } from '../services/serviceFactory';
import { getUserService, isMockMode } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Lifecycle } from '../services/lifecycleService';
import { Task } from '../services/taskService';
import { User } from '../services/userService';
import { demoStore } from '../services/demo/demoStore';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LifecycleIndicator from '../components/Field/LifecycleIndicator';
import FieldMonitoring from '../components/Field/FieldMonitoring';
import FieldTaskBoard from '../components/Field/FieldTaskBoard';
import FieldTimeline from '../components/Field/FieldTimeline';
import EvidenceGallery from '../components/Task/EvidenceGallery';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { RefreshCw, Play, Edit, ArrowLeft, UserPlus, Navigation, CalendarDays, MapPin } from 'lucide-react';
import { hasBeforeAfterEvidence, requiresBeforeAfter } from '../utils/taskRules';
import FieldStatusBadge from '../components/fields/FieldStatusBadge';
import GreekCadastreInfoCard from '../components/fields/GreekCadastreInfoCard';
import AreaComparisonCard from '../components/fields/AreaComparisonCard';
import FieldDetailMap from '../components/fields/FieldDetailMap';
import FieldWeatherCard from '../components/fields/FieldWeatherCard';
import FieldIntelligencePanel from '../components/fields/FieldIntelligencePanel';
import FieldAlertList from '../components/fields/FieldAlertList';
import { formatFieldArea, formatFieldAreaSqm, resolveFieldCenter } from '../utils/fieldGeo';
import './FieldDetailPage.css';
type ControlRoomTab = 'board' | 'timeline' | 'evidence';

const FieldDetailPage: React.FC = () => {
  const { t } = useTranslation(['fields', 'common']);
  const { formatDate, formatDateTime } = useLocaleFormatters();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [field, setField] = useState<Field | null>(null);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [showProgressConfirm, setShowProgressConfirm] = useState(false);
  const [assigningProducerId, setAssigningProducerId] = useState<string>('');
  const [producerUsers, setProducerUsers] = useState<User[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState('');
  const [evidenceKind, setEvidenceKind] = useState<'before' | 'after' | 'general'>('general');

  const [controlRoomTab, setControlRoomTab] = useState<ControlRoomTab>('board');
  const handledInitialAction = useRef(false);

  useEffect(() => {
    if (id) {
      loadField();
      loadLifecycle();
      loadTasks();
    }
  }, [id]);

  useEffect(() => {
    if (!user?.userId) return;
    if (isMockMode()) {
      demoStore.ensureSeeded();
      const prefs = demoStore.getFieldUiPrefs(user.userId);
      const next = prefs.fieldDetailTab;
      if (next === 'board' || next === 'timeline' || next === 'evidence') {
        setControlRoomTab(next);
      }
    }
  }, [user?.userId]);

  useEffect(() => {
    if (user?.role !== 'FieldOwner' && user?.role !== 'Administrator') return;
    const loadProducers = async () => {
      try {
        if (isMockMode()) {
          demoStore.ensureSeeded();
          setProducerUsers(demoStore.getUsers().filter((u) => u.role === 'Producer'));
        } else {
          const users = await getUserService().getUsers('Producer');
          setProducerUsers(users);
        }
      } catch {
        setProducerUsers([]);
      }
    };
    void loadProducers();
  }, [user?.role]);

  const loadField = async () => {
    try {
      setLoading(true);
      const fieldService = getFieldService();
      const data = await fieldService.getField(id!);
      setField(data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('fields:controlRoom.failedLoad'));
    } finally {
      setLoading(false);
    }
  };

  const loadLifecycle = async () => {
    try {
      const lifecycleService = getLifecycleService();
      const data = await lifecycleService.getLifecycle(id!);
      setLifecycle(data);
    } catch (err) {
      // Lifecycle might not exist yet, that's okay
      setLifecycle(null);
    }
  };

  const loadTasks = async () => {
    try {
      const taskService = getTaskService();
      const tasksData = await taskService.getTasks(id);
      setTasks(tasksData);
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const getProducerName = (producerId?: string) => {
    if (!producerId) return t('fields:controlRoom.unassigned');
    const fromUsers = producerUsers.find((x) => x.id === producerId);
    if (fromUsers) {
      const name = `${fromUsers.firstName || ''} ${fromUsers.lastName || ''}`.trim();
      return name || fromUsers.email;
    }
    if (isMockMode()) {
      demoStore.ensureSeeded();
      const u = demoStore.getUsers().find((x) => x.id === producerId);
      if (u) {
        const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        return name || u.email;
      }
    }
    return producerId;
  };

  const assignedProducerIds = !isMockMode() && field
    ? (field.assignedProducerIds ?? [])
    : isMockMode() && id
      ? (() => {
          demoStore.ensureSeeded();
          const assignments = demoStore.getAssignments();
          return assignments[id] || [];
        })()
      : [];

  const myTasks = tasks.filter((t) => (t.assignedTo ? t.assignedTo === user?.userId : false));

  const latestEvidence = useMemo(() => {
    const items = tasks
      .flatMap((t) => (t.evidence || []).map((ev) => ({ ...ev, taskTitle: t.title })))
      .filter((ev) => !!ev.photoUrl);
    return items.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);
  }, [tasks]);

  const latestBeforeAfter = useMemo(() => {
    const completedWithPhotos = tasks
      .filter((t) => t.status === 'completed')
      .filter((t) => (t.evidence || []).some((e) => !!e.photoUrl))
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const t = completedWithPhotos[0];
    if (!t) return null;
    const before = (t.evidence || []).filter((e) => (e.kind || 'general') === 'before').map((e) => ({ ...e, taskTitle: t.title }));
    const after = (t.evidence || []).filter((e) => (e.kind || 'general') === 'after').map((e) => ({ ...e, taskTitle: t.title }));
    if (before.length === 0 && after.length === 0) return null;
    return { taskTitle: t.title, before, after };
  }, [tasks]);

  const riskSummary = useMemo(() => {
    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'completed' && t.scheduledEnd && new Date(t.scheduledEnd) < now
    );
    const nextDue = tasks
      .filter((t) => t.status !== 'completed' && t.scheduledEnd)
      .slice()
      .sort((a, b) => new Date(a.scheduledEnd!).getTime() - new Date(b.scheduledEnd!).getTime())[0];
    return {
      overdueCount: overdueTasks.length,
      nextDue,
    };
  }, [tasks]);

  const recommendedNextTaskId = useMemo(() => {
    const producer = user?.role === 'Producer';
    if (!producer || !user?.userId) return null;
    const mine = tasks.filter((t) => t.assignedTo === user.userId && t.status !== 'completed' && t.scheduledEnd);
    if (mine.length === 0) return null;
    mine.sort((a, b) => new Date(a.scheduledEnd!).getTime() - new Date(b.scheduledEnd!).getTime());
    return mine[0].id;
  }, [tasks, user?.role, user?.userId]);

  useEffect(() => {
    if (handledInitialAction.current) return;
    if (!id) return;
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (!action) return;

    if (action === 'start') {
      if (!recommendedNextTaskId) return;
      handledInitialAction.current = true;
      void handleStartRecommended();
      setControlRoomTab('board');
    }
  }, [id, location.search, recommendedNextTaskId]);

  const handleAssignProducer = async () => {
    if (!id || !assigningProducerId) return;
    await getFieldService().assignProducer(id, assigningProducerId);
    setAssigningProducerId('');
    await loadField();
  };

  const handleUnassignProducer = async (producerId: string) => {
    if (!id) return;
    await getFieldService().unassignProducer(id, producerId);
    await loadField();
  };

  const handleStartTask = async (taskId: string) => {
    const taskService = getTaskService();
    await taskService.updateTaskStatus(taskId, 'in_progress');
    await loadTasks();
  };

  const handleCompleteTask = async (taskId: string) => {
    const taskService = getTaskService();
    await taskService.updateTaskStatus(taskId, 'completed');
    await loadTasks();
  };

  const handleAddEvidence = async (taskId: string) => {
    if (!evidenceNotes.trim() && !evidencePhotoUrl.trim()) return;
    const taskService = getTaskService();
    await taskService.addEvidence(
      taskId,
      evidencePhotoUrl.trim() || undefined,
      evidenceNotes.trim() || undefined,
      evidenceKind
    );
    setEvidenceNotes('');
    setEvidencePhotoUrl('');
    setEvidenceKind('general');
    await loadTasks();
  };

  const handleOpenDirections = () => {
    const center = field ? resolveFieldCenter(field) : null;
    if (!center) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${center[0]},${center[1]}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const handleSelectControlRoomTab = (tab: ControlRoomTab) => {
    setControlRoomTab(tab);
    if (!user?.userId || !isMockMode()) return;
    demoStore.ensureSeeded();
    const current = demoStore.getFieldUiPrefs(user.userId);
    demoStore.setFieldUiPrefs(user.userId, { ...current, fieldDetailTab: tab });
    if (tab === 'timeline' && (user.role === 'FieldOwner' || user.role === 'Administrator')) {
      demoStore.markDemoStep(user.userId, user.role, 'owner_view_timeline');
    }
  };

  const handleAdvanceStage = async () => {
    if (!id) return;
    try {
      setLifecycleLoading(true);
      const updated = await getLifecycleService().advanceStage(id);
      setLifecycle(updated);
      await loadField();
    } catch (err: any) {
      setError(err.response?.data?.message || t('fields:controlRoom.failedProgressLifecycle'));
    } finally {
      setLifecycleLoading(false);
    }
  };

  const handleRevertStage = async () => {
    if (!id) return;
    try {
      setLifecycleLoading(true);
      const updated = await getLifecycleService().revertStage(id);
      setLifecycle(updated);
      await loadField();
    } catch (err: any) {
      setError(err.response?.data?.message || t('fields:controlRoom.failedProgressLifecycle'));
    } finally {
      setLifecycleLoading(false);
    }
  };

  const handleStartRecommended = async () => {
    if (!recommendedNextTaskId) return;
    await handleStartTask(recommendedNextTaskId);
  };

  const handleInitializeLifecycle = async () => {
    if (!id) return;

    try {
      setLifecycleLoading(true);
      const lifecycleService = getLifecycleService();
      const newLifecycle = await lifecycleService.initializeLifecycle(id);
      setLifecycle(newLifecycle);
      // Reload field to get updated lifecycle year
      await loadField();
    } catch (err: any) {
      setError(err.response?.data?.message || t('fields:controlRoom.failedInitLifecycle'));
    } finally {
      setLifecycleLoading(false);
    }
  };

  const handleProgressCycle = async () => {
    if (!id || !showProgressConfirm) return;

    try {
      setLifecycleLoading(true);
      const lifecycleService = getLifecycleService();
      const updatedLifecycle = await lifecycleService.progressCycle(id);
      setLifecycle(updatedLifecycle);
      setShowProgressConfirm(false);
      // Reload field to get updated lifecycle year
      await loadField();
    } catch (err: any) {
      setError(err.response?.data?.message || t('fields:controlRoom.failedProgressLifecycle'));
    } finally {
      setLifecycleLoading(false);
    }
  };


  const isFieldOwner = user?.role === 'FieldOwner';
  const isProducer = user?.role === 'Producer';
  const fieldCenter = field ? resolveFieldCenter(field) : null;
  const measuredAreaSqm = field ? formatFieldAreaSqm(field) : undefined;

  if (loading) {    return <LoadingSpinner fullScreen />;
  }

  if (error || !field) {
    return (
      <PageContainer>
        <div className="error-container">
          <div className="error-message">{error || t('fields:controlRoom.failedLoad')}</div>
          <Button to="/fields" icon={<ArrowLeft />} variant="outline">
            {t('fields:controlRoom.backToFields')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="field-detail-page">
        <Breadcrumbs />
        <header className="fd-header">
          <div className="fd-header-main">
            <h1>{field.name}</h1>
            <div className="fd-header-badges">
              {field.status && <FieldStatusBadge status={field.status} />}
              <LifecycleIndicator year={field.currentLifecycleYear} stage={field.currentLifecycleStage || lifecycle?.currentStage} />
            </div>
          </div>
          <div className="fd-header-actions">
            {isFieldOwner || field.ownerId === user?.userId ? (
              <>
                <Button
                  to={`/fields/${field.id}/task-templates`}
                  icon={<CalendarDays />}
                  variant="primary"
                  size="sm"
                >
                  <span className="fd-btn-label">{t('fields:controlRoom.addTaskFromTemplate')}</span>
                </Button>
                <Button to={`/fields/${field.id}/edit`} icon={<Edit />} variant="outline" size="sm">
                  <span className="fd-btn-label">{t('fields:controlRoom.edit')}</span>
                </Button>
              </>
            ) : null}
            <Button to="/fields" icon={<ArrowLeft />} variant="outline" size="sm">
              <span className="fd-btn-label">{t('fields:controlRoom.backToFields')}</span>
            </Button>
          </div>
        </header>

        <div className="fd-status-bar">
          <div className="fd-status-metrics">
            <div className={`fd-metric ${riskSummary.overdueCount > 0 ? 'fd-metric--warn' : ''}`}>
              <span className="fd-metric-value">{riskSummary.overdueCount}</span>
              <span className="fd-metric-label">{t('fields:controlRoom.focusOverdue')}</span>
            </div>
            <div className="fd-metric">
              <span className="fd-metric-value">
                {riskSummary.nextDue?.scheduledEnd ? formatDate(riskSummary.nextDue.scheduledEnd) : '—'}
              </span>
              <span className="fd-metric-label">{t('fields:controlRoom.focusNextDue')}</span>
            </div>
          </div>
          <div className="fd-status-actions">
            {isProducer ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartRecommended}
                disabled={!recommendedNextTaskId}
              >
                {t('fields:controlRoom.startNextTask')}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              icon={<Navigation />}
              onClick={handleOpenDirections}
              disabled={!fieldCenter}
            >
              <span className="fd-btn-label">{t('fields:controlRoom.directions')}</span>
            </Button>
          </div>
        </div>

        {field.boundary ? <FieldAlertList fieldId={field.id} /> : null}

        <section className="fd-hero">
          <div className="fd-hero-map">
            <FieldDetailMap field={field} heightPx={420} />
          </div>
          <div className="fd-hero-panel">
            {fieldCenter ? <FieldWeatherCard fieldId={field.id} /> : null}

            <div className="fd-hero-facts">
              <div className="fd-hero-fact">
                <span className="fd-hero-fact-label">{t('fields:controlRoom.area')}</span>
                <span className="fd-hero-fact-value">{formatFieldArea(field)}</span>
              </div>
              {field.variety && (
                <div className="fd-hero-fact">
                  <span className="fd-hero-fact-label">{t('fields:controlRoom.variety')}</span>
                  <span className="fd-hero-fact-value">{field.variety}</span>
                </div>
              )}
              {field.locationText && (
                <div className="fd-hero-fact fd-hero-fact--wide">
                  <span className="fd-hero-fact-label">
                    <MapPin size={12} aria-hidden /> {t('fields:addField.locationText')}
                  </span>
                  <span className="fd-hero-fact-value">{field.locationText}</span>
                </div>
              )}
            </div>

            {(field.greekCadastre?.officialAreaSqm || measuredAreaSqm) && (
              <AreaComparisonCard
                officialAreaSqm={field.greekCadastre?.officialAreaSqm}
                measuredAreaSqm={measuredAreaSqm}
              />
            )}

            {field.boundary ? <FieldIntelligencePanel fieldId={field.id} /> : null}
          </div>
        </section>

        <div className="fd-layout">          <main className="fd-main">
          <Card className="field-control-room-card" padding="md">
            <div className="fcr-tabs" role="tablist" aria-label={t('fields:controlRoom.tabsAria')}>
              <button
                type="button"
                role="tab"
                aria-selected={controlRoomTab === 'board'}
                className={controlRoomTab === 'board' ? 'active' : ''}
                onClick={() => handleSelectControlRoomTab('board')}
              >
                {t('fields:controlRoom.tabs.board')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={controlRoomTab === 'timeline'}
                className={controlRoomTab === 'timeline' ? 'active' : ''}
                onClick={() => handleSelectControlRoomTab('timeline')}
              >
                {t('fields:controlRoom.tabs.timeline')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={controlRoomTab === 'evidence'}
                className={controlRoomTab === 'evidence' ? 'active' : ''}
                onClick={() => handleSelectControlRoomTab('evidence')}
              >
                {t('fields:controlRoom.tabs.evidence')}
              </button>
            </div>

            <div className="fcr-body">
              {controlRoomTab === 'board' ? (
                <>
                  {tasks.length > 0 && <FieldMonitoring tasks={tasks} />}
                  <FieldTaskBoard
                    fieldId={field.id}
                    tasks={tasks}
                    currentUserId={user?.userId}
                    role={user?.role || ''}
                    onChanged={loadTasks}
                  />
                </>
              ) : null}

              {controlRoomTab === 'timeline' ? <FieldTimeline fieldId={field.id} /> : null}

              {controlRoomTab === 'evidence' ? (
                <div className="fcr-evidence">
                  <div className="fcr-evidence-section">
                    <div className="fcr-evidence-title">{t('fields:controlRoom.latestPhotos')}</div>
                    <EvidenceGallery items={latestEvidence} title="" emptyText={t('fields:controlRoom.noPhotos')} />
                  </div>

                  {latestBeforeAfter ? (
                    <div className="fcr-evidence-section">
                      <div className="fcr-evidence-title">{t('fields:controlRoom.beforeAfter')}</div>
                      <div style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                        <strong>{latestBeforeAfter.taskTitle}</strong>
                      </div>
                      <div className="before-after-grid">
                        <div>
                          <div className="before-after-label">{t('fields:controlRoom.before')}</div>
                          <EvidenceGallery items={latestBeforeAfter.before} title="" emptyText={t('fields:controlRoom.noBeforePhotos')} />
                        </div>
                        <div>
                          <div className="before-after-label">{t('fields:controlRoom.after')}</div>
                          <EvidenceGallery items={latestBeforeAfter.after} title="" emptyText={t('fields:controlRoom.noAfterPhotos')} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

            {isProducer ? (
              <Card className="fd-my-tasks-card">
                <h2 className="fd-sidebar-title">{t('fields:controlRoom.myTasksTitle')}</h2>
                {myTasks.length === 0 ? (
                  <EmptyState
                    title={t('fields:controlRoom.noMyTasks')}
                    description={t('fields:controlRoom.noMyTasksDesc')}
                  />
                ) : (
                  <div className="mytasks-list">
                    {myTasks.map((task) => {
                      const statusVariant = task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'info' : 'warning';
                      const needsPair = requiresBeforeAfter(task.type);
                      const hasPair = hasBeforeAfterEvidence(task);
                      const completeDisabled = needsPair && !hasPair;
                      return (
                        <div key={task.id} className="mytask-item">
                          <div className="mytask-main">
                            <div className="mytask-title">{task.title}</div>
                            <div className="mytask-meta">
                              <Badge variant={statusVariant as any} size="sm">{t(`common:taskStatus.${task.status}`)}</Badge>
                              {task.scheduledEnd ? <span>{t('common:due')}: {formatDate(task.scheduledEnd)}</span> : null}
                            </div>
                          </div>
                          <div className="mytask-actions">
                            {task.status === 'pending' ? (
                              <Button size="sm" variant="secondary" onClick={() => handleStartTask(task.id)}>
                                {t('fields:taskBoard.start')}
                              </Button>
                            ) : null}
                            {task.status !== 'completed' ? (
                              <Button size="sm" variant="success" onClick={() => handleCompleteTask(task.id)} disabled={completeDisabled}>
                                {t('fields:taskBoard.complete')}
                              </Button>
                            ) : null}
                          </div>

                          <div className="mytask-evidence">
                            <div className="evidence-form">
                              {needsPair ? (
                                <select value={evidenceKind} onChange={(e) => setEvidenceKind(e.target.value as any)} aria-label={t('fields:taskBoard.evidenceKind')}>
                                  <option value="before">{t('fields:taskBoard.evidenceBefore')}</option>
                                  <option value="after">{t('fields:taskBoard.evidenceAfter')}</option>
                                  <option value="general">{t('fields:taskBoard.evidenceGeneral')}</option>
                                </select>
                              ) : null}
                              <input
                                type="url"
                                placeholder={t('fields:taskBoard.photoUrlPlaceholder')}
                                value={evidencePhotoUrl}
                                onChange={(e) => setEvidencePhotoUrl(e.target.value)}
                              />
                              <input
                                type="text"
                                placeholder={t('fields:taskBoard.notesPlaceholder')}
                                value={evidenceNotes}
                                onChange={(e) => setEvidenceNotes(e.target.value)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddEvidence(task.id)}
                                disabled={!evidenceNotes.trim() && !evidencePhotoUrl.trim()}
                              >
                                {t('fields:taskBoard.addEvidence')}
                              </Button>
                            </div>
                            {needsPair && !hasPair ? (
                              <div className="mytask-evidence-hint">{t('fields:taskBoard.beforeAfterRequired')}</div>
                            ) : null}

                            {(task.evidence || []).length > 0 ? (
                              <div className="evidence-gallery">
                                {(task.evidence || []).slice().reverse().map((ev, idx) => (
                                  <div key={`${task.id}-ev-${idx}`} className="evidence-item">
                                    {ev.photoUrl ? (
                                      <a href={ev.photoUrl} target="_blank" rel="noreferrer">
                                        <img src={ev.photoUrl} alt={t('fields:controlRoom.tabs.evidence')} />
                                      </a>
                                    ) : null}
                                    <div className="evidence-notes">{ev.notes}</div>
                                    <div className="evidence-time">{formatDateTime(ev.timestamp)}</div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            ) : null}
          </main>

          <aside className="fd-sidebar">
            {field.greekCadastre && (
              <Card className="fd-sidebar-card fd-collapsible-card" padding="none">
                <details className="fd-collapsible" open>
                  <summary className="fd-collapsible-summary">
                    {t('fields:addField.cadastre.referenceTitle')}
                  </summary>
                  <div className="fd-collapsible-body">
                    <GreekCadastreInfoCard cadastre={field.greekCadastre} hideTitle />
                  </div>
                </details>
              </Card>
            )}

            {(field.status === 'Draft' || field.status === 'NeedsBoundaryConfirmation') && isFieldOwner && (
              <Card className="fd-sidebar-card">
                <Button to={`/fields/${field.id}/edit`} variant="primary" size="sm">
                  {t('fields:addField.completeBoundary')}
                </Button>
              </Card>
            )}

            <Card className="fd-sidebar-card">
              <h2 className="fd-sidebar-title">{t('fields:controlRoom.basicInfo')}</h2>
              <dl className="fd-facts">
                <div>
                  <dt>{t('fields:controlRoom.area')}</dt>
                  <dd>{formatFieldArea(field)}</dd>
                </div>
                {field.variety && (
                  <div>
                    <dt>{t('fields:controlRoom.variety')}</dt>
                    <dd>{field.variety}</dd>
                  </div>
                )}
                {field.treeAge && (
                  <div>
                    <dt>{t('fields:controlRoom.treeAge')}</dt>
                    <dd>
                      {field.treeAge} {t('fields:controlRoom.years')}
                    </dd>
                  </div>
                )}
                {field.groundType && (
                  <div>
                    <dt>{t('fields:controlRoom.groundType')}</dt>
                    <dd>{field.groundType}</dd>
                  </div>
                )}
                <div>
                  <dt>{t('fields:controlRoom.irrigation')}</dt>
                  <dd>{field.irrigationStatus ? t('common:yes') : t('common:no')}</dd>
                </div>
              </dl>
            </Card>

            {isFieldOwner && (              <Card className="fd-sidebar-card">
                <h2 className="fd-sidebar-title">{t('fields:controlRoom.lifecycleTitle')}</h2>
                <div className="lifecycle-management lifecycle-compact">
                  <div className="lifecycle-status">
                    <LifecycleIndicator year={field.currentLifecycleYear} stage={lifecycle?.currentStage || field.currentLifecycleStage} />
                  </div>
                  {!lifecycle ? (
                    <Button onClick={handleInitializeLifecycle} disabled={lifecycleLoading} loading={lifecycleLoading} icon={<Play />} variant="primary" size="sm">
                      {t('fields:controlRoom.initializeLifecycle')}
                    </Button>
                  ) : (
                    <div className="lifecycle-info">
                      {lifecycle.cycleStartDate && (
                        <p className="fd-lifecycle-meta">{t('fields:controlRoom.cycleStart')} {formatDate(lifecycle.cycleStartDate)}</p>
                      )}
                      <div className="confirmation-buttons" style={{ marginBottom: '0.5rem' }}>
                        <Button onClick={handleAdvanceStage} disabled={lifecycleLoading} icon={<RefreshCw />} variant="outline" size="sm">
                          {t('fields:controlRoom.advanceStage')}
                        </Button>
                        <Button onClick={handleRevertStage} disabled={lifecycleLoading} variant="outline" size="sm">
                          {t('fields:controlRoom.revertStage')}
                        </Button>
                      </div>
                      {!showProgressConfirm ? (
                        <Button onClick={() => setShowProgressConfirm(true)} disabled={lifecycleLoading} icon={<RefreshCw />} variant="outline" size="sm">
                          {t('fields:controlRoom.progressTo', { year: t(`common:lifecycleYear.${field.currentLifecycleYear === 'low' ? 'high' : 'low'}`) })}
                        </Button>
                      ) : (
                        <div className="progress-confirmation">
                          <p>{t('fields:controlRoom.progressConfirm', { from: t(`common:lifecycleYear.${field.currentLifecycleYear}`), to: t(`common:lifecycleYear.${field.currentLifecycleYear === 'low' ? 'high' : 'low'}`) })}</p>
                          <div className="confirmation-buttons">
                            <Button onClick={handleProgressCycle} disabled={lifecycleLoading} loading={lifecycleLoading} variant="warning" size="sm">{t('fields:controlRoom.progressYes')}</Button>
                            <Button onClick={() => setShowProgressConfirm(false)} disabled={lifecycleLoading} variant="outline" size="sm">{t('common:cancel')}</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {isFieldOwner ? (
              <Card className="fd-sidebar-card">
                <h2 className="fd-sidebar-title">{t('fields:controlRoom.assignments')}</h2>
                <div className="assignments">
                  {assignedProducerIds.length === 0 ? (
                    <p className="assignments-empty">{t('fields:controlRoom.noProducers')}</p>
                  ) : (
                    <div className="assignments-list">
                      {assignedProducerIds.map((pid) => (
                        <div key={pid} className="assignment-item">
                          <span className="assignment-name">{getProducerName(pid)}</span>
                          <Button variant="outline" size="sm" onClick={() => handleUnassignProducer(pid)}>{t('fields:controlRoom.unassign')}</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="assignments-add">
                    <select value={assigningProducerId} onChange={(e) => setAssigningProducerId(e.target.value)}>
                      <option value="">{t('fields:controlRoom.assignProducer')}</option>
                      {producerUsers.map((p) => (
                        <option key={p.id} value={p.id}>{getProducerName(p.id)}</option>
                      ))}
                    </select>
                    <Button variant="primary" size="sm" icon={<UserPlus />} onClick={handleAssignProducer} disabled={!assigningProducerId}>
                      {t('common:confirm')}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}
          </aside>
        </div>
      </div>
    </PageContainer>
  );
};

export default FieldDetailPage;
