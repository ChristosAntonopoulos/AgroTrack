import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocaleFormatters } from '../../hooks/useLocaleFormatters';
import { Task } from '../../services/taskService';
import Button from '../Common/Button';
import Badge from '../Common/Badge';
import Card from '../Common/Card';
import EmptyState from '../Common/EmptyState';
import { getFieldService, getTaskService, getUserService, isMockMode } from '../../services/serviceFactory';
import { demoStore } from '../../services/demo/demoStore';
import { User } from '../../services/userService';
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

type ColumnKey = 'overdue' | 'today' | 'thisWeek' | 'done';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const FieldTaskBoard: React.FC<Props> = ({ fieldId, tasks, currentUserId, role, onChanged }) => {
  const { t } = useTranslation(['fields', 'common']);
  const { formatDate } = useLocaleFormatters();
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState('');
  const [evidenceKind, setEvidenceKind] = useState<'before' | 'after' | 'general'>('general');
  const [reassignTarget, setReassignTarget] = useState<Record<string, string>>({});

  const [producerUsers, setProducerUsers] = useState<User[]>([]);

  useEffect(() => {
    if (role !== 'FieldOwner' && role !== 'Administrator') return;
    const load = async () => {
      if (isMockMode()) {
        demoStore.ensureSeeded();
        setProducerUsers(demoStore.getUsers().filter((u) => u.role === 'Producer'));
      } else {
        try {
          setProducerUsers(await getUserService().getUsers('Producer'));
        } catch {
          setProducerUsers([]);
        }
      }
    };
    void load();
  }, [role]);

  const getProducerName = (producerId?: string) => {
    if (!producerId) return t('fields:taskBoard.unassigned');
    const u = producerUsers.find((x) => x.id === producerId);
    if (u) {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
      return name || u.email;
    }
    if (isMockMode()) {
      demoStore.ensureSeeded();
      const mockU = demoStore.getUsers().find((x) => x.id === producerId);
      if (mockU) {
        const name = `${mockU.firstName || ''} ${mockU.lastName || ''}`.trim();
        return name || mockU.email;
      }
    }
    return producerId;
  };

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
    };

    const fieldTasks = tasks.filter((task) => task.fieldId === fieldId);
    for (const task of fieldTasks) {
      const due = task.scheduledEnd ? new Date(task.scheduledEnd) : null;
      const isDone = task.status === 'completed';

      if (isDone) {
        cols.done.push(task);
        continue;
      }
      if (due && due < today) {
        cols.overdue.push(task);
        continue;
      }
      if (due && startOfDay(due).getTime() === today.getTime()) {
        cols.today.push(task);
        continue;
      }
      if (due && due < weekEnd) {
        cols.thisWeek.push(task);
        continue;
      }
      cols.thisWeek.push(task);
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

  const reassign = async (taskId: string) => {
    const target = reassignTarget[taskId];
    if (!target) return;
    const service = getTaskService();
    await service.assignTask(taskId, target);
    await onChanged();
  };

  const canActOnTask = (task: Task) => {
    if (role === 'FieldOwner') return true;
    if (role === 'Producer') return !!currentUserId && task.assignedTo === currentUserId;
    return false;
  };

  const renderTaskCard = (task: Task) => {
    const statusVariant =
      task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'info' : 'warning';
    const dueDate = task.scheduledEnd ? new Date(task.scheduledEnd) : null;
    const dueText = dueDate ? formatDate(dueDate) : t('common:noDueDate');
    const overdueDays =
      dueDate && task.status !== 'completed'
        ? Math.max(0, Math.ceil((startOfDay(today).getTime() - startOfDay(dueDate).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
    const priority = task.priority || 'Medium';
    const est = task.estimatedMinutes;
    const materials = task.materials || [];
    const needsPair = requiresBeforeAfter(task.type);
    const hasPair = hasBeforeAfterEvidence(task);
    const completeDisabled = needsPair && !hasPair;

    return (
      <div key={task.id} className="ftb-task">
        <div className="ftb-task-top">
          <div className="ftb-task-title">{task.title}</div>
          <div className="ftb-task-badges">
            <Badge size="sm" variant={statusVariant as any}>
              {t(`common:taskStatus.${task.status}`)}
            </Badge>
          </div>
        </div>

        <div className="ftb-task-meta">
          <span>
            <strong>{t('common:due')}:</strong> {dueText}
            {overdueDays > 0 ? <span className="ftb-overdue"> ({t('fields:taskBoard.overdue')} {overdueDays}d)</span> : null}
          </span>
          <span><strong>{t('common:roles.Producer')}:</strong> {getProducerName(task.assignedTo)}</span>
          <span><strong>{t('fields:controlRoom.tabs.evidence')}:</strong> {(task.evidence || []).length}</span>
          <span><strong>Priority:</strong> {t(`common:severity.${priority}`, { defaultValue: priority })}</span>
          {typeof est === 'number' ? <span><strong>Est:</strong> {est} min</span> : null}
          {materials.length > 0 ? <span><strong>Materials:</strong> {materials.slice(0, 3).join(', ')}{materials.length > 3 ? '…' : ''}</span> : null}
        </div>

        {canActOnTask(task) ? (
          <div className="ftb-task-actions">
            {task.status === 'pending' ? (
              <Button size="sm" variant="secondary" icon={<Play size={16} />} onClick={() => updateStatus(task.id, 'in_progress')}>
                {t('fields:taskBoard.start')}
              </Button>
            ) : null}
            {task.status !== 'completed' ? (
              <Button
                size="sm"
                variant="success"
                icon={<CheckCircle2 size={16} />}
                onClick={() => updateStatus(task.id, 'completed')}
                disabled={completeDisabled}
              >
                {t('fields:taskBoard.complete')}
              </Button>
            ) : null}
          </div>
        ) : null}

        {role === 'Producer' && canActOnTask(task) ? (
          <div className="ftb-evidence">
            <div className="ftb-evidence-form">
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
              <Button size="sm" variant="outline" icon={<Plus size={16} />} onClick={() => addEvidence(task.id, needsPair ? evidenceKind : 'general')}>
                {t('fields:taskBoard.addEvidence')}
              </Button>
            </div>
            {needsPair && !hasPair ? (
              <div className="ftb-evidence-hint">
                {t('fields:taskBoard.beforeAfterRequired')}
              </div>
            ) : null}
          </div>
        ) : null}

        {role === 'FieldOwner' ? (
          <div className="ftb-reassign">
            <select
              value={reassignTarget[task.id] || ''}
              onChange={(e) => setReassignTarget((prev) => ({ ...prev, [task.id]: e.target.value }))}
            >
              <option value="">{t('fields:taskBoard.reassign')}…</option>
              {producerUsers.map((p) => (
                <option key={p.id} value={p.id}>
                  {getProducerName(p.id)}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" icon={<UserCog size={16} />} onClick={() => reassign(task.id)} disabled={!reassignTarget[task.id]}>
              {t('fields:taskBoard.reassign')}
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  const columnTitles: Record<ColumnKey, string> = {
    overdue: t('fields:taskBoard.overdue'),
    today: t('fields:taskBoard.today'),
    thisWeek: t('fields:taskBoard.thisWeek'),
    done: t('fields:taskBoard.done'),
  };

  const renderColumn = (key: ColumnKey) => {
    const items = columns[key];
    return (
      <div className="ftb-col" key={key}>
        <div className="ftb-col-header">
          <div className="ftb-col-title">{columnTitles[key]}</div>
          <div className="ftb-col-count">{items.length}</div>
        </div>
        <div className="ftb-col-body">
          {items.length === 0 ? (
            <EmptyState title={columnTitles[key]} description={t('fields:taskBoard.empty')} />
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
        {renderColumn('overdue')}
        {renderColumn('today')}
        {renderColumn('thisWeek')}
        {renderColumn('done')}
      </div>
    </Card>
  );
};

export default FieldTaskBoard;
