import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskProposal } from '../../services/fieldWorkService';
import {
  groupProposalsByTemplate,
  proposalExplanation,
  sectionProposalGroups,
  type ProposalTemplateGroup,
} from '../../utils/proposalPresentation';
import GroupedProposalCard from './GroupedProposalCard';
import TasksEmptyState from './TasksEmptyState';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';

export type ProposalDismissChoice = 'dont_do' | 'already_done' | 'remind_later';

interface TaskProposalListProps {
  proposals: TaskProposal[];
  fieldNames: Record<string, string>;
  unknownField: string;
  introTitle: string;
  introSubtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  busyId: string | null;
  now?: Date;
  onScheduleGroup: (group: ProposalTemplateGroup) => void;
  onDismissChoice: (group: ProposalTemplateGroup, choice: ProposalDismissChoice) => void;
}

const TaskProposalList: React.FC<TaskProposalListProps> = ({
  proposals,
  fieldNames,
  unknownField,
  introTitle,
  introSubtitle,
  emptyTitle,
  emptyDescription,
  busyId,
  now,
  onScheduleGroup,
  onDismissChoice,
}) => {
  const { t, i18n } = useTranslation('tasks');
  const [whyGroup, setWhyGroup] = useState<ProposalTemplateGroup | null>(null);
  const [dismissGroup, setDismissGroup] = useState<ProposalTemplateGroup | null>(null);
  const [laterCollapsed, setLaterCollapsed] = useState(true);

  if (proposals.length === 0) {
    return <TasksEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const grouped = groupProposalsByTemplate(proposals, now);
  const sections = sectionProposalGroups(grouped);

  const renderSection = (
    id: string,
    label: string,
    items: ProposalTemplateGroup[],
    collapsed?: boolean
  ) => {
    if (items.length === 0) return null;
    return (
      <section className="tasks-proposal-group" aria-labelledby={`tasks-group-${id}`}>
        <div className="tasks-proposal-group-header">
          <h3 id={`tasks-group-${id}`} className="tasks-proposal-group-title">
            {label}
            <span className="tasks-section-count"> · {items.length}</span>
          </h3>
          {collapsed != null ? (
            <button
              type="button"
              className="tasks-proposal-collapse"
              aria-expanded={!collapsed}
              onClick={() => setLaterCollapsed((value) => !value)}
            >
              {collapsed ? t('fieldWork.proposal.showLater') : t('fieldWork.proposal.hideLater')}
            </button>
          ) : null}
        </div>
        {collapsed ? null : (
          <div className="tasks-view-items">
            {items.map((group) => (
              <GroupedProposalCard
                key={group.key}
                group={group}
                fieldNames={fieldNames}
                unknownField={unknownField}
                busy={group.proposals.some((p) => p.id === busyId)}
                onSchedule={() => onScheduleGroup(group)}
                onDismiss={() => setDismissGroup(group)}
                onWhy={() => setWhyGroup(group)}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="tasks-proposal-list">
      <header className="tasks-view-intro">
        <h2 className="tasks-view-intro-title">{introTitle}</h2>
        <p className="tasks-view-intro-copy">{introSubtitle}</p>
      </header>

      {renderSection('doNow', t('fieldWork.proposalGroups.doNow'), sections.doNow)}
      {renderSection('canWait', t('fieldWork.proposalGroups.canWait'), sections.canWait)}
      {renderSection(
        'laterYear',
        t('fieldWork.proposalGroups.laterYear'),
        sections.laterYear,
        laterCollapsed
      )}

      <RightDrawer
        open={Boolean(whyGroup)}
        onClose={() => setWhyGroup(null)}
        title={t('fieldWork.proposal.whyRecommended')}
      >
        {whyGroup ? (
          <p>{proposalExplanation(whyGroup.proposals[0], i18n.language)}</p>
        ) : null}
      </RightDrawer>

      <RightDrawer
        open={Boolean(dismissGroup)}
        onClose={() => setDismissGroup(null)}
        title={t('fieldWork.dismiss.title')}
        footer={null}
      >
        {dismissGroup ? (
          <div className="tasks-dismiss-choices">
            <p className="tasks-dismiss-copy">{t('fieldWork.dismiss.copy')}</p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                onDismissChoice(dismissGroup, 'dont_do');
                setDismissGroup(null);
              }}
            >
              {t('fieldWork.dismiss.dontDo')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                onDismissChoice(dismissGroup, 'already_done');
                setDismissGroup(null);
              }}
            >
              {t('fieldWork.dismiss.alreadyDone')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                onDismissChoice(dismissGroup, 'remind_later');
                setDismissGroup(null);
              }}
            >
              {t('fieldWork.dismiss.remindLater')}
            </Button>
          </div>
        ) : null}
      </RightDrawer>
    </div>
  );
};

export default TaskProposalList;
