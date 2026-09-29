import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../Common/Button';
import {
  formatRecommendedPeriod,
  proposalTitle,
  type ProposalPrioritySection,
  type ProposalTemplateGroup,
} from '../../utils/proposalPresentation';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import TaskCategoryMark from './TaskCategoryMark';
import './TaskProposalCard.css';

interface GroupedProposalCardProps {
  group: ProposalTemplateGroup;
  fieldNames: Record<string, string>;
  fieldColors?: Record<string, string | undefined>;
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
  fieldColors,
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
  const fieldIds = group.fieldIds;
  const visibleIds = expanded ? fieldIds : fieldIds.slice(0, VISIBLE_FIELDS);
  const remaining = fieldIds.length - visibleIds.length;
  const priority: ProposalPrioritySection = group.priority;
  const labelFor = (id: string) =>
    friendlyFieldLabel(fieldNames[id]) || fieldNames[id] || unknownField;
  const primaryField =
    fieldIds.length === 1
      ? null
      : fieldIds.length > 1
        ? t('fieldWork.proposal.forFields', { count: fieldIds.length })
        : null;
  const metaParts = [primaryField, period].filter(Boolean);

  return (
    <article
      className={`task-row task-proposal-card task-proposal-card--grouped${
        priority === 'doNow' ? ' task-row--urgent' : ''
      }`}
    >
      <TaskCategoryMark templateCode={group.templateCode} />
      <div className="task-row-main">
        <h3 className="task-row-title">{title}</h3>
        {metaParts.length > 0 ? (
          <p className="task-row-meta">{metaParts.join(' · ')}</p>
        ) : null}
        {fieldIds.length > 1 ? (
          <ul className="task-row-field-pills">
            {visibleIds.map((id) => {
              const color = resolveFieldColor(fieldColors?.[id], id);
              return (
                <li key={id}>
                  <span className="task-row-field-pill" style={{ ['--field-dot' as string]: color }}>
                    {labelFor(id)}
                  </span>
                </li>
              );
            })}
            {remaining > 0 ? (
              <li>
                <button
                  type="button"
                  className="task-row-more-fields"
                  onClick={() => setExpanded(true)}
                >
                  {t('fieldWork.proposal.moreFields', { count: remaining })}
                </button>
              </li>
            ) : null}
          </ul>
        ) : fieldIds.length === 1 ? (
          <ul className="task-row-field-pills">
            <li>
              <span
                className="task-row-field-pill"
                style={{
                  ['--field-dot' as string]: resolveFieldColor(
                    fieldColors?.[fieldIds[0]],
                    fieldIds[0]
                  ),
                }}
              >
                {labelFor(fieldIds[0])}
              </span>
            </li>
          </ul>
        ) : null}
        <button type="button" className="task-row-why" onClick={onWhy}>
          {t('fieldWork.proposal.whyRecommended')}
        </button>
      </div>
      <div className="task-row-actions">
        <Button variant="primary" size="lg" onClick={onSchedule} disabled={busy}>
          {t('fieldWork.actions.schedule')}
        </Button>
        <button type="button" className="task-row-dismiss" onClick={onDismiss} disabled={busy}>
          {t('fieldWork.actions.notRelevant')}
        </button>
      </div>
    </article>
  );
};

export default GroupedProposalCard;
