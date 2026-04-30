import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFieldService } from '../services/serviceFactory';
import { getLifecycleService } from '../services/serviceFactory';
import { getTaskService } from '../services/serviceFactory';
import { Field } from '../services/fieldService';
import { Lifecycle } from '../services/lifecycleService';
import { Task } from '../services/taskService';
import { demoStore } from '../services/demo/demoStore';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import LifecycleIndicator from '../components/Field/LifecycleIndicator';
import FieldMonitoring from '../components/Field/FieldMonitoring';
import FieldsMap from '../components/Field/FieldsMap';
import FieldTaskBoard from '../components/Field/FieldTaskBoard';
import FieldTimeline from '../components/Field/FieldTimeline';
import EvidenceGallery from '../components/Task/EvidenceGallery';
import PageContainer from '../components/Common/PageContainer';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { RefreshCw, Play, Edit, ArrowLeft, CheckCircle2, XCircle, UserPlus, Navigation, Sparkles } from 'lucide-react';
import './FieldDetailPage.css';

const FieldDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [field, setField] = useState<Field | null>(null);
  const [lifecycle, setLifecycle] = useState<Lifecycle | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [showProgressConfirm, setShowProgressConfirm] = useState(false);
  const [assigningProducerId, setAssigningProducerId] = useState<string>('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState('');
  const approvalsRef = useRef<HTMLDivElement | null>(null);

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState<'Leak' | 'Pest' | 'Damage' | 'Equipment'>('Leak');
  const [issueSeverity, setIssueSeverity] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhotoUrl, setIssuePhotoUrl] = useState('');

  useEffect(() => {
    if (id) {
      loadField();
      loadLifecycle();
      loadTasks();
    }
  }, [id]);

  useEffect(() => {
    if (!user?.userId) return;
    if (user.role !== 'FieldOwner' && user.role !== 'Administrator') return;
    demoStore.ensureSeeded();
    const hasApproved = demoStore.getEvents().some((e) => e.type === 'task_approved');
    if (hasApproved) {
      demoStore.markDemoStep(user.userId, user.role, 'owner_view_timeline');
    }
  }, [user?.role, user?.userId]);

  const loadField = async () => {
    try {
      setLoading(true);
      const fieldService = getFieldService();
      const data = await fieldService.getField(id!);
      setField(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load field');
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
    if (!producerId) return 'Unassigned';
    demoStore.ensureSeeded();
    const u = demoStore.getUsers().find((x) => x.id === producerId);
    if (!u) return producerId;
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    return name || u.email;
  };

  const assignedProducerIds = (() => {
    demoStore.ensureSeeded();
    const assignments = demoStore.getAssignments();
    return assignments[id!] || [];
  })();

  const producerUsers = (() => {
    demoStore.ensureSeeded();
    return demoStore.getUsers().filter((u) => u.role === 'Producer');
  })();

  const pendingApprovals = tasks.filter((t) => t.status === 'completed' && t.approvalStatus === 'pending');
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
      approvalsPending: pendingApprovals.length,
    };
  }, [tasks, pendingApprovals.length]);

  const recommendedNextTaskId = useMemo(() => {
    const producer = user?.role === 'Producer';
    if (!producer || !user?.userId) return null;
    const mine = tasks.filter((t) => t.assignedTo === user.userId && t.status !== 'completed' && t.scheduledEnd);
    if (mine.length === 0) return null;
    mine.sort((a, b) => new Date(a.scheduledEnd!).getTime() - new Date(b.scheduledEnd!).getTime());
    return mine[0].id;
  }, [tasks, user?.role, user?.userId]);

  const handleAssignProducer = async () => {
    if (!id || !assigningProducerId) return;
    const fieldService: any = getFieldService();
    if (typeof fieldService.assignProducer === 'function') {
      await fieldService.assignProducer(id, assigningProducerId);
      setAssigningProducerId('');
      await loadField();
    }
  };

  const handleUnassignProducer = async (producerId: string) => {
    if (!id) return;
    const fieldService: any = getFieldService();
    if (typeof fieldService.unassignProducer === 'function') {
      await fieldService.unassignProducer(id, producerId);
      await loadField();
    }
  };

  const handleApprove = async (taskId: string) => {
    const taskService: any = getTaskService();
    if (typeof taskService.approveTask === 'function') {
      await taskService.approveTask(taskId, 'Approved in demo');
      await loadTasks();
    }
  };

  const handleReject = async (taskId: string) => {
    const taskService: any = getTaskService();
    if (typeof taskService.rejectTask === 'function') {
      await taskService.rejectTask(taskId, 'Please add more details/evidence');
      await loadTasks();
    }
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
    await taskService.addEvidence(taskId, evidencePhotoUrl.trim() || undefined, evidenceNotes.trim() || undefined);
    setEvidenceNotes('');
    setEvidencePhotoUrl('');
    await loadTasks();
  };

  const handleOpenDirections = () => {
    if (!field?.latitude || !field?.longitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${field.latitude},${field.longitude}`
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleReviewApprovals = () => {
    approvalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleStartRecommended = async () => {
    if (!recommendedNextTaskId) return;
    await handleStartTask(recommendedNextTaskId);
  };

  const handleSubmitIssue = () => {
    if (!field?.id || !user?.userId) return;
    const title = issueTitle.trim() || `${issueType} reported on ${field.name}`;
    const description = issueDescription.trim() || 'Issue reported from field.';
    const photoUrls = issuePhotoUrl.trim() ? [issuePhotoUrl.trim()] : [];
    demoStore.addIssue({
      fieldId: field.id,
      type: issueType,
      severity: issueSeverity,
      title,
      description,
      photoUrls,
      createdByUserId: user.userId,
      status: 'Open',
    });
    setShowIssueModal(false);
    setIssueTitle('');
    setIssueDescription('');
    setIssuePhotoUrl('');
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
      setError(err.response?.data?.message || 'Failed to initialize lifecycle');
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
      setError(err.response?.data?.message || 'Failed to progress lifecycle');
    } finally {
      setLifecycleLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const isFieldOwner = user?.role === 'FieldOwner';
  const isProducer = user?.role === 'Producer';

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error || !field) {
    return (
      <PageContainer>
        <div className="error-container">
          <div className="error-message">{error || 'Field not found'}</div>
          <Button to="/fields" icon={<ArrowLeft />} variant="outline">
            Back to Fields
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="field-detail-page">
        <Breadcrumbs />
        <div className="field-detail-header">
          <div className="field-header-content">
            <h1>{field.name}</h1>
            <LifecycleIndicator year={field.currentLifecycleYear} />
          </div>
          <div className="field-actions">
            {(isFieldOwner || field.ownerId === user?.userId) && (
              <Button to={`/fields/${field.id}/edit`} icon={<Edit />} variant="success">
                Edit
              </Button>
            )}
            <Button to="/fields" icon={<ArrowLeft />} variant="outline">
              Back to Fields
            </Button>
          </div>
        </div>

        <div className="field-detail-content">
          <Card className="field-hero-card">
            <div className="field-hero">
              <div className="field-hero-left">
                <div className="field-hero-title-row">
                  <Sparkles className="field-hero-icon" />
                  <div>
                    <div className="field-hero-title">Field Control Room</div>
                    <div className="field-hero-subtitle">
                      What’s happening now, what’s next, and what needs attention.
                    </div>
                  </div>
                </div>

                <div className="field-hero-chips">
                  {riskSummary.overdueCount > 0 ? (
                    <Badge variant="warning" size="sm">{riskSummary.overdueCount} overdue</Badge>
                  ) : (
                    <Badge variant="success" size="sm">No overdue tasks</Badge>
                  )}
                  {riskSummary.nextDue?.scheduledEnd ? (
                    <Badge variant="info" size="sm">
                      Next due: {new Date(riskSummary.nextDue.scheduledEnd).toLocaleDateString()}
                    </Badge>
                  ) : (
                    <Badge variant="primary" size="sm">No upcoming due dates</Badge>
                  )}
                  {riskSummary.approvalsPending > 0 ? (
                    <Badge variant="info" size="sm">{riskSummary.approvalsPending} awaiting approval</Badge>
                  ) : (
                    <Badge variant="primary" size="sm">No approvals pending</Badge>
                  )}
                </div>
              </div>

              <div className="field-hero-right">
                <div className="field-hero-actions">
                  {isFieldOwner ? (
                    <Button
                      variant="primary"
                      onClick={handleReviewApprovals}
                      disabled={riskSummary.approvalsPending === 0}
                    >
                      Review approvals
                    </Button>
                  ) : isProducer ? (
                    <Button
                      variant="primary"
                      onClick={handleStartRecommended}
                      disabled={!recommendedNextTaskId}
                    >
                      Start next task
                    </Button>
                  ) : null}

                  <Button
                    variant="outline"
                    icon={<Navigation />}
                    onClick={handleOpenDirections}
                    disabled={!field.latitude || !field.longitude}
                  >
                    Directions
                  </Button>

                  {isProducer ? (
                    <Button variant="outline" onClick={() => setShowIssueModal(true)}>
                      Report issue
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          {showIssueModal ? (
            <div className="issue-modal" role="dialog" aria-modal="true">
              <div className="issue-backdrop" onClick={() => setShowIssueModal(false)} />
              <div className="issue-content">
                <div className="issue-header">
                  <div>
                    <div className="issue-title">Report an issue</div>
                    <div className="issue-subtitle">This will appear in the Owner’s Issues inbox.</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowIssueModal(false)}>
                    Close
                  </Button>
                </div>

                <div className="issue-form">
                  <div className="issue-row">
                    <label>Type</label>
                    <select value={issueType} onChange={(e) => setIssueType(e.target.value as any)}>
                      <option value="Leak">Leak</option>
                      <option value="Pest">Pest</option>
                      <option value="Damage">Damage</option>
                      <option value="Equipment">Equipment</option>
                    </select>
                  </div>
                  <div className="issue-row">
                    <label>Severity</label>
                    <select value={issueSeverity} onChange={(e) => setIssueSeverity(e.target.value as any)}>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="issue-row">
                    <label>Title</label>
                    <input value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} placeholder="Short summary" />
                  </div>
                  <div className="issue-row">
                    <label>Description</label>
                    <textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} placeholder="What did you see?" rows={4} />
                  </div>
                  <div className="issue-row">
                    <label>Photo URL (optional)</label>
                    <input value={issuePhotoUrl} onChange={(e) => setIssuePhotoUrl(e.target.value)} placeholder="https://..." />
                  </div>

                  <div className="issue-actions">
                    <Button variant="outline" onClick={() => setShowIssueModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSubmitIssue}>
                      Submit issue
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <Card className="field-detail-section">
            <h2>Basic Information</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <strong>Area:</strong> {field.area} hectares
            </div>
            {field.variety && (
              <div className="detail-item">
                <strong>Variety:</strong> {field.variety}
              </div>
            )}
            {field.treeAge && (
              <div className="detail-item">
                <strong>Tree Age:</strong> {field.treeAge} years
              </div>
            )}
            {field.groundType && (
              <div className="detail-item">
                <strong>Ground Type:</strong> {field.groundType}
              </div>
            )}
            <div className="detail-item">
              <strong>Irrigation:</strong> {field.irrigationStatus ? 'Yes' : 'No'}
            </div>
          </div>
          </Card>

          <Card className="field-detail-section">
            <h2>Location</h2>
            {field.latitude && field.longitude ? (
              <>
                <div className="detail-item">
                  <strong>Coordinates:</strong> {field.latitude}, {field.longitude}
                </div>
                <div className="field-mini-map">
                  <FieldsMap fields={[field]} heightPx={260} />
                </div>
              </>
            ) : (
              <EmptyState
                title="No GPS coordinates"
                description="Add latitude/longitude to view this field on the map."
              />
            )}
          </Card>

          <Card className="field-detail-section">
            <h2>Latest Photos</h2>
            <EvidenceGallery items={latestEvidence} title="" emptyText="No photos yet for this field." />
          </Card>

          {latestBeforeAfter ? (
            <Card className="field-detail-section">
              <h2>Before / After</h2>
              <div style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                Latest: <strong>{latestBeforeAfter.taskTitle}</strong>
              </div>
              <div className="before-after-grid">
                <div>
                  <div className="before-after-label">Before</div>
                  <EvidenceGallery items={latestBeforeAfter.before} title="" emptyText="No “before” photos yet." />
                </div>
                <div>
                  <div className="before-after-label">After</div>
                  <EvidenceGallery items={latestBeforeAfter.after} title="" emptyText="No “after” photos yet." />
                </div>
              </div>
            </Card>
          ) : null}

          {tasks.length > 0 && (
            <FieldMonitoring tasks={tasks} />
          )}

          <FieldTaskBoard
            fieldId={field.id}
            tasks={tasks}
            currentUserId={user?.userId}
            role={user?.role || ''}
            onChanged={loadTasks}
          />

          <FieldTimeline fieldId={field.id} />

          {isFieldOwner ? (
            <Card className="field-detail-section">
              <h2>Assignments</h2>
              <div className="assignments">
                {assignedProducerIds.length === 0 ? (
                  <div className="assignments-empty">No producers assigned yet.</div>
                ) : (
                  <div className="assignments-list">
                    {assignedProducerIds.map((pid) => (
                      <div key={pid} className="assignment-item">
                        <span className="assignment-name">{getProducerName(pid)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnassignProducer(pid)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="assignments-add">
                  <select
                    value={assigningProducerId}
                    onChange={(e) => setAssigningProducerId(e.target.value)}
                  >
                    <option value="">Select a producer…</option>
                    {producerUsers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {getProducerName(p.id)}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<UserPlus />}
                    onClick={handleAssignProducer}
                    disabled={!assigningProducerId}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {isFieldOwner ? (
            <div ref={approvalsRef}>
              <Card className="field-detail-section">
                <h2>Approvals</h2>
                {pendingApprovals.length === 0 ? (
                  <EmptyState
                    title="No pending approvals"
                    description="Completed work from producers will appear here for approval."
                  />
                ) : (
                  <div className="approvals-list">
                    {pendingApprovals.map((t) => (
                      <div key={t.id} className="approval-item">
                        <div className="approval-main">
                          <div className="approval-title">{t.title}</div>
                          <div className="approval-meta">
                            <Badge variant="info" size="sm">pending</Badge>
                            <span>Producer: {getProducerName(t.assignedTo)}</span>
                            <span>Evidence: {(t.evidence || []).length}</span>
                          </div>
                        </div>
                        <div className="approval-actions">
                          <Button size="sm" variant="success" icon={<CheckCircle2 />} onClick={() => handleApprove(t.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="error" icon={<XCircle />} onClick={() => handleReject(t.id)}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : null}

          {isProducer ? (
            <Card className="field-detail-section">
              <h2>My Tasks</h2>
              {myTasks.length === 0 ? (
                <EmptyState
                  title="No tasks assigned to you here"
                  description="If you’re assigned to this field, your tasks will appear here."
                />
              ) : (
                <div className="mytasks-list">
                  {myTasks.map((t) => {
                    const statusVariant = t.status === 'completed' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning';
                    return (
                      <div key={t.id} className="mytask-item">
                        <div className="mytask-main">
                          <div className="mytask-title">{t.title}</div>
                          <div className="mytask-meta">
                            <Badge variant={statusVariant as any} size="sm">{t.status.replace('_',' ')}</Badge>
                            {t.scheduledEnd ? <span>Due: {new Date(t.scheduledEnd).toLocaleDateString()}</span> : null}
                            {t.approvalStatus && t.approvalStatus !== 'not_required' ? (
                              <span>Approval: {t.approvalStatus}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="mytask-actions">
                          {t.status === 'pending' ? (
                            <Button size="sm" variant="secondary" onClick={() => handleStartTask(t.id)}>
                              Start
                            </Button>
                          ) : null}
                          {t.status !== 'completed' ? (
                            <Button size="sm" variant="success" onClick={() => handleCompleteTask(t.id)}>
                              Complete
                            </Button>
                          ) : null}
                        </div>

                        <div className="mytask-evidence">
                          <div className="evidence-form">
                            <input
                              type="url"
                              placeholder="Photo URL (optional)"
                              value={evidencePhotoUrl}
                              onChange={(e) => setEvidencePhotoUrl(e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              value={evidenceNotes}
                              onChange={(e) => setEvidenceNotes(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddEvidence(t.id)}
                              disabled={!evidenceNotes.trim() && !evidencePhotoUrl.trim()}
                            >
                              Add evidence
                            </Button>
                          </div>

                          {(t.evidence || []).length > 0 ? (
                            <div className="evidence-gallery">
                              {(t.evidence || []).slice().reverse().map((ev, idx) => (
                                <div key={`${t.id}-ev-${idx}`} className="evidence-item">
                                  {ev.photoUrl ? (
                                    <a href={ev.photoUrl} target="_blank" rel="noreferrer">
                                      <img src={ev.photoUrl} alt="Evidence" />
                                    </a>
                                  ) : null}
                                  <div className="evidence-notes">{ev.notes}</div>
                                  <div className="evidence-time">{new Date(ev.timestamp).toLocaleString()}</div>
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

          {isFieldOwner && (
            <Card className="field-detail-section">
              <h2>Lifecycle Management</h2>
              <div className="lifecycle-management">
                <div className="lifecycle-status">
                  <strong>Current Status:</strong>
                  <LifecycleIndicator year={field.currentLifecycleYear} />
                </div>

                {!lifecycle ? (
                  <div className="lifecycle-action">
                    <p>No lifecycle initialized for this field.</p>
                    <Button
                      onClick={handleInitializeLifecycle}
                      disabled={lifecycleLoading}
                      loading={lifecycleLoading}
                      icon={<Play />}
                      variant="primary"
                    >
                      Initialize Lifecycle
                    </Button>
                  </div>
                ) : (
                  <div className="lifecycle-info">
                    <div className="lifecycle-details">
                      <div className="detail-item">
                        <strong>Cycle Start Date:</strong> {formatDate(lifecycle.cycleStartDate)}
                      </div>
                      {lifecycle.lastProgressionDate && (
                        <div className="detail-item">
                          <strong>Last Progression:</strong> {formatDate(lifecycle.lastProgressionDate)}
                        </div>
                      )}
                    </div>

                    {!showProgressConfirm ? (
                      <Button
                        onClick={() => setShowProgressConfirm(true)}
                        disabled={lifecycleLoading}
                        icon={<RefreshCw />}
                        variant="secondary"
                      >
                        Progress to {field.currentLifecycleYear === 'low' ? 'High' : 'Low'} Year
                      </Button>
                    ) : (
                      <div className="progress-confirmation">
                        <p>
                          Are you sure you want to progress the lifecycle? This will change the field
                          from <strong>{field.currentLifecycleYear}</strong> year to{' '}
                          <strong>{field.currentLifecycleYear === 'low' ? 'high' : 'low'}</strong> year.
                          This action cannot be undone.
                        </p>
                        <div className="confirmation-buttons">
                          <Button
                            onClick={handleProgressCycle}
                            disabled={lifecycleLoading}
                            loading={lifecycleLoading}
                            variant="warning"
                          >
                            Yes, Progress Cycle
                          </Button>
                          <Button
                            onClick={() => setShowProgressConfirm(false)}
                            disabled={lifecycleLoading}
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default FieldDetailPage;
