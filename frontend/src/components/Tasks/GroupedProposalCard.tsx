import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import {
  formatRecommendedPeriod,
  proposalExplanation,
  proposalTitle,
  type ProposalTemplateGroup,
} from '../../utils/proposalPresentation';
import './TaskProposalCard.css';

interface GroupedProposalCardProps {
  group: ProposalTemplateGroup;
  fieldNames: Record<string, string>;
  unknownField: string;
  busy?: boolean;
  onSchedule: () => void;
  onDismiss: () => void;
  onWhy: () => void;
}

const VISIBLE_FIELDS = 3;

const GroupedProposalCard: React.FC<GroupedProposalCardProps> = ({
  group,
  fieldNames,
  unknownField,
  busy,
  onSchedule,
  onDismiss,
  onWhy,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const [expanded, setExpanded] = useState(false);
  const title = proposalTitle(group.proposals[0], i18n.language);
  const period = formatRecommendedPeriod(group.proposals[0], i18n.language);
  const explanation = proposalExplanation(group.proposals[0], i18n.language);
  const fieldLabels = group.fieldIds.map((id) => fieldNames[id] || unknownField);
  const visible = expanded ? fieldLabels : fieldLabels.slice(0, VISIBLE_FIELDS);
  const remaining = fieldLabels.length - visible.length;

  return (
    <article className="task-proposal-card task-proposal-card--grouped">
      <div className="task-proposal-main">
        <h3 className="task-proposal-title">{title}</h3>
        <p className="task-proposal-fields-count">
          {t('fieldWork.proposal.forFields', { count: group.fieldIds.length })}
        </p>
        {period ? (
          <p className="task-proposal-period">
            {t('fieldWork.proposal.suitablePeriod')}: {period}
          </p>
        ) : null}
        <ul className="task-proposal-field-chips">
          {visible.map((name) => (
            <li key={name}>{name}</li>
          ))}
          {remaining > 0 ? (
            <li>
              <button
                type="button"
                className="task-proposal-more-fields"
                onClick={() => setExpanded(true)}
              >
                {t('fieldWork.proposal.moreFields', { count: remaining })}
              </button>
            </li>
          ) : null}
        </ul>
        <button type="button" className="task-proposal-why-link" onClick={onWhy}>
          {t('fieldWork.proposal.whyRecommended')}
        </button>
        <p className="task-proposal-explanation">{explanation}</p>
      </div>
      <div className="task-proposal-actions">
        <Button variant="primary" size="lg" onClick={onSchedule} disabled={busy}>
          {t('fieldWork.actions.schedule')}
        </Button>
        <Button variant="outline" size="lg" onClick={onDismiss} disabled={busy}>
          {t('fieldWork.actions.notRelevant')}
        </Button>
      </div>
    </article>
  );
};

export default GroupedProposalCard;
