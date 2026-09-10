import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldWeather } from '../../services/geospatialService';
import type { TaskProposal } from '../../services/fieldWorkService';
import Button from '../Common/Button';
import {
  evaluateProposalWeather,
  formatRecommendedPeriod,
  humanMetaLabel,
  proposalChips,
  proposalExplanation,
  proposalTitle,
  weatherExplanationCopy,
} from '../../utils/proposalPresentation';
import ProposalActionsMenu, { type ProposalDismissDecision } from './ProposalActionsMenu';
import ProposalCategoryIcon from './ProposalCategoryIcon';
import ProposalDetailsDialog from './ProposalDetailsDialog';
import ProposalReason from './ProposalReason';
import ProposalTiming from './ProposalTiming';
import WeatherSuitabilityBadge from './WeatherSuitabilityBadge';
import './TaskProposalCard.css';

interface TaskProposalCardProps {
  proposal: TaskProposal;
  fieldName: string;
  weather?: FieldWeather | null;
  busy?: boolean;
  now?: Date;
  onSchedule: () => void;
  onSnooze: () => void;
  onDismiss: (decision: ProposalDismissDecision) => void;
}

const TaskProposalCard: React.FC<TaskProposalCardProps> = ({
  proposal,
  fieldName,
  weather,
  busy,
  now,
  onSchedule,
  onSnooze,
  onDismiss,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const moreAnchorRef = useRef<HTMLDivElement>(null);
  const language = i18n.language || 'el';
  const title = proposalTitle(proposal, language);
  const explanation = proposalExplanation(proposal, language);
  const period = formatRecommendedPeriod(proposal, language);
  const evaluation = useMemo(() => evaluateProposalWeather(proposal, weather), [proposal, weather]);
  const chips = useMemo(
    () => proposalChips(proposal, evaluation.kind, now),
    [proposal, evaluation.kind, now]
  );
  const weatherCopy = weatherExplanationCopy(evaluation.kind, evaluation.facts, language);
  const source = humanMetaLabel(proposal.sourceTypeLabel);
  const confidence = humanMetaLabel(proposal.confidenceLabel);

  return (
    <article className="task-proposal-card">
      <ProposalCategoryIcon templateCode={proposal.templateCode} label={title} />
      <div className="task-proposal-body">
        <header className="task-proposal-header">
          <h3 className="task-proposal-title">{title}</h3>
          <p className="task-proposal-field">{fieldName}</p>
        </header>
        <ProposalReason text={explanation} />
        <ProposalTiming period={period} label={t('fieldWork.proposal.period')} />
        <div className="task-proposal-chips">
          {chips.map((chip) => (
            <WeatherSuitabilityBadge
              key={chip.id}
              chip={chip}
              label={t(chip.labelKey)}
              headline={weatherCopy.headline}
              facts={weatherCopy.facts}
            />
          ))}
        </div>
      </div>
      <div className="task-proposal-actions">
        <Button
          variant="primary"
          size="lg"
          onClick={onSchedule}
          disabled={busy}
          className="task-proposal-schedule"
        >
          {t('fieldWork.actions.scheduleIt')}
        </Button>
        <div ref={moreAnchorRef}>
          <ProposalActionsMenu
            disabled={busy}
            moreLabel={t('fieldWork.proposal.more')}
            remindLaterLabel={t('fieldWork.proposal.remindLater')}
            notForFieldLabel={t('fieldWork.proposal.notForField')}
            notThisYearLabel={t('fieldWork.proposal.notThisYear')}
            whyLabel={t('fieldWork.proposal.why')}
            onRemindLater={onSnooze}
            onDismiss={onDismiss}
            onWhy={() => setDetailsOpen(true)}
          />
        </div>
      </div>
      <ProposalDetailsDialog
        open={detailsOpen}
        title={t('fieldWork.proposal.why')}
        fieldName={fieldName}
        explanation={explanation}
        periodLabel={t('fieldWork.proposal.period')}
        period={period}
        sourceLabel={t('fieldWork.proposal.source')}
        source={source}
        confidenceLabel={t('fieldWork.proposal.confidence')}
        confidence={confidence}
        weatherLabel={t('fieldWork.weather.explain')}
        weatherHeadline={weatherCopy.headline}
        weatherFacts={weatherCopy.facts}
        closeLabel={t('fieldWork.proposal.close')}
        onClose={() => setDetailsOpen(false)}
        returnFocusTo={moreAnchorRef.current?.querySelector('button') ?? null}
      />
    </article>
  );
};

export default TaskProposalCard;
