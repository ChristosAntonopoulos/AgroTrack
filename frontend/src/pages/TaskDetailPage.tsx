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
import { taskDisplayTitle } from '../utils/taskDisplayTitle';
import { formatTaskDateRange, formatTaskDay } from '../utils/taskDateRange';
import { checklistProgress } from '../utils/plannedTaskGroups';
import { resolveWeatherKind } from '../utils/taskWeather';
import { isWeatherSensitiveTemplate } from '../data/fieldWorkCatalogueLabels';
import { weatherExplanationCopy, type ProposalChip } from '../utils/proposalPresentation';
import { friendlyFieldLabel } from '../utils/fieldLabels';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import PageContainer from '../components/Common/PageContainer';
import Button from '../components/Common/Button';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import WeatherSuitabilityBadge from '../components/Tasks/WeatherSuitabilityBadge';
import '../components/Tasks/form/TaskForm.css';
import '../components/Tasks/TaskProposalCard.css';
import './TaskDetailPage.css';

const checklistLabel = (item: FieldTaskChecklistItem, lang: string) => {
  if (lang.toLowerCase().startsWith('el')) return item.greekLabel || item.label;
  return item.englishLabel || item.label;
};

const checklistValue = (item: FieldTaskChecklistItem, lang: string): string | null => {
  if (!item.isAnswered) return null;
  const type = (item.itemType || '').toLowerCase();
  if (type === 'number' && item.numberValue != null) {
    return `${item.numberValue}${item.unit ? ` ${item.unit}` : ''}`;
  }
  if (type === 'text' && item.textValue) return item.textValue;
  if (type === 'choice' && item.textValue) return item.textValue;
  if (item.boolValue === true) return lang.toLowerCase().startsWith('el') ? 'Ναι' : 'Yes';
  if (item.boolValue === false) return lang.toLowerCase().startsWith('el') ? 'Όχι' : 'No';
  return lang.toLowerCase().startsWith('el') ? 'Έγινε' : 'Done';
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
  const [assigneeKey, setAssigneeKey] = useState('');

  const load = async () => {
    if (!id) return;
    try {
      setError(null);
      const fw = getFieldWorkService();
      const data = await fw.getFieldTask(id);
      setTask(data);
      if (data.assignedUserId) setAssigneeKey(`user:${data.assignedUserId}`);
      else if (data.assignedCollaboratorId) setAssigneeKey(`contact:${data.assignedCollaboratorId}`);
      else setAssigneeKey('');

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

  const assigneeOptions = useMemo(() => {
    const opts: Array<{ key: string; label: string; userId?: string; contactId?: string }> = [
      { key: '', label: t('fieldWork.form.unassigned') },
    ];
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
  }, [people, contacts, t]);

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
  const progress = task ? checklistProgress(task) : { done: 0, total: 0 };
  const title = task ? taskDisplayTitle(task.title, task.templateCode, i18n.language) : '';
  const fieldName = field ? friendlyFieldLabel(field.name) : task?.fieldId || '';
  const period = task
    ? formatTaskDateRange(task.plannedStart, task.plannedEnd, i18n.language)
    : '';
  const started = task?.startedAt
    ? formatTaskDay(task.startedAt, i18n.language, task.resultYear)
    : '';

  const weatherKind = resolveWeatherKind(task?.weatherSuitability);
  const showWeather =
    Boolean(task) &&
    (weatherKind === 'unknown' ||
      (isWeatherSensitiveTemplate(task?.templateCode) && weatherKind !== 'not_sensitive'));
  const weatherChip: ProposalChip | null = showWeather
    ? {
        id:
          weatherKind === 'good'
            ? 'good'
            : weatherKind === 'caution'
              ? 'caution'
              : weatherKind === 'unsuitable'
                ? 'unsuitable'
                : 'unknown',
        labelKey: `fieldWork.proposal.chips.${weatherKind === 'unknown' ? 'unknown' : weatherKind}`,
      }
    : null;
  const weatherCopy = useMemo(
    () =>
      weatherExplanationCopy(
        weatherKind === 'not_sensitive' ? 'not_sensitive' : weatherKind,
        [],
        i18n.language
      ),
    [weatherKind, i18n.language]
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
    if (!id || isTerminal) return;
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
      if (task?.assignedUserId) setAssigneeKey(`user:${task.assignedUserId}`);
      else if (task?.assignedCollaboratorId) setAssigneeKey(`contact:${task.assignedCollaboratorId}`);
      else setAssigneeKey('');
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = () => {
    if (!id) return;
    navigate(`/tasks/${id}/complete`);
  };

  const renderCheckItem = (item: FieldTaskChecklistItem) => {
    const value = checklistValue(item, i18n.language);
    return (
      <li key={item.key} className={`task-detail-check${item.isAnswered ? ' is-done' : ''}`}>
        <span className="task-detail-check-mark" aria-hidden>
          {item.isAnswered ? '✓' : '○'}
        </span>
        <div>
          <strong>{checklistLabel(item, i18n.language)}</strong>
          {value ? <span>{value}</span> : null}
          {!item.isAnswered && !isTerminal ? (
            <span className="task-detail-check-pending">{t('fieldWork.detail.checkPending')}</span>
          ) : null}
        </div>
      </li>
    );
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

  const statusClass =
    status === 'in_progress'
      ? 'is-active'
      : status === 'completed'
        ? 'is-done'
        : status === 'blocked'
          ? 'is-blocked'
          : 'is-planned';

  return (
    <PageContainer className="tasks-page-container" maxWidth="md">
      <Breadcrumbs />
      <div className="task-detail-page">
        <header className="task-detail-header">
          <div className="task-detail-header-copy">
            <div className="task-detail-chips">
              <span className={`task-detail-status ${statusClass}`}>{task.statusLabel}</span>
              <span className="task-detail-year">{task.resultYear}</span>
            </div>
            <h1>{title}</h1>
            <p className="task-detail-meta">
              <Link to={`/fields/${task.fieldId}`} className="task-detail-field-link">
                {fieldName}
              </Link>
              {period ? <span> · {period}</span> : null}
              {started ? (
                <span>
                  {' '}
                  · {t('detail.actualStart')}: {started}
                </span>
              ) : null}
            </p>
            {weatherChip ? (
              <div className="task-detail-weather">
                <WeatherSuitabilityBadge
                  chip={weatherChip}
                  label={
                    weatherChip.id === 'unknown'
                      ? t('fieldWork.weather.unknown')
                      : t(weatherChip.labelKey)
                  }
                  headline={weatherCopy.headline}
                  facts={weatherCopy.facts}
                />
              </div>
            ) : null}
            {task.description ? <p className="task-detail-description">{task.description}</p> : null}
          </div>
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline" size="lg">
            {t('detail.backToTasks')}
          </Button>
        </header>

        {error ? (
          <div className="task-form-error" role="alert">
            {error}
          </div>
        ) : null}

        {!isTerminal ? (
          <section className="task-detail-card task-detail-next">
            <h2>{t('fieldWork.detail.nextStep')}</h2>
            <p className="task-form-help">
              {canStart && status !== 'in_progress'
                ? t('fieldWork.detail.nextStepStart')
                : t('fieldWork.detail.nextStepComplete')}
            </p>
            <div className="task-detail-actions">
              {canStart ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => void handleStart()}
                  disabled={busy}
                >
                  {t('fieldWork.actions.start')}
                </Button>
              ) : null}
              {canComplete ? (
                <Button
                  variant={canStart ? 'outline' : 'success'}
                  size="lg"
                  onClick={handleComplete}
                  disabled={busy}
                >
                  {t('fieldWork.actions.complete')}
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="task-detail-card">
          <div className="task-detail-card-head">
            <h2>{t('fieldWork.detail.checklist')}</h2>
            {progress.total > 0 ? (
              <span className="task-detail-progress-label">
                {t('fieldWork.task.checksShort', { done: progress.done, total: progress.total })}
              </span>
            ) : null}
          </div>
          {progress.total > 0 ? (
            <div className="task-detail-progress" aria-hidden>
              <span
                style={{
                  width: `${progress.done > 0 ? (progress.done / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          ) : null}
          {!isTerminal ? (
            <p className="task-form-help">{t('fieldWork.detail.checklistHint')}</p>
          ) : null}
          {essential.length > 0 ? (
            <ul className="task-detail-checklist">{essential.map(renderCheckItem)}</ul>
          ) : (
            <p className="task-form-help">{t('fieldWork.detail.noChecks')}</p>
          )}
          {extra.length > 0 ? (
            <>
              <button
                type="button"
                className="task-advanced-toggle"
                onClick={() => setShowMoreChecks((value) => !value)}
              >
                {showMoreChecks
                  ? t('fieldWork.detail.hideMoreChecks')
                  : t('fieldWork.detail.moreChecks')}
              </button>
              {showMoreChecks ? (
                <ul className="task-detail-checklist">{extra.map(renderCheckItem)}</ul>
              ) : null}
            </>
          ) : null}
          {canComplete && !isTerminal ? (
            <Button variant="outline" size="lg" onClick={handleComplete} disabled={busy}>
              {t('fieldWork.detail.fillChecks')}
            </Button>
          ) : null}
        </section>

        <section className="task-detail-card">
          <h2>{t('fieldWork.person')}</h2>
          <label className="task-form-label" htmlFor="task-detail-assignee">
            {t('detail.assignedTo')}
          </label>
          <select
            id="task-detail-assignee"
            className="task-form-input"
            value={assigneeKey}
            disabled={isTerminal || busy}
            onChange={(e) => void handleAssign(e.target.value)}
          >
            {assigneeOptions.map((option) => (
              <option key={option.key || 'unassigned'} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </section>

        <section className="task-detail-card">
          <h2>{t('fieldWork.detail.money')}</h2>
          <dl className="task-detail-money">
            <div>
              <dt>{t('fieldWork.detail.estimated')}</dt>
              <dd>
                {formatOfficialAmount(
                  money?.estimatedCost ?? task.estimatedCost,
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
          <p className="task-form-help">{t('fieldWork.detail.estimateHint')}</p>
          <div className="task-detail-actions">
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

        <section className="task-detail-card">
          <h2>{t('fieldWork.form.notes')}</h2>
          {task.notes?.trim() ? (
            <p className="task-detail-notes">{task.notes}</p>
          ) : (
            <p className="task-form-help">
              {isTerminal
                ? t('fieldWork.detail.noNotes')
                : t('fieldWork.detail.notesOnComplete')}
            </p>
          )}
        </section>

        {status === 'completed' ? (
          <p className="task-detail-footer-link">
            <Link to="/chronologio">{t('fieldWork.seeCompletedInChronologio')}</Link>
          </p>
        ) : null}

        {canComplete && !isTerminal ? (
          <div className="task-detail-sticky">
            <Button variant="success" size="lg" onClick={handleComplete} disabled={busy}>
              {t('fieldWork.actions.complete')}
            </Button>
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
};

export default TaskDetailPage;
