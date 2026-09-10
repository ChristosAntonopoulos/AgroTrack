import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { FieldPhenology } from '../../services/fieldWorkService';
import type { FieldTask } from '../../services/fieldWorkService';
import type { ChronologioEntry } from '../../services/chronologioService';
import type { FieldAttentionModel } from '../../utils/fieldOverviewAttention';
import { getNextUpcomingTask } from '../../utils/fieldDisplay';

type Props = {
  phenology: FieldPhenology | null;
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

const FieldStatusStrip: React.FC<Props> = ({ phenology, tasks, attention, latestEntry, now }) => {
  const { t } = useTranslation('fields');
  const nextTask = getNextUpcomingTask(tasks, now);
  const attentionLabel =
    attention.kind === 'none'
      ? t('overview.statusStrip.noWarning')
      : attention.title || t('overview.needsAttention');
  const lastLabel = latestEntry?.title || t('overview.statusStrip.noRecording');

  return (
    <section className="field-status-strip" aria-label={t('overview.statusStrip.aria')}>
      <div className="field-status-item">
        <p className="field-status-label">{t('overview.statusStrip.now')}</p>
        <p className="field-status-value">
          {phenology?.isKnown ? phenology.stageLabel : phenology?.message || t('overview.statusStrip.unknownStage')}
        </p>
      </div>
      <div className="field-status-item">
        <p className="field-status-label">{t('overview.nextTask')}</p>
        <StatusValue to={nextTask ? `/tasks/${nextTask.id}` : undefined}>
          {nextTask?.title || t('overview.noNextTask')}
        </StatusValue>
      </div>
      <div className="field-status-item">
        <p className="field-status-label">{t('overview.statusStrip.attention')}</p>
        <StatusValue to={attention.primaryTo}>{attentionLabel}</StatusValue>
      </div>
      <div className="field-status-item">
        <p className="field-status-label">{t('overview.statusStrip.lastRecording')}</p>
        <StatusValue
          to={
            latestEntry
              ? `/fields/${latestEntry.fieldId}?tab=chronologio&entry=${encodeURIComponent(latestEntry.id)}`
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
