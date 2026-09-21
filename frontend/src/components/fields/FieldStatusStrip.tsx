import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldPhenology } from '../../services/fieldWorkService';
import type { FieldTask } from '../../services/fieldWorkService';
import type { ChronologioEntry } from '../../services/chronologioService';
import type { FieldAttentionModel } from '../../utils/fieldOverviewAttention';
import { getNextUpcomingTask } from '../../utils/fieldDisplay';
import { resolveFieldStageLabel } from '../../utils/fieldStage';
import { fieldStreamPath, taskPeekPath } from '../../navigation/intents';

type Props = {
  phenology: FieldPhenology | null;
  currentLifecycleStage?: string | null;
  tasks: FieldTask[];
  attention: FieldAttentionModel;
  latestEntry?: ChronologioEntry;
  now?: Date;
};

const StatusValue: React.FC<{ to?: string; children: React.ReactNode }> = ({ to, children }) => {
  if (!to) return <p className="field-status-value">{children}</p>;
  return (
    <Link className="field-status-value field-status-value--link" to={to}>
      {children}
    </Link>
  );
};

const FieldStatusStrip: React.FC<Props> = ({
  phenology,
  currentLifecycleStage,
  tasks,
  attention,
  latestEntry,
  now,
}) => {
  const { t } = useTranslation(['fields', 'common']);
  const nextTask = getNextUpcomingTask(tasks, now);

  // Same task must not appear as both Next and Attention with the same title.
  const attentionIsSameAsNext =
    Boolean(nextTask) &&
    (attention.kind === 'nextTask' ||
      (attention.taskId != null && nextTask != null && attention.taskId === nextTask.id));

  let attentionLabel: string;
  if (attention.kind === 'none') {
    attentionLabel = t('overview.statusStrip.noWarning');
  } else if (attention.kind === 'overdue' && attention.explanationParams?.days) {
    attentionLabel = t('overview.statusStrip.overdueDays', {
      days: attention.explanationParams.days,
      title: attention.title,
    });
  } else if (attentionIsSameAsNext && attention.kind === 'nextTask') {
    attentionLabel = t('overview.statusStrip.noWarning');
  } else if (attentionIsSameAsNext && attention.kind !== 'nextTask') {
    // Alert about the next task — explain why, not repeat the title alone.
    attentionLabel =
      attention.kind === 'weatherReschedule'
        ? t('overview.statusStrip.weatherRisk', { title: attention.title })
        : attention.title || t('overview.needsAttention');
  } else {
    attentionLabel = attention.title || t('overview.needsAttention');
  }

  const attentionTo =
    attention.kind === 'none' || (attentionIsSameAsNext && attention.kind === 'nextTask')
      ? undefined
      : attention.primaryTo;

  const lastLabel = latestEntry?.title || t('overview.statusStrip.noRecording');
  const stageLabel = resolveFieldStageLabel({
    phenology,
    currentLifecycleStage,
    t,
    unknownLabel: t('overview.statusStrip.unknownStage'),
  });

  return (
    <section className="field-status-strip" aria-label={t('overview.statusStrip.aria')}>
      <div className="field-status-item">
        <p className="field-status-label">{t('overview.statusStrip.now')}</p>
        <p className="field-status-value">{stageLabel}</p>
      </div>
      <div className="field-status-item">
        <p className="field-status-label">{t('overview.nextTask')}</p>
        <StatusValue to={nextTask ? taskPeekPath(nextTask.id) : undefined}>
          {nextTask?.title || t('overview.noNextTask')}
        </StatusValue>
      </div>
      <div className="field-status-item">
        <p className="field-status-label">{t('overview.statusStrip.attention')}</p>
        <StatusValue to={attentionTo}>{attentionLabel}</StatusValue>
      </div>
      <div className="field-status-item">
        <p className="field-status-label">{t('overview.statusStrip.lastRecording')}</p>
        <StatusValue
          to={
            latestEntry
              ? fieldStreamPath(latestEntry.fieldId, { entry: latestEntry.id })
              : undefined
          }
        >
          {lastLabel}
        </StatusValue>
      </div>
    </section>
  );
};

export default FieldStatusStrip;
