import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldTask } from '../../services/fieldWorkService';
import { buildNowBuckets } from '../../utils/nowAttention';
import { resolveTaskPerson } from '../../utils/plannedTaskGroups';
import { formatLongTaskDate } from '../../utils/taskFormDates';
import { taskDisplayTitle } from '../../utils/taskDisplayTitle';
import TaskWorkCard from './TaskWorkCard';
import Button from '../Common/Button';
import TasksEmptyState from './TasksEmptyState';
import WeatherRescheduleNudge from './WeatherRescheduleNudge';

interface NowTaskViewProps {
  tasks: FieldTask[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  onOpen: (task: FieldTask) => void;
  onStart: (task: FieldTask) => void;
  onContinue: (task: FieldTask) => void;
  onReschedule: (task: FieldTask) => void;
  onPause: (task: FieldTask) => void;
  onSeeUpcoming: () => void;
  onOverflow: (task: FieldTask, action: 'edit' | 'copy' | 'changeStatus' | 'cancel' | 'delete') => void;
}

const NowTaskView: React.FC<NowTaskViewProps> = ({
  tasks,
  fieldNames,
  personNames,
  year,
  busyId,
  onOpen,
  onStart,
  onContinue,
  onReschedule,
  onPause,
  onSeeUpcoming,
  onOverflow,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const buckets = buildNowBuckets(tasks);
  const unknownField = t('fieldWork.unknownField');

  const hasContent =
    buckets.attention.length > 0 ||
    buckets.inProgress.length > 0 ||
    buckets.today.length > 0 ||
    buckets.thisWeekPreview.length > 0;

  if (!hasContent) {
    const next = buckets.nextUpcoming;
    const nextTitle = next
      ? taskDisplayTitle(next.title, next.templateCode, i18n.language)
      : '';
    const nextDate = next ? formatLongTaskDate(next.plannedStart || next.plannedEnd, i18n.language) : '';
    return (
      <div className="tasks-now-empty">
        <TasksEmptyState
          title={t('fieldWork.empty.nowTitle')}
          description={
            next
              ? t('fieldWork.empty.nowNext', { title: nextTitle, date: nextDate })
              : t('fieldWork.empty.nowDescription')
          }
          action={
            <Button variant="outline" size="lg" onClick={onSeeUpcoming}>
              {t('fieldWork.empty.seeUpcoming')}
            </Button>
          }
        />
      </div>
    );
  }

  const fieldOf = (task: FieldTask) => fieldNames[task.fieldId] || unknownField;
  const personOf = (task: FieldTask) => resolveTaskPerson(task, personNames) || undefined;

  return (
    <div className="tasks-now-view">
      {buckets.attention.length > 0 ? (
        <section className="tasks-section" aria-labelledby="tasks-now-attention">
          <h2 id="tasks-now-attention" className="tasks-section-title">
            {t('fieldWork.nowSections.attention')}
            <span className="tasks-section-count"> · {buckets.attention.length}</span>
          </h2>
          <ul className="tasks-section-list">
            {buckets.attention.map((item) => (
              <li key={item.task.id}>
                {item.reasonId === 'weatherBlocked' ? (
                  <WeatherRescheduleNudge
                    task={item.task}
                    onMove={() => onReschedule(item.task)}
                    onKeep={() => undefined}
                  />
                ) : null}
                <TaskWorkCard
                  task={item.task}
                  fieldName={fieldOf(item.task)}
                  personName={personOf(item.task)}
                  year={year}
                  busy={busyId === item.task.id}
                  attentionReasonId={item.reasonId}
                  attentionParams={item.params}
                  primaryAction={
                    String(item.task.status).toLowerCase() === 'in_progress' ? 'continue' : 'start'
                  }
                  secondaryAction="reschedule"
                  onPrimary={() =>
                    String(item.task.status).toLowerCase() === 'in_progress'
                      ? onContinue(item.task)
                      : onStart(item.task)
                  }
                  onSecondary={() => onReschedule(item.task)}
                  onOpen={() => onOpen(item.task)}
                  onOverflow={(action) => onOverflow(item.task, action)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {buckets.inProgress.length > 0 ? (
        <section className="tasks-section" aria-labelledby="tasks-now-active">
          <h2 id="tasks-now-active" className="tasks-section-title">
            {t('fieldWork.nowSections.inProgress')}
            <span className="tasks-section-count"> · {buckets.inProgress.length}</span>
          </h2>
          <ul className="tasks-section-list">
            {buckets.inProgress.map((task) => (
              <li key={task.id}>
                <TaskWorkCard
                  task={task}
                  fieldName={fieldOf(task)}
                  personName={personOf(task)}
                  year={year}
                  busy={busyId === task.id}
                  primaryAction="continue"
                  secondaryAction="pause"
                  onPrimary={() => onContinue(task)}
                  onSecondary={() => onPause(task)}
                  onOpen={() => onOpen(task)}
                  onOverflow={(action) => onOverflow(task, action)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {buckets.today.length > 0 ? (
        <section className="tasks-section" aria-labelledby="tasks-now-today">
          <h2 id="tasks-now-today" className="tasks-section-title">
            {t('fieldWork.nowSections.today')}
            <span className="tasks-section-count"> · {buckets.today.length}</span>
          </h2>
          <ul className="tasks-section-list">
            {buckets.today.map((task) => (
              <li key={task.id}>
                <TaskWorkCard
                  task={task}
                  fieldName={fieldOf(task)}
                  personName={personOf(task)}
                  year={year}
                  busy={busyId === task.id}
                  primaryAction="start"
                  secondaryAction="reschedule"
                  onPrimary={() => onStart(task)}
                  onSecondary={() => onReschedule(task)}
                  onOpen={() => onOpen(task)}
                  onOverflow={(action) => onOverflow(task, action)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {buckets.thisWeekPreview.length > 0 ? (
        <section className="tasks-section" aria-labelledby="tasks-now-week">
          <h2 id="tasks-now-week" className="tasks-section-title">
            {t('fieldWork.nowSections.thisWeek')}
            <span className="tasks-section-count"> · {buckets.thisWeekPreview.length}</span>
          </h2>
          <ul className="tasks-section-list">
            {buckets.thisWeekPreview.map((task) => (
              <li key={task.id}>
                <TaskWorkCard
                  task={task}
                  fieldName={fieldOf(task)}
                  personName={personOf(task)}
                  year={year}
                  busy={busyId === task.id}
                  primaryAction="start"
                  secondaryAction="reschedule"
                  onPrimary={() => onStart(task)}
                  onSecondary={() => onReschedule(task)}
                  onOpen={() => onOpen(task)}
                  onOverflow={(action) => onOverflow(task, action)}
                />
              </li>
            ))}
          </ul>
          <div className="tasks-section-footer">
            <Button variant="outline" size="lg" onClick={onSeeUpcoming}>
              {t('fieldWork.nowSections.seeAllUpcoming')}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default NowTaskView;
