import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import type { FieldTask, FieldTaskChecklistItem } from '../services/fieldWorkService';
import type { Field } from '../services/fieldService';
import type { TaskFinancialSummary } from '../services/financialSummaryService';
import { useCaptureOptional } from '../context/CaptureContext';
import { formatOfficialAmount, formatOfficialNet } from '../finance/format';
import { getApiErrorMessage } from '../utils/translateApiError';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import '../components/FieldWork/FieldWorkCards.css';
import './TaskDetailPage.css';

type ChecklistAnswers = Record<
  string,
  { boolValue?: boolean; textValue?: string; numberValue?: number }
>;

const checklistLabel = (item: FieldTaskChecklistItem, lang: string) => {
  if (lang.toLowerCase().startsWith('el')) return item.greekLabel || item.label;
  return item.englishLabel || item.label;
};

const TaskDetailPage: React.FC = () => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors', 'money']);
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
  const [showMoreChecks, setShowMoreChecks] = useState(false);
  const [notes, setNotes] = useState('');
  const [answers, setAnswers] = useState<ChecklistAnswers>({});
  const [assigneeKey, setAssigneeKey] = useState('');

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const fw = getFieldWorkService();
      const data = await fw.getFieldTask(id);
      setTask(data);
      setNotes(data.notes || '');
      const initial: ChecklistAnswers = {};
      data.checklist.forEach((c) => {
        initial[c.key] = {
          boolValue: c.boolValue ?? (c.isAnswered ? true : undefined),
          textValue: c.textValue,
          numberValue: c.numberValue,
        };
      });
      setAnswers(initial);
      if (data.assignedUserId) setAssigneeKey(`user:${data.assignedUserId}`);
      else if (data.assignedCollaboratorId) setAssigneeKey(`contact:${data.assignedCollaboratorId}`);

      const [fields, memberships, saved, taskMoney] = await Promise.all([
        getFieldService().getFields().catch(() => [] as Field[]),
        fieldPeopleService.getPeople(data.fieldId).catch(() => [] as FieldMembership[]),
        getPartnerService()
          .getContacts({ fieldId: data.fieldId, includeUnassigned: true })
          .catch(() => [] as SavedContact[]),
        getFinancialSummaryService().getTaskSummary(id).catch(() => null),
      ]);
      setField(fields.find((f) => f.id === data.fieldId) || null);
      setPeople(memberships);
      setContacts(saved);
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

  const assigneeOptions = useMemo(() => {
    const opts: Array<{ key: string; label: string; userId?: string; contactId?: string }> = [];
    people.forEach((p) => {
      opts.push({
        key: `user:${p.userId}`,
        label: p.displayName || p.email || p.userId,
        userId: p.userId,
      });
    });
    contacts.forEach((c) => {
      if (c.linkedUserId && people.some((p) => p.userId === c.linkedUserId)) return;
      opts.push({
        key: `contact:${c.id}`,
        label: c.displayName,
        contactId: c.id,
        userId: c.linkedUserId,
      });
    });
    return opts;
  }, [people, contacts]);

  const essential = useMemo(
    () =>
      (task?.checklist || [])
        .filter((c) => c.isEssential)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 5),
    [task]
  );

  const extra = useMemo(
    () =>
      (task?.checklist || [])
        .filter((c) => !essential.some((e) => e.key === c.key))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [task, essential]
  );

  const status = String(task?.status || '').toLowerCase();
  const canStart = status === 'planned' || status === 'ready' || status === 'blocked';
  const canComplete = status === 'in_progress' || status === 'ready' || status === 'planned';
  const isTerminal = status === 'completed' || status === 'cancelled';

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

  const handleAssign = async () => {
    if (!id || !assigneeKey) return;
    setBusy(true);
    try {
      const selected = assigneeOptions.find((o) => o.key === assigneeKey);
      const updated = await getFieldWorkService().assignFieldTask(id, {
        assignedUserId: selected?.userId,
        assignedCollaboratorId: selected?.contactId,
      });
      setTask(updated);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, t) || t('detail.failedAssign'));
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = () => {
    if (!id) return;
    navigate(`/tasks/${id}/complete`);
  };

  const renderCheckItem = (item: FieldTaskChecklistItem) => {
    const type = item.itemType?.toLowerCase() || 'checkbox';
    const answer = answers[item.key] || {};
    return (
      <li key={item.key}>
        {type === 'number' ? (
          <>
            <input
              type="number"
              aria-label={checklistLabel(item, i18n.language)}
              value={answer.numberValue ?? ''}
              disabled={isTerminal}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [item.key]: {
                    ...prev[item.key],
                    numberValue: e.target.value === '' ? undefined : Number(e.target.value),
                  },
                }))
              }
            />
            <span>
              {checklistLabel(item, i18n.language)}
              {item.unit ? ` (${item.unit})` : ''}
            </span>
          </>
        ) : type === 'text' ? (
          <>
            <input
              type="text"
              aria-label={checklistLabel(item, i18n.language)}
              value={answer.textValue ?? ''}
              disabled={isTerminal}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [item.key]: { ...prev[item.key], textValue: e.target.value },
                }))
              }
            />
            <span>{checklistLabel(item, i18n.language)}</span>
          </>
        ) : (
          <>
            <input
              type="checkbox"
              checked={Boolean(answer.boolValue)}
              disabled={isTerminal}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [item.key]: { ...prev[item.key], boolValue: e.target.checked },
                }))
              }
            />
            <span>{checklistLabel(item, i18n.language)}</span>
          </>
        )}
      </li>
    );
  };

  if (loading) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <LoadingSpinner />
      </PageContainer>
    );
  }

  if (!task) {
    return (
      <PageContainer>
        <Breadcrumbs />
        <p className="fw-empty">{error || t('detail.notFound')}</p>
        <Button to="/tasks" icon={<ArrowLeft />} variant="outline" size="lg">
          {t('detail.backToTasks')}
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="md">
      <Breadcrumbs />
      <div className="task-detail-page fw-detail-sections">
        <header className="tasks-page-header">
          <div className="tasks-page-header-text">
            <h1>{task.title}</h1>
            <p className="tasks-subtitle">
              {field?.name || task.fieldId} · {task.statusLabel} · {task.resultYear}
            </p>
          </div>
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline" size="lg">
            {t('detail.backToTasks')}
          </Button>
        </header>

        {error && <div className="tasks-error">{error}</div>}

        <section className="fw-detail-section">
          <h2>{t('fieldWork.detail.summary')}</h2>
          <p>{task.weatherSuitabilityLabel}</p>
          {task.description && <p>{task.description}</p>}
          {(task.plannedStart || task.plannedEnd) && (
            <p>
              {task.plannedStart
                ? new Date(task.plannedStart).toLocaleString(
                    i18n.language.startsWith('el') ? 'el-GR' : 'en-GB'
                  )
                : '—'}
              {' – '}
              {task.plannedEnd
                ? new Date(task.plannedEnd).toLocaleString(
                    i18n.language.startsWith('el') ? 'el-GR' : 'en-GB',
                    { day: 'numeric', month: 'short' }
                  )
                : '—'}
            </p>
          )}
        </section>

        <section className="fw-detail-section">
          <h2>{t('fieldWork.detail.money')}</h2>
          <dl className="fw-money-facts">
            <div>
              <dt>{t('fieldWork.detail.estimated')}</dt>
              <dd>
                {formatOfficialAmount(
                  money?.estimatedCost,
                  'EUR',
                  i18n.language,
                  t('money:unknownAmount')
                )}
              </dd>
            </div>
            <div>
              <dt>{t('fieldWork.detail.actual')}</dt>
              <dd>
                {formatOfficialAmount(
                  money?.actualCost,
                  'EUR',
                  i18n.language,
                  t('fieldWork.detail.noActual')
                )}
              </dd>
            </div>
            {money?.difference != null ? (
              <div>
                <dt>{t('fieldWork.detail.difference')}</dt>
                <dd>
                  {formatOfficialNet(
                    money.difference,
                    'EUR',
                    i18n.language,
                    t('money:unknownAmount')
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="fw-empty">{t('fieldWork.detail.estimateHint')}</p>
          <div className="fw-card-actions">
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                capture?.openCapture({
                  preferredType: 'expense',
                  fieldId: task.fieldId,
                  taskId: task.id,
                })
              }
            >
              {t('fieldWork.detail.addExpense')}
            </Button>
            <Button
              to={`/money?year=${task.resultYear}&fieldId=${encodeURIComponent(task.fieldId)}&task=${encodeURIComponent(task.id)}`}
              variant="outline"
              size="lg"
            >
              {t('fieldWork.detail.seeMoney')}
            </Button>
          </div>
        </section>

        <section className="fw-detail-section">
          <h2>{t('fieldWork.person')}</h2>
          <div className="fw-form-row">
            <select
              value={assigneeKey}
              onChange={(e) => setAssigneeKey(e.target.value)}
              disabled={isTerminal}
            >
              <option value="">{t('fieldWork.form.unassigned')}</option>
              {assigneeOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {!isTerminal && (
            <Button variant="outline" size="lg" onClick={() => void handleAssign()} disabled={busy}>
              {t('detail.assignTask')}
            </Button>
          )}
        </section>

        <section className="fw-detail-section">
          <h2>{t('fieldWork.detail.checklist')}</h2>
          <ul className="fw-checklist">{essential.map(renderCheckItem)}</ul>
          {extra.length > 0 && (
            <>
              <button
                type="button"
                className="fw-advanced-toggle"
                onClick={() => setShowMoreChecks((v) => !v)}
              >
                {showMoreChecks
                  ? t('fieldWork.detail.hideMoreChecks')
                  : t('fieldWork.detail.moreChecks')}
              </button>
              {showMoreChecks && <ul className="fw-checklist">{extra.map(renderCheckItem)}</ul>}
            </>
          )}
        </section>

        <section className="fw-detail-section">
          <h2>{t('fieldWork.form.notes')}</h2>
          <textarea
            rows={3}
            value={notes}
            disabled={isTerminal}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {!isTerminal && (
          <div className="fw-card-actions">
            {canStart && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => void handleStart()}
                disabled={busy}
                className="fw-primary-action"
              >
                {t('fieldWork.actions.start')}
              </Button>
            )}
          </div>
        )}

        {canComplete && !isTerminal && (
          <div className="fw-sticky-complete">
            <Button
              variant="success"
              size="lg"
              onClick={() => void handleComplete()}
              disabled={busy}
            >
              {t('fieldWork.actions.complete')}
            </Button>
          </div>
        )}

        {status === 'completed' && (
          <p className="fw-empty">
            <Link to="/chronologio">{t('fieldWork.seeCompletedInChronologio')}</Link>
          </p>
        )}
      </div>
    </PageContainer>
  );
};

export default TaskDetailPage;
