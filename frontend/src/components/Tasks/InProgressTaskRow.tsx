import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldTask } from '../../services/fieldWorkService';
import Button from '../Common/Button';
import { formatTaskDay } from '../../utils/taskDateRange';
import { checklistProgress, taskStartedAt } from '../../utils/plannedTaskGroups';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import './TaskWorkRow.css';

interface InProgressTaskRowProps {
  task: FieldTask;
  fieldName: string;
  personName?: string;
  year: number;
  busy?: boolean;
  onContinue: () => void;
}

const InProgressTaskRow: React.FC<InProgressTaskRowProps> = ({
  task,
  fieldName,
  personName,
  year,
  busy,
  onContinue,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const title = taskDisplayTitle(task.title, task.templateCode, i18n.language);
  const started = formatTaskDay(taskStartedAt(task), i18n.language, year);
  const updated = formatTaskDay(task.updatedAt, i18n.language, year);
  const showUpdated = Boolean(updated && started && updated !== started);
  const progress = checklistProgress(task);
  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <article className="task-work-row task-work-row--active">
      <div className="task-work-main">
        <h3 className="task-work-title">
          <Link to={`/tasks/${task.id}`}>{title}</Link>
        </h3>
        <p className="task-work-context">{fieldName}</p>
        <p className="task-work-started">
          {started ? (
            <span>
              {t('fieldWork.task.started', { date: started })}
              {personName ? ` · ${personName}` : ''}
            </span>
          ) : personName ? (
            <span>{personName}</span>
          ) : null}
          {showUpdated ? (
            <span className="task-work-updated">
              {t('fieldWork.task.updated', { date: updated })}
            </span>
          ) : null}
        </p>
        {progress.total > 0 ? (
          <div className="task-work-progress">
            <div
              className="task-work-progress-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={t('fieldWork.task.checksLong', { done: progress.done, total: progress.total })}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <p className="task-work-progress-label">
              {t('fieldWork.task.checksLong', { done: progress.done, total: progress.total })}
            </p>
          </div>
        ) : null}
      </div>
      <div className="task-work-actions">
        <Button variant="primary" size="lg" onClick={onContinue} disabled={busy}>
          {t('fieldWork.actions.continueIt')}
        </Button>
      </div>
    </article>
  );
};

export default InProgressTaskRow;
