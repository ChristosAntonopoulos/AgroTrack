import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal } from 'lucide-react';
import type { FieldTask } from '../../services/fieldWorkService';
import Button from '../Common/Button';
import { formatCompactTaskPeriod, formatTaskDay } from '../../utils/taskDateRange';
import { checklistProgress, taskStartedAt } from '../../utils/plannedTaskGroups';
import { isWeatherSensitiveTemplate } from '../../data/fieldWorkCatalogueLabels';
import { resolveWeatherKind } from '../../utils/taskWeather';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { weatherExplanationCopy, type ProposalChip } from '../../utils/proposalPresentation';
import type { AttentionReasonId } from '../../utils/nowAttention';
import { attentionReasonKey } from '../../utils/nowAttention';
import WeatherSuitabilityBadge from './WeatherSuitabilityBadge';
import './TaskProposalCard.css';
import './TaskWorkRow.css';

export type TaskWorkPrimaryAction = 'start' | 'continue' | 'open' | 'viewResult' | 'restore' | 'repeat';

interface TaskWorkCardProps {
  task: FieldTask;
  fieldName: string;
  personName?: string;
  year: number;
  busy?: boolean;
  highlighted?: boolean;
  attentionReasonId?: AttentionReasonId;
  attentionParams?: Record<string, string | number>;
  progressSentence?: string;
  primaryAction: TaskWorkPrimaryAction;
  secondaryAction?: 'reschedule' | 'pause' | null;
  onPrimary: () => void;
  onSecondary?: () => void;
  onOpen: () => void;
  onOverflow?: (action: 'edit' | 'copy' | 'changeStatus' | 'cancel' | 'delete') => void;
  showOverflow?: boolean;
}

const TaskWorkCard: React.FC<TaskWorkCardProps> = ({
  task,
  fieldName,
  personName,
  year,
  busy,
  highlighted,
  attentionReasonId,
  attentionParams,
  progressSentence,
  primaryAction,
  secondaryAction,
  onPrimary,
  onSecondary,
  onOpen,
  onOverflow,
  showOverflow = true,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const period = formatCompactTaskPeriod(task.plannedStart, task.plannedEnd, i18n.language, year);
  const progress = checklistProgress(task);
  const status = String(task.status).toLowerCase();
  const blocked = status === 'blocked';
  const inProgress = status === 'in_progress';
  const weatherKind = resolveWeatherKind(task.weatherSuitability);
  const showWeather =
    weatherKind === 'unknown' ||
    (isWeatherSensitiveTemplate(task.templateCode) && weatherKind !== 'not_sensitive');
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

  const primaryLabel =
    primaryAction === 'start'
      ? t('fieldWork.actions.start')
      : primaryAction === 'continue'
        ? t('fieldWork.actions.continueIt')
        : primaryAction === 'viewResult'
          ? t('fieldWork.actions.viewResult')
          : primaryAction === 'restore'
            ? t('fieldWork.actions.restore')
            : primaryAction === 'repeat'
              ? t('fieldWork.actions.repeat')
              : t('fieldWork.actions.open');

  const secondaryLabel =
    secondaryAction === 'reschedule'
      ? t('fieldWork.actions.changeDate')
      : secondaryAction === 'pause'
        ? t('fieldWork.actions.pause')
        : null;

  const started = formatTaskDay(taskStartedAt(task), i18n.language, year);
  const reasonText = attentionReasonId
    ? t(attentionReasonKey(attentionReasonId), attentionParams || {})
    : null;

  const sentence =
    progressSentence ||
    (inProgress && progress.total > 0
      ? t('fieldWork.task.progressSentence', {
          started: started || t('fieldWork.task.startedRecently'),
          done: progress.done,
          total: progress.total,
        })
      : null);

  return (
    <article
      className={`task-work-row${inProgress ? ' task-work-row--active' : ''}${highlighted ? ' is-created' : ''}${attentionReasonId ? ' task-work-row--attention' : ''}`}
      data-task-id={task.id}
    >
      <button type="button" className="task-work-hit" onClick={onOpen} aria-label={title}>
        <div className="task-work-main">
          <h3 className="task-work-title">{title}</h3>
          <p className="task-work-context">
            <span>{fieldName}</span>
            {period ? <span> · {period}</span> : null}
          </p>
          {reasonText ? <p className="task-work-reason">{reasonText}</p> : null}
          {sentence ? <p className="task-work-progress-label">{sentence}</p> : null}
          {personName ? <p className="task-work-person">{personName}</p> : null}
        </div>
      </button>
      <div className="task-work-meta">
        {blocked ? (
          <span className="task-proposal-chip task-proposal-chip--caution">
            {t('fieldWork.task.blocked')}
          </span>
        ) : null}
        {task.isPaused ? (
          <span className="task-proposal-chip task-proposal-chip--caution">
            {t('fieldWork.task.paused')}
          </span>
        ) : null}
        {weatherChip ? (
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
        ) : null}
        {!sentence && progress.total > 0 ? (
          <span className="task-work-checks">
            {t('fieldWork.task.checksShort', { done: progress.done, total: progress.total })}
          </span>
        ) : null}
      </div>
      <div className="task-work-actions">
        {secondaryLabel && onSecondary ? (
          <Button variant="outline" size="lg" onClick={onSecondary} disabled={busy}>
            {secondaryLabel}
          </Button>
        ) : null}
        <Button variant="primary" size="lg" onClick={onPrimary} disabled={busy}>
          {primaryLabel}
        </Button>
        {showOverflow && onOverflow ? (
          <details className="task-work-overflow">
            <summary aria-label={t('fieldWork.actions.more')}>
              <MoreHorizontal size={20} aria-hidden />
            </summary>
            <div className="task-work-overflow-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => onOverflow('edit')}>
                {t('fieldWork.actions.edit')}
              </button>
              <button type="button" role="menuitem" onClick={() => onOverflow('copy')}>
                {t('fieldWork.actions.copy')}
              </button>
              <button type="button" role="menuitem" onClick={() => onOverflow('changeStatus')}>
                {t('fieldWork.actions.changeStatus')}
              </button>
              {status !== 'cancelled' && status !== 'completed' ? (
                <button type="button" role="menuitem" onClick={() => onOverflow('cancel')}>
                  {t('fieldWork.actions.cancelTask')}
                </button>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </article>
  );
};

export default TaskWorkCard;
