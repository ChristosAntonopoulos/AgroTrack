import React, { useMemo, useState } from 'react';
import { Task } from '../../services/taskService';
import Button from '../Common/Button';
import Badge from '../Common/Badge';
import Card from '../Common/Card';
import EmptyState from '../Common/EmptyState';
import { demoStore } from '../../services/demo/demoStore';
import { getTaskService } from '../../services/serviceFactory';
import { hasBeforeAfterEvidence, requiresBeforeAfter } from '../../utils/taskRules';
import { CheckCircle2, Play, Plus, UserCog } from 'lucide-react';
import './FieldTaskBoard.css';

type Props = {
  fieldId: string;
  tasks: Task[];
  currentUserId?: string;
  role: string;
  onChanged: () => Promise<void> | void;
};

type ColumnKey = 'overdue' | 'today' | 'thisWeek' | 'done' | 'awaitingApproval';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const getProducerName = (producerId?: string) => {
  if (!producerId) return 'Unassigned';
  demoStore.ensureSeeded();
  const u = demoStore.getUsers().find((x) => x.id === producerId);
  if (!u) return producerId;
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return name || u.email;
};

const FieldTaskBoard: React.FC<Props> = ({ fieldId, tasks, currentUserId, role, onChanged }) => {
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState('');
  const [evidenceKind, setEvidenceKind] = useState<'before' | 'after' | 'general'>('general');
  const [reassignTarget, setReassignTarget] = useState<Record<string, string>>({});

  const now = new Date();
  const today = startOfDay(now);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const columns = useMemo(() => {
    const cols: Record<ColumnKey, Task[]> = {
      overdue: [],
      today: [],
      thisWeek: [],
      done: [],
      awaitingApproval: [],
    };

    const fieldTasks = tasks.filter((t) => t.fieldId === fieldId);
    for (const t of fieldTasks) {
      const due = t.scheduledEnd ? new Date(t.scheduledEnd) : null;
      const isDone = t.status === 'completed';
      const awaitingApproval = isDone && t.approvalStatus === 'pending';

      if (awaitingApproval) {
        cols.awaitingApproval.push(t);
        continue;
      }
      if (isDone) {
        cols.done.push(t);
        continue;
      }
      if (due && due < today) {
        cols.overdue.push(t);
        continue;
      }
      if (due && startOfDay(due).getTime() === today.getTime()) {
        cols.today.push(t);
        continue;
      }
      if (due && due < weekEnd) {
        cols.thisWeek.push(t);
        continue;
      }
      cols.thisWeek.push(t);
    }

    (Object.keys(cols) as ColumnKey[]).forEach((k) => {
      cols[k].sort((a, b) => {
        const ad = a.scheduledEnd ? new Date(a.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
        const bd = b.scheduledEnd ? new Date(b.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
        return ad - bd;
      });
    });

    return cols;
  }, [fieldId, tasks, today.getTime(), weekEnd.getTime()]);

  const producerUsers = useMemo(() => {
    demoStore.ensureSeeded();
    return demoStore.getUsers().filter((u) => u.role === 'Producer');
  }, []);

  const updateStatus = async (taskId: string, status: string) => {
    const service = getTaskService();
    await service.updateTaskStatus(taskId, status);
    await onChanged();
  };

  const addEvidence = async (taskId: string, kind?: 'before' | 'after' | 'general') => {
    if (!evidenceNotes.trim() && !evidencePhotoUrl.trim()) return;
    const service = getTaskService();
    await service.addEvidence(
      taskId,
      evidencePhotoUrl.trim() || undefined,
      evidenceNotes.trim() || undefined,
      kind || evidenceKind
    );
    setEvidenceNotes('');
    setEvidencePhotoUrl('');
    setEvidenceKind('general');
    await onChanged();
  };

  const approve = async (taskId: string) => {
    const service: any = getTaskService();
    if (typeof service.approveTask === 'function') {
      await service.approveTask(taskId, 'Approved');
      await onChanged();
    }
  };

  const reject = async (taskId: string) => {
    const service: any = getTaskService();
    if (typeof service.rejectTask === 'function') {
      await service.rejectTask(taskId, 'Please add more detail');
      await onChanged();
    }
  };

  const reassign = async (taskId: string) => {
    const target = reassignTarget[taskId];
    if (!target) return;
    const service = getTaskService();
    await service.assignTask(taskId, target);
    await onChanged();
  };

  const canActOnTask = (t: Task) => {
    if (role === 'FieldOwner') return true;
    if (role === 'Producer') return !!currentUserId && t.assignedTo === currentUserId;
    return false;
  };

  const renderTaskCard = (t: Task) => {
    const statusVariant =
      t.status === 'completed' ? 'success' : t.status === 'in_progress' ? 'info' : 'warning';
    const dueDate = t.scheduledEnd ? new Date(t.scheduledEnd) : null;
    const dueText = dueDate ? dueDate.toLocaleDateString() : 'No due date';
    const overdueDays =
      dueDate && t.status !== 'completed'
        ? Math.max(0, Math.ceil((startOfDay(today).getTime() - startOfDay(dueDate).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
    const priority = t.priority || 'Medium';
    const est = t.estimatedMinutes;
    const materials = t.materials || [];
    const needsPair = requiresBeforeAfter(t.type);
    const hasPair = hasBeforeAfterEvidence(t);
    const completeDisabled = needsPair && !hasPair;

    return (
      <div key={t.id} className="ftb-task">
        <div className="ftb-task-top">
          <div className="ftb-task-title">{t.title}</div>
          <div className="ftb-task-badges">
            <Badge size="sm" variant={statusVariant as any}>
              {t.status.replace('_', ' ')}
            </Badge>
            {t.approvalStatus && t.approvalStatus !== 'not_required' ? (
              <Badge size="sm" variant="info">
                {t.approvalStatus}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="ftb-task-meta">
          <span>
            <strong>Due:</strong> {dueText}
            {overdueDays > 0 ? <span className="ftb-overdue"> (overdue {overdueDays}d)</span> : null}
          </span>
          <span><strong>Producer:</strong> {getProducerName(t.assignedTo)}</span>
          <span><strong>Evidence:</strong> {(t.evidence || []).length}</span>
          <span><strong>Priority:</strong> {priority}</span>
          {typeof est === 'number' ? <span><strong>Est:</strong> {est} min</span> : null}
          {materials.length > 0 ? <span><strong>Materials:</strong> {materials.slice(0, 3).join(', ')}{materials.length > 3 ? '…' : ''}</span> : null}
        </div>

        {canActOnTask(t) ? (
          <div className="ftb-task-actions">
            {t.status === 'pending' ? (
              <Button size="sm" variant="secondary" icon={<Play size={16} />} onClick={() => updateStatus(t.id, 'in_progress')}>
                Start
              </Button>
            ) : null}
            {t.status !== 'completed' ? (
              <Button
                size="sm"
                variant="success"
                icon={<CheckCircle2 size={16} />}
                onClick={() => updateStatus(t.id, 'completed')}
                disabled={completeDisabled}
              >
                Complete
              </Button>
            ) : null}
          </div>
        ) : null}

        {role === 'Producer' && canActOnTask(t) ? (
          <div className="ftb-evidence">
            <div className="ftb-evidence-form">
              {needsPair ? (
                <select value={evidenceKind} onChange={(e) => setEvidenceKind(e.target.value as any)} aria-label="Evidence kind">
                  <option value="before">Before</option>
                  <option value="after">After</option>
                  <option value="general">General</option>
                </select>
              ) : null}
              <input
                type="url"
                placeholder="Photo URL"
                value={evidencePhotoUrl}
                onChange={(e) => setEvidencePhotoUrl(e.target.value)}
              />
              <input
                type="text"
                placeholder="Notes"
                value={evidenceNotes}
                onChange={(e) => setEvidenceNotes(e.target.value)}
              />
              <Button size="sm" variant="outline" icon={<Plus size={16} />} onClick={() => addEvidence(t.id, needsPair ? evidenceKind : 'general')}>
                Add
              </Button>
            </div>
            {needsPair && !hasPair ? (
              <div className="ftb-evidence-hint">
                Before/after proof required to complete.
              </div>
            ) : null}
          </div>
        ) : null}

        {role === 'FieldOwner' && t.approvalStatus === 'pending' ? (
          <div className="ftb-owner-approval">
            <Button size="sm" variant="success" onClick={() => approve(t.id)}>
              Approve
            </Button>
            <Button size="sm" variant="error" onClick={() => reject(t.id)}>
              Reject
            </Button>
          </div>
        ) : null}

        {role === 'FieldOwner' ? (
          <div className="ftb-reassign">
            <select
              value={reassignTarget[t.id] || ''}
              onChange={(e) => setReassignTarget((prev) => ({ ...prev, [t.id]: e.target.value }))}
            >
              <option value="">Reassign…</option>
              {producerUsers.map((p) => (
                <option key={p.id} value={p.id}>
                  {getProducerName(p.id)}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" icon={<UserCog size={16} />} onClick={() => reassign(t.id)} disabled={!reassignTarget[t.id]}>
              Set
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  const renderColumn = (key: ColumnKey, title: string, subtitle: string) => {
    const items = columns[key];
    return (
      <div className="ftb-col" key={key}>
        <div className="ftb-col-header">
          <div className="ftb-col-title">{title}</div>
          <div className="ftb-col-sub">{subtitle}</div>
          <div className="ftb-col-count">{items.length}</div>
        </div>
        <div className="ftb-col-body">
          {items.length === 0 ? (
            <EmptyState title="All clear" description="Nothing here right now." />
          ) : (
            items.map(renderTaskCard)
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="ftb" padding="md" title="Operations Board" subtitle="A live view of work on this field">
      <div className="ftb-grid">
        {renderColumn('overdue', 'Overdue', 'Needs attention now')}
        {renderColumn('today', 'Today', 'Focus tasks')}
        {renderColumn('thisWeek', 'This week', 'Upcoming')}
        {renderColumn('awaitingApproval', 'Awaiting approval', 'Owner review')}
        {renderColumn('done', 'Done', 'Completed work')}
      </div>
    </Card>
  );
};

export default FieldTaskBoard;

