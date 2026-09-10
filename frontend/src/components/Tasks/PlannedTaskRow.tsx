import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldTask } from '../../services/fieldWorkService';
import Button from '../Common/Button';
import { formatCompactTaskPeriod } from '../../utils/taskDateRange';
import { checklistProgress } from '../../utils/plannedTaskGroups';
import { isWeatherSensitiveTemplate } from '../../data/fieldWorkCatalogueLabels';
import { resolveWeatherKind } from '../../utils/taskWeather';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import { weatherExplanationCopy, type ProposalChip } from '../../utils/proposalPresentation';
import WeatherSuitabilityBadge from './WeatherSuitabilityBadge';
import './TaskProposalCard.css';
import './TaskWorkRow.css';

interface PlannedTaskRowProps {
  task: FieldTask;
  fieldName: string;
  personName?: string;
  year: number;
  busy?: boolean;
  highlighted?: boolean;
  onStart: () => void;
  onOpen: () => void;
}

const PlannedTaskRow: React.FC<PlannedTaskRowProps> = ({
  task,
  fieldName,
  personName,
  year,
  busy,
  highlighted,
  onStart,
  onOpen,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const period = formatCompactTaskPeriod(task.plannedStart, task.plannedEnd, i18n.language, year);
  const progress = checklistProgress(task);
  const blocked = String(task.status).toLowerCase() === 'blocked';
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
    () => weatherExplanationCopy(weatherKind === 'not_sensitive' ? 'not_sensitive' : weatherKind, [], i18n.language),
    [weatherKind, i18n.language]
  );

  return (
    <article
      className={`task-work-row task-work-row--planned${highlighted ? ' is-created' : ''}`}
      data-task-id={task.id}
    >
      <div className="task-work-main">
        <h3 className="task-work-title">
          <Link to={`/tasks/${task.id}`}>{title}</Link>
        </h3>
        <p className="task-work-context">
          <span>{fieldName}</span>
          {period ? <span> · {period}</span> : null}
        </p>
      </div>
      <div className="task-work-meta">
        {blocked ? (
          <span className="task-proposal-chip task-proposal-chip--caution">{t('fieldWork.task.blocked')}</span>
        ) : null}
        {weatherChip ? (
          <WeatherSuitabilityBadge
            chip={weatherChip}
            label={
              weatherChip.id === 'unknown' ? t('fieldWork.weather.unknown') : t(weatherChip.labelKey)
            }
            headline={weatherCopy.headline}
            facts={weatherCopy.facts}
          />
        ) : null}
        {progress.total > 0 ? (
          <span className="task-work-checks">
            {t('fieldWork.task.checksShort', { done: progress.done, total: progress.total })}
          </span>
        ) : null}
        {personName ? <span className="task-work-person">{personName}</span> : null}
      </div>
      <div className="task-work-actions">
        {blocked ? (
          <Button variant="outline" size="lg" onClick={onOpen} disabled={busy}>
            {t('fieldWork.actions.open')}
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={onStart} disabled={busy}>
            {t('fieldWork.actions.start')}
          </Button>
        )}
      </div>
    </article>
  );
};

export default PlannedTaskRow;
