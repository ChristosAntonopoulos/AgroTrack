import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import type { FieldTask, FieldTaskChecklistItem } from '../../services/fieldWorkService';
import type { Field } from '../../services/fieldService';
import type { TaskFinancialSummary } from '../../services/financialSummaryService';
import { formatOfficialAmount, formatOfficialNet } from '../../finance/format';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { formatTaskDateRange, formatTaskDay } from '../../utils/taskDateRange';
import { checklistProgress } from '../../utils/plannedTaskGroups';
import { resolveWeatherKind } from '../../utils/taskWeather';
import { weatherExplanationCopy } from '../../utils/proposalPresentation';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import Button from '../Common/Button';
import WeatherSuitabilityBadge from './WeatherSuitabilityBadge';
import {
  AssigneeOption,
  buildWeatherChip,
  checklistLabel,
  checklistValue,
  taskStatusClass,
} from './taskPeekModel';
import './form/TaskForm.css';
import './TaskProposalCard.css';
import '../../pages/TaskDetailPage.css';
import { moneyPath } from '../../navigation/intents';

export type TaskPeekBodyProps = {
  variant: 'page' | 'peek';
  task: FieldTask;
  field: Field | null;
  money: TaskFinancialSummary | null;
  assigneeKey: string;
  assigneeOptions: AssigneeOption[];
  busy: boolean;
  error: string | null;
  onAssign: (key: string) => void;
  onStart?: () => void;
  onComplete?: () => void;
  onAddExpense?: () => void;
};

