import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TaskProposal } from '../../services/fieldWorkService';
import {
  formatRecommendedPeriod,
  groupProposalsByTemplate,
  proposalExplanation,
  proposalTitle,
  sectionProposalGroups,
  type ProposalTemplateGroup,
} from '../../utils/proposalPresentation';
import { resolveFieldColor } from '../../utils/fieldColors';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import GroupedProposalCard from './GroupedProposalCard';
import TaskCategoryMark from './TaskCategoryMark';
import TasksEmptyState from './TasksEmptyState';
import RightDrawer from '../Common/RightDrawer';
import Button from '../Common/Button';
import './TasksShell.css';

export type ProposalDismissChoice = 'dont_do' | 'already_done' | 'remind_later';

interface TaskProposalListProps {
  proposals: TaskProposal[];
  fieldNames: Record<string, string>;
  fieldColors?: Record<string, string | undefined>;
  unknownField: string;
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
  fieldColors,
  unknownField,
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

  const fieldLabel = (id: string) => friendlyFieldLabel(fieldNames[id]) || fieldNames[id] || unknownField;

  const renderSection = (
    id: string,
    label: string,
    items: ProposalTemplateGroup[],
    collapsed?: boolean
  ) => {
    if (items.length === 0) return null;
    return (
      <section
        className={`tasks-proposal-group${id === 'doNow' ? ' tasks-proposal-group--urgent' : ''}`}
        aria-labelledby={`tasks-group-${id}`}
      >
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
                fieldColors={fieldColors}
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

  const whyLead = whyGroup?.proposals[0];
  const whyTitle = whyLead ? proposalTitle(whyLead, i18n.language) : '';
  const whyPeriod = whyLead ? formatRecommendedPeriod(whyLead, i18n.language) : '';
  const whyBusy = whyGroup ? whyGroup.proposals.some((p) => p.id === busyId) : false;

  return (
    <div className="tasks-proposal-list">
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
        footer={
          whyGroup ? (
            <div className="tasks-why-footer">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={whyBusy}
                onClick={() => {
                  onScheduleGroup(whyGroup);
                  setWhyGroup(null);
                }}
              >
                {t('fieldWork.actions.schedule')}
              </Button>
              <button
                type="button"
                className="task-row-dismiss"
                disabled={whyBusy}
                onClick={() => {
                  setDismissGroup(whyGroup);
                  setWhyGroup(null);
                }}
              >
                {t('fieldWork.actions.notRelevant')}
              </button>
            </div>
          ) : null
        }
      >
        {whyGroup && whyLead ? (
          <div className="tasks-why-body">
            <div className="tasks-why-hero">
              <TaskCategoryMark templateCode={whyGroup.templateCode} size={22} />
              <div>
                <p className="tasks-why-kicker">{t('fieldWork.proposal.whyIntro')}</p>
                <p className="tasks-why-title">{whyTitle}</p>
              </div>
            </div>

            <div className="tasks-why-callout">
              <p>{proposalExplanation(whyLead, i18n.language)}</p>
            </div>

            {whyPeriod ? (
              <div className="tasks-why-fact">
                <span className="tasks-why-label">{t('fieldWork.proposal.suitablePeriod')}</span>
                <span className="tasks-why-chip">{whyPeriod}</span>
              </div>
            ) : null}

            {whyGroup.fieldIds.length > 0 ? (
              <div className="tasks-why-fact">
                <span className="tasks-why-label">{t('fieldWork.proposal.fieldsLabel')}</span>
                <ul className="task-row-field-pills">
                  {whyGroup.fieldIds.map((id) => (
                    <li key={id}>
                      <span
                        className="task-row-field-pill"
                        style={{
                          ['--field-dot' as string]: resolveFieldColor(fieldColors?.[id], id),
                        }}
                      >
                        {fieldLabel(id)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="tasks-why-hint">{t('fieldWork.proposal.whyScheduleHint')}</p>
          </div>
        ) : null}
      </RightDrawer>

      <RightDrawer
        open={Boolean(dismissGroup)}
        onClose={() => setDismissGroup(null)}
        title={t('fieldWork.dismiss.title')}
        footer={null}
      >
        {dismissGroup ? (
          <div className="tasks-choice-list">
            <p className="tasks-dismiss-copy">{t('fieldWork.dismiss.copy')}</p>
            <button
              type="button"
              className="tasks-choice-row tasks-choice-row--caution"
              onClick={() => {
                onDismissChoice(dismissGroup, 'dont_do');
                setDismissGroup(null);
              }}
            >
              <span className="tasks-choice-label">{t('fieldWork.dismiss.dontDo')}</span>
              <span className="tasks-choice-hint">{t('fieldWork.dismiss.dontDoHint')}</span>
            </button>
            <button
              type="button"
              className="tasks-choice-row"
              onClick={() => {
                onDismissChoice(dismissGroup, 'already_done');
                setDismissGroup(null);
              }}
            >
              <span className="tasks-choice-label">{t('fieldWork.dismiss.alreadyDone')}</span>
              <span className="tasks-choice-hint">{t('fieldWork.dismiss.alreadyDoneHint')}</span>
            </button>
            <button
              type="button"
              className="tasks-choice-row"
              onClick={() => {
                onDismissChoice(dismissGroup, 'remind_later');
                setDismissGroup(null);
              }}
            >
              <span className="tasks-choice-label">{t('fieldWork.dismiss.remindLater')}</span>
              <span className="tasks-choice-hint">{t('fieldWork.dismiss.remindLaterHint')}</span>
            </button>
          </div>
        ) : null}
      </RightDrawer>
    </div>
  );
};

export default TaskProposalList;
