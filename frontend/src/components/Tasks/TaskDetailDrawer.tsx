import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import LoadingSpinner from '../Common/LoadingSpinner';
import WeatherSuitabilityBadge from './WeatherSuitabilityBadge';
import {
  getFieldService,
  getFieldWorkService,
  getFinancialSummaryService,
  getPartnerService,
} from '../../services/serviceFactory';
import { fieldPeopleService, type FieldMembership } from '../../services/fieldPeopleService';
import type { SavedContact } from '../../services/partnerService';
import type { FieldTask, FieldTaskChecklistItem } from '../../services/fieldWorkService';
import type { Field } from '../../services/fieldService';
import type { TaskFinancialSummary } from '../../services/financialSummaryService';
import { getApiErrorMessage } from '../../utils/translateApiError';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { formatTaskDateRange, formatTaskDay } from '../../utils/taskDateRange';
import { checklistProgress } from '../../utils/plannedTaskGroups';
import { resolveWeatherKind } from '../../utils/taskWeather';
import { isWeatherSensitiveTemplate } from '../../data/fieldWorkCatalogueLabels';
import { weatherExplanationCopy, type ProposalChip } from '../../utils/proposalPresentation';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { formatOfficialAmount } from '../../finance/format';
import '../Tasks/form/TaskForm.css';
import '../../pages/TaskDetailPage.css';

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

const checklistLabel = (item: FieldTaskChecklistItem, lang: string) => {
  if (lang.toLowerCase().startsWith('el')) return item.greekLabel || item.label;
  return item.englishLabel || item.label;
};

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskId,
  task: seedTask,
  open,
  onClose,
  onChanged,
  onStart,
  onPause,
  onReschedule,
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
        if (data.assignedUserId) setAssigneeKey(`user:${data.assignedUserId}`);
        else if (data.assignedCollaboratorId) setAssigneeKey(`contact:${data.assignedCollaboratorId}`);
        else setAssigneeKey('');

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
  const inProgress = status === 'in_progress';
  const isTerminal = status === 'completed' || status === 'cancelled';
  const progress = task ? checklistProgress(task) : { done: 0, total: 0 };
  const remaining = Math.max(0, progress.total - progress.done);
  const checksDone = progress.total > 0 && progress.done >= progress.total;

  const title = task ? taskDisplayTitle(task.title, task.templateCode, i18n.language) : '';
  const fieldName = field ? friendlyFieldLabel(field.name) : task?.fieldId || '';
  const period = task ? formatTaskDateRange(task.plannedStart, task.plannedEnd, i18n.language) : '';

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

  const checklist = (task?.checklist || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

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
              {inProgress && !task.isPaused ? (
                <Button variant="outline" size="lg" onClick={() => onPause(task)} disabled={busy}>
                  {t('fieldWork.actions.pause')}
                </Button>
              ) : null}
              {(canStart || inProgress) && !task.isPaused ? (
                <Button variant="outline" size="lg" onClick={() => onReschedule(task)} disabled={busy}>
                  {t('fieldWork.actions.changeDate')}
                </Button>
              ) : null}
              <Button variant="primary" size="lg" onClick={primaryNext} disabled={busy}>
                {primaryLabel()}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {loading ? <LoadingSpinner /> : null}
      {error ? (
        <div className="task-form-error" role="alert">
          {error}
        </div>
      ) : null}
      {task && !loading ? (
        <div className="task-detail-drawer-body">
          <div className="task-detail-chips">
            <span className="task-detail-status">{task.statusLabel}</span>
            {task.isPaused ? (
              <span className="task-detail-status is-blocked">{t('fieldWork.task.paused')}</span>
            ) : null}
          </div>
          <p className="task-detail-meta">
            {period ? <span>{period}</span> : null}
            {task.startedAt ? (
              <span>
                {' '}
                · {t('detail.actualStart')}:{' '}
                {formatTaskDay(task.startedAt, i18n.language, task.resultYear)}
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

          <section className="task-detail-card">
            <h2>{t('fieldWork.detail.checklist')}</h2>
            {progress.total > 0 ? (
              <p className="task-work-progress-label">
                {t('fieldWork.task.progressSentence', {
                  started: task.startedAt
                    ? formatTaskDay(task.startedAt, i18n.language, task.resultYear)
                    : t('fieldWork.task.startedRecently'),
                  done: progress.done,
                  total: progress.total,
                })}
              </p>
            ) : null}
            <ul className="task-detail-checklist">
              {checklist.map((item) => (
                <li key={item.key} className={`task-detail-check${item.isAnswered ? ' is-done' : ''}`}>
                  <span className="task-detail-check-mark" aria-hidden>
                    {item.isAnswered ? '✓' : '○'}
                  </span>
                  <strong>{checklistLabel(item, i18n.language)}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="task-detail-card">
            <h2>{t('fieldWork.person')}</h2>
            <select
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

          {money ? (
            <section className="task-detail-card">
              <h2>{t('fieldWork.detail.money')}</h2>
              <p>
                {formatOfficialAmount(
                  money.actualCost ?? money.estimatedCost,
                  'EUR',
                  i18n.language,
                  t('money:unknownAmount')
                )}
              </p>
            </section>
          ) : null}

          {task.notes ? (
            <section className="task-detail-card">
              <h2>{t('fieldWork.form.notes', { defaultValue: 'Σημειώσεις' })}</h2>
              <p>{task.notes}</p>
            </section>
          ) : null}

          <p className="task-form-help">
            <Link to={`/tasks/${task.id}`}>{t('fieldWork.detail.openFullPage')}</Link>
          </p>
        </div>
      ) : null}
    </RightDrawer>
  );
};

export default TaskDetailDrawer;
