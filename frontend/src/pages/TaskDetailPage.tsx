import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
  getPartnerService,
} from '../services/serviceFactory';
import { fieldPeopleService, type FieldMembership } from '../services/fieldPeopleService';
import type { SavedContact } from '../services/partnerService';
import type { FieldTask } from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import type { TaskFinancialSummary } from '../services/financialSummaryService';
import { useCaptureOptional } from '../context/CaptureContext';
import { getApiErrorMessage } from '../utils/translateApiError';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import TaskPeekBody from '../components/Tasks/TaskPeekBody';
import {
  assigneeKeyOf,
  buildAssigneeOptions,
} from '../components/Tasks/taskPeekModel';
import '../components/Tasks/form/TaskForm.css';
import './TaskDetailPage.css';

const TaskDetailPage: React.FC = () => {
  const { t } = useTranslation(['tasks', 'common', 'errors', 'money']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const capture = useCaptureOptional();

  const [task, setTask] = useState<FieldTask | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [money, setMoney] = useState<TaskFinancialSummary | null>(null);
  const [people, setPeople] = useState<FieldMembership[]>([]);
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigneeKey, setAssigneeKey] = useState('');

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const fw = getFieldWorkService();
      const data = await fw.getFieldTask(id);
      setTask(data);
      setAssigneeKey(assigneeKeyOf(data));

      const [fields, memberships, saved, taskMoney] = await Promise.all([
        getFieldService().getFields().catch(() => [] as Field[]),
        fieldPeopleService.getPeople(data.fieldId).catch(() => [] as FieldMembership[]),
        getPartnerService()
          .getContacts({ fieldId: data.fieldId, includeUnassigned: true })
          .catch(() => [] as SavedContact[]),
        getFinancialSummaryService().getTaskSummary(id).catch(() => null),
      ]);
      setField(fields.find((f) => f.id === data.fieldId) || null);
      setPeople(Array.isArray(memberships) ? memberships : []);
      setContacts(Array.isArray(saved) ? saved : []);
      setMoney(taskMoney);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedLoad'));
      setTask(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assigneeOptions = useMemo(
    () => buildAssigneeOptions(people, contacts, t('fieldWork.form.unassigned')),
    [people, contacts, t]
  );

  const handleStart = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await getFieldWorkService().startFieldTask(id);
      setTask(updated);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('fieldWork.errors.start'));
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (nextKey: string) => {
    if (!id || !task) return;
    const status = String(task.status || '').toLowerCase();
    if (status === 'completed' || status === 'cancelled') return;
    setAssigneeKey(nextKey);
    setBusy(true);
    try {
      const selected = assigneeOptions.find((o) => o.key === nextKey);
      const updated = await getFieldWorkService().assignFieldTask(id, {
        assignedUserId: selected?.userId,
        assignedCollaboratorId: selected?.contactId,
      });
      setTask(updated);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedAssign'));
      setAssigneeKey(assigneeKeyOf(task));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PageContainer className="tasks-page-container">
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer className="tasks-page-container">
        <Breadcrumbs />
        <div className="task-detail-page">
          <p className="task-form-help">{error || t('detail.notFound')}</p>
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline" size="lg">
            {t('detail.backToTasks')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="tasks-page-container" maxWidth="md">
      <Breadcrumbs />
      <TaskPeekBody
        variant="page"
        task={task}
        field={field}
        money={money}
        assigneeKey={assigneeKey}
        assigneeOptions={assigneeOptions}
        busy={busy}
        error={error}
        onAssign={(key) => void handleAssign(key)}
        onStart={() => void handleStart()}
        onComplete={() => navigate(`/tasks/${id}/complete`)}
        onAddExpense={() =>
          capture?.openCapture({
            preferredType: 'expense',
            fieldId: task.fieldId,
            taskId: task.id,
          })
        }
      />
    </PageContainer>
  );
};

export default TaskDetailPage;
