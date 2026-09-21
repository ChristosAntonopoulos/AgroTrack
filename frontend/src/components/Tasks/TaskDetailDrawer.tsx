import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import LoadingSpinner from '../Common/LoadingSpinner';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
  getPartnerService,
} from '../../services/serviceFactory';
import { fieldPeopleService, type FieldMembership } from '../../services/fieldPeopleService';
import type { SavedContact } from '../../services/partnerService';
import type { FieldTask } from '../../services/fieldWorkService';
import type { Field } from '../../services/fieldService';
import type { TaskFinancialSummary } from '../../services/financialSummaryService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { checklistProgress } from '../../utils/plannedTaskGroups';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import TaskPeekBody from './TaskPeekBody';
import { assigneeKeyOf, buildAssigneeOptions } from './taskPeekModel';

interface TaskDetailDrawerProps {
  taskId: string | null;
  task?: FieldTask | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  onStart: (task: FieldTask) => void;
  onPause: (task: FieldTask) => void;
  onReschedule: (task: FieldTask) => void;
}

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskId,
  task: seedTask,
  open,
  onClose,
  onChanged,
  onStart,
  onPause: _onPause,
  onReschedule: _onReschedule,
}) => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors', 'money']);
  const navigate = useNavigate();
  const [task, setTask] = useState<FieldTask | null>(seedTask || null);
  const [field, setField] = useState<Field | null>(null);
  const [money, setMoney] = useState<TaskFinancialSummary | null>(null);
  const [people, setPeople] = useState<FieldMembership[]>([]);
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigneeKey, setAssigneeKey] = useState('');

  useEffect(() => {
    if (!open || !taskId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await getFieldWorkService().getFieldTask(taskId);
        if (cancelled) return;
        setTask(data);
        setAssigneeKey(assigneeKeyOf(data));

        const [fields, memberships, saved, taskMoney] = await Promise.all([
          getFieldService().getFields().catch(() => [] as Field[]),
          fieldPeopleService.getPeople(data.fieldId).catch(() => [] as FieldMembership[]),
          getPartnerService()
            .getContacts({ fieldId: data.fieldId, includeUnassigned: true })
            .catch(() => [] as SavedContact[]),
          getFinancialSummaryService().getTaskSummary(taskId).catch(() => null),
        ]);
        if (cancelled) return;
        setField(fields.find((f) => f.id === data.fieldId) || null);
        setPeople(Array.isArray(memberships) ? memberships : []);
        setContacts(Array.isArray(saved) ? saved : []);
        setMoney(taskMoney);
      } catch (err: unknown) {
        if (!cancelled) setError(getApiErrorMessage(err, t) || t('detail.failedLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, taskId, t]);

  useEffect(() => {
    if (seedTask) setTask(seedTask);
  }, [seedTask]);

  const status = String(task?.status || '').toLowerCase();
  const canStart = status === 'planned' || status === 'ready' || status === 'blocked';
  const isTerminal = status === 'completed' || status === 'cancelled';
  const progress = task ? checklistProgress(task) : { done: 0, total: 0 };
  const remaining = Math.max(0, progress.total - progress.done);
  const checksDone = progress.total > 0 && progress.done >= progress.total;

  const title = task ? taskDisplayTitle(task.title, task.templateCode, i18n.language) : '';
  const fieldName = field ? friendlyFieldLabel(field.name) : task?.fieldId || '';

  const assigneeOptions = useMemo(
    () => buildAssigneeOptions(people, contacts, t('fieldWork.form.unassigned')),
    [people, contacts, t]
  );

  const handleAssign = async (nextKey: string) => {
    if (!task || isTerminal) return;
    setAssigneeKey(nextKey);
    setBusy(true);
    try {
      const selected = assigneeOptions.find((o) => o.key === nextKey);
      const updated = await getFieldWorkService().assignFieldTask(task.id, {
        assignedUserId: selected?.userId,
        assignedCollaboratorId: selected?.contactId,
      });
      setTask(updated);
      onChanged();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedAssign'));
    } finally {
      setBusy(false);
    }
  };

  const nextStepCopy = () => {
    if (canStart) return t('fieldWork.detail.nextStepStart');
    if (task?.isPaused) return t('fieldWork.detail.nextStepPaused');
    if (checksDone) return t('fieldWork.detail.nextStepRecordResult');
    return t('fieldWork.detail.nextStepContinueChecks', { count: remaining });
  };

  const primaryNext = () => {
    if (!task) return;
    if (canStart) {
      onStart(task);
      return;
    }
    if (task.isPaused) {
      void getFieldWorkService()
        .resumeFieldTask(task.id)
        .then((updated) => {
          setTask(updated);
          onChanged();
        });
      return;
    }
    navigate(`/tasks/${task.id}/complete`);
  };

  const primaryLabel = () => {
    if (canStart) return t('fieldWork.actions.start');
    if (task?.isPaused) return t('fieldWork.actions.continueIt');
    if (checksDone) return t('fieldWork.actions.recordResult');
    return t('fieldWork.actions.continueChecks');
  };

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={title || t('fieldWork.pageTitle')}
      subtitle={fieldName}
      size="lg"
      footer={
        !isTerminal && task ? (
          <div className="task-detail-drawer-footer">
            <p className="task-form-help">{nextStepCopy()}</p>
            <div className="task-detail-actions">
              <Button variant="primary" size="lg" onClick={primaryNext} disabled={busy}>
                {primaryLabel()}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {loading ? <LoadingSpinner /> : null}
      {task && !loading ? (
        <TaskPeekBody
          variant="peek"
          task={task}
          field={field}
          money={money}
          assigneeKey={assigneeKey}
          assigneeOptions={assigneeOptions}
          busy={busy}
          error={error}
          onAssign={(key) => void handleAssign(key)}
        />
      ) : error ? (
        <div className="task-form-error" role="alert">
          {error}
        </div>
      ) : null}
    </RightDrawer>
  );
};

export default TaskDetailDrawer;