const TaskPeekBody: React.FC<TaskPeekBodyProps> = ({
  variant,
  task,
  field,
  money,
  assigneeKey,
  assigneeOptions,
  busy,
  error,
  onAssign,
  onStart,
  onComplete,
  onAddExpense,
}) => {
  const { t, i18n } = useTranslation(['tasks', 'common', 'errors', 'money']);
  const [showMoreChecks, setShowMoreChecks] = useState(false);
  const isPage = variant === 'page';

  const status = String(task.status || '').toLowerCase();
  const canStart = status === 'planned' || status === 'ready' || status === 'blocked';
  const canComplete = status === 'in_progress' || status === 'ready' || status === 'planned';
  const isTerminal = status === 'completed' || status === 'cancelled';
  const progress = checklistProgress(task);
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const fieldName = field ? friendlyFieldLabel(field.name) : task.fieldId || '';
  const period = formatTaskDateRange(task.plannedStart, task.plannedEnd, i18n.language);
  const started = task.startedAt
    ? formatTaskDay(task.startedAt, i18n.language, task.resultYear)
    : '';

  const weatherKind = resolveWeatherKind(task.weatherSuitability);
  const weatherChip = buildWeatherChip(task);
  const weatherCopy = useMemo(
    () =>
      weatherExplanationCopy(
        weatherKind === 'not_sensitive' ? 'not_sensitive' : weatherKind,
        [],
        i18n.language
      ),
    [weatherKind, i18n.language]
  );

  const essential = useMemo(
    () =>
      (task.checklist || [])
        .filter((c) => c.isEssential)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 5),
    [task]
  );

  const extra = useMemo(
    () =>
      (task.checklist || [])
        .filter((c) => !essential.some((e) => e.key === c.key))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [task, essential]
  );

  const peekChecks = useMemo(
    () => (task.checklist || []).slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [task]
  );

  const renderCheckItem = (item: FieldTaskChecklistItem, withValue: boolean) => {
    const value = withValue ? checklistValue(item, i18n.language) : null;
    return (
      <li key={item.key} className={`task-detail-check${item.isAnswered ? ' is-done' : ''}`}>
        <span className="task-detail-check-mark" aria-hidden>
          {item.isAnswered ? '✓' : '○'}
        </span>
        {withValue ? (
          <div>
            <strong>{checklistLabel(item, i18n.language)}</strong>
            {value ? <span>{value}</span> : null}
            {!item.isAnswered && !isTerminal ? (
              <span className="task-detail-check-pending">{t('fieldWork.detail.checkPending')}</span>
            ) : null}
          </div>
        ) : (
          <strong>{checklistLabel(item, i18n.language)}</strong>
        )}
      </li>
    );
  };

  const weatherBlock = weatherChip ? (
    <div className="task-detail-weather">
      <WeatherSuitabilityBadge
        chip={weatherChip}
        label={
          weatherChip.id === 'unknown' ? t('fieldWork.weather.unknown') : t(weatherChip.labelKey)
        }
        headline={weatherCopy.headline}
        facts={weatherCopy.facts}
      />
    </div>
  ) : null;

  return (
    <div className={isPage ? 'task-detail-page' : 'task-detail-drawer-body'}>
      {isPage ? (
        <header className="task-detail-header">
          <div className="task-detail-header-copy">
            <div className="task-detail-chips">
              <span className={`task-detail-status ${taskStatusClass(status)}`}>
                {task.statusLabel}
              </span>
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
            {weatherBlock}
            {task.description ? <p className="task-detail-description">{task.description}</p> : null}
          </div>
          <Button to="/tasks" icon={<ArrowLeft />} variant="outline" size="lg">
            {t('detail.backToTasks')}
          </Button>
        </header>
      ) : (
        <>
          <div className="task-detail-chips">
            <span className="task-detail-status">{task.statusLabel}</span>
            {task.isPaused ? (
              <span className="task-detail-status is-blocked">{t('fieldWork.task.paused')}</span>
            ) : null}
          </div>
          <p className="task-detail-meta">
            {period ? <span>{period}</span> : null}
            {started ? (
              <span>
                {' '}
                · {t('detail.actualStart')}: {started}
              </span>
            ) : null}
          </p>
          {weatherBlock}
        </>
      )}

      {error ? (
        <div className="task-form-error" role="alert">
          {error}
        </div>
      ) : null}

      {isPage && !isTerminal ? (
        <section className="task-detail-card task-detail-next">
          <h2>{t('fieldWork.detail.nextStep')}</h2>
          <p className="task-form-help">
            {canStart
              ? t('fieldWork.detail.nextStepStart')
              : progress.total > 0 && progress.done >= progress.total
                ? t('fieldWork.detail.nextStepRecordResult')
                : progress.total > 0
                  ? t('fieldWork.detail.nextStepContinueChecks', {
                      count: Math.max(0, progress.total - progress.done),
                    })
                  : t('fieldWork.detail.nextStepComplete')}
          </p>
        </section>
      ) : null}

      <section className="task-detail-card">
        <div className="task-detail-card-head">
          <h2>{t('fieldWork.detail.checklist')}</h2>
          {isPage && progress.total > 0 ? (
            <span className="task-detail-progress-label">
              {t('fieldWork.task.checksShort', { done: progress.done, total: progress.total })}
            </span>
          ) : null}
        </div>
        {isPage && progress.total > 0 ? (
          <div className="task-detail-progress" aria-hidden>
            <span
              style={{
                width: `${progress.done > 0 ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        ) : null}
        {!isPage && progress.total > 0 ? (
          <p className="task-work-progress-label">
            {t('fieldWork.task.progressSentence', {
              started: started || t('fieldWork.task.startedRecently'),
              done: progress.done,
              total: progress.total,
            })}
          </p>
        ) : null}
        {isPage && !isTerminal ? (
          <p className="task-form-help">{t('fieldWork.detail.checklistHint')}</p>
        ) : null}
        {isPage ? (
          <>
            {essential.length > 0 ? (
              <ul className="task-detail-checklist">{essential.map((item) => renderCheckItem(item, true))}</ul>
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
                  <ul className="task-detail-checklist">
                    {extra.map((item) => renderCheckItem(item, true))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </>
        ) : (
          <ul className="task-detail-checklist">
            {peekChecks.map((item) => renderCheckItem(item, false))}
          </ul>
        )}
      </section>

      {isPage && !isTerminal && (canStart || canComplete) ? (
        <div className="task-detail-sticky">
          {canStart ? (
            <Button variant="primary" size="lg" onClick={() => onStart?.()} disabled={busy}>
              {t('fieldWork.actions.start')}
            </Button>
          ) : (
            <Button variant="primary" size="lg" onClick={() => onComplete?.()} disabled={busy}>
              {progress.total > 0 && progress.done >= progress.total
                ? t('fieldWork.actions.recordResult')
                : t('fieldWork.actions.continueChecks')}
            </Button>
          )}
        </div>
      ) : null}

      <section className="task-detail-card">
        <h2>{t('fieldWork.person')}</h2>
        {isPage ? (
          <label className="task-form-label" htmlFor="task-detail-assignee">
            {t('detail.assignedTo')}
          </label>
        ) : null}
        <select
          id={isPage ? 'task-detail-assignee' : undefined}
          className="task-form-input"
          value={assigneeKey}
          disabled={isTerminal || busy}
          onChange={(e) => onAssign(e.target.value)}
        >
          {assigneeOptions.map((option) => (
            <option key={option.key || 'unassigned'} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      {isPage ? (
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
            <Button variant="primary" size="lg" onClick={() => onAddExpense?.()}>
              {t('fieldWork.detail.addExpense')}
            </Button>
            <Button
              to={moneyPath({ year: task.resultYear, fieldId: task.fieldId, task: task.id })}
              variant="outline"
              size="lg"
            >
              {t('fieldWork.detail.seeMoney')}
            </Button>
          </div>
        </section>
      ) : money ? (
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

      {isPage ? (
        <section className="task-detail-card">
          <h2>{t('fieldWork.form.notes')}</h2>
          {task.notes?.trim() ? (
            <p className="task-detail-notes">{task.notes}</p>
          ) : (
            <p className="task-form-help">
              {isTerminal ? t('fieldWork.detail.noNotes') : t('fieldWork.detail.notesOnComplete')}
            </p>
          )}
        </section>
      ) : task.notes ? (
        <section className="task-detail-card">
          <h2>{t('fieldWork.form.notes', { defaultValue: 'Σημειώσεις' })}</h2>
          <p>{task.notes}</p>
        </section>
      ) : null}

      {isPage && status === 'completed' ? (
        <p className="task-detail-footer-link">
          <Link to="/chronologio">{t('fieldWork.seeCompletedInChronologio')}</Link>
        </p>
      ) : null}

      {!isPage ? (
        <p className="task-form-help">
          <Link to={`/tasks/${task.id}`}>{t('fieldWork.detail.openFullPage')}</Link>
        </p>
      ) : null}
    </div>
  );
};

export default TaskPeekBody;
