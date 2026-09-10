import React from 'react';
import type { FieldWeather } from '../../services/geospatialService';
import type { TaskProposal } from '../../services/fieldWorkService';
import { groupProposals } from '../../utils/proposalPresentation';
import type { ProposalDismissDecision } from './ProposalActionsMenu';
import TaskProposalCard from './TaskProposalCard';
import TasksEmptyState from './TasksEmptyState';

interface TaskProposalListProps {
  proposals: TaskProposal[];
  fieldNames: Record<string, string>;
  unknownField: string;
  introTitle: string;
  introSubtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  needsDecisionLabel: string;
  canWaitLabel: string;
  weatherByField: Record<string, FieldWeather | null>;
  busyId: string | null;
  now?: Date;
  onSchedule: (proposal: TaskProposal) => void;
  onSnooze: (proposal: TaskProposal) => void;
  onDismiss: (proposal: TaskProposal, decision: ProposalDismissDecision) => void;
}

const TaskProposalList: React.FC<TaskProposalListProps> = ({
  proposals,
  fieldNames,
  unknownField,
  introTitle,
  introSubtitle,
  emptyTitle,
  emptyDescription,
  needsDecisionLabel,
  canWaitLabel,
  weatherByField,
  busyId,
  now,
  onSchedule,
  onSnooze,
  onDismiss,
}) => {
  if (proposals.length === 0) {
    return <TasksEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const groups = groupProposals(proposals, now);
  const showHeadings = proposals.length >= 4 && groups.canWait.length > 0;

  const renderCards = (items: TaskProposal[]) =>
    items.map((proposal) => (
      <TaskProposalCard
        key={proposal.id}
        proposal={proposal}
        fieldName={fieldNames[proposal.fieldId] || unknownField}
        weather={proposal.fieldId ? weatherByField[proposal.fieldId] : null}
        busy={busyId === proposal.id}
        now={now}
        onSchedule={() => onSchedule(proposal)}
        onSnooze={() => onSnooze(proposal)}
        onDismiss={(decision) => onDismiss(proposal, decision)}
      />
    ));

  return (
    <div className="tasks-proposal-list">
      <header className="tasks-view-intro">
        <h2 className="tasks-view-intro-title">{introTitle}</h2>
        <p className="tasks-view-intro-copy">{introSubtitle}</p>
      </header>
      {showHeadings ? (
        <>
          {groups.needsDecision.length > 0 ? (
            <section className="tasks-proposal-group" aria-labelledby="tasks-group-decision">
              <h3 id="tasks-group-decision" className="tasks-proposal-group-title">
                {needsDecisionLabel}
              </h3>
              <div className="tasks-view-items">{renderCards(groups.needsDecision)}</div>
            </section>
          ) : null}
          {groups.canWait.length > 0 ? (
            <section className="tasks-proposal-group" aria-labelledby="tasks-group-wait">
              <h3 id="tasks-group-wait" className="tasks-proposal-group-title">
                {canWaitLabel}
              </h3>
              <div className="tasks-view-items">{renderCards(groups.canWait)}</div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="tasks-view-items">{renderCards(groups.needsDecision)}</div>
      )}
    </div>
  );
};

export default TaskProposalList;
