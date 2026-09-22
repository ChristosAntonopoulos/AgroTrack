import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Field } from '../../services/fieldService';
import type { FieldTask, TaskProposal } from '../../services/fieldWorkService';
import { resolveTaskPerson } from '../../utils/plannedTaskGroups';
import {
  groupWorkUnits,
  isOpenWork,
  leadTask,
  unitSection,
  type NotebookAction,
  type NotebookSection,
  type TaskUnit,
} from '../../utils/taskNotebook';
import TaskNotebookCard, { type NotebookMenuAction } from './TaskNotebookCard';
import TaskProposalList, { type ProposalDismissChoice } from './TaskProposalList';
import TasksEmptyState from './TasksEmptyState';
import type { ProposalTemplateGroup } from '../../utils/proposalPresentation';
import './TaskNotebookCard.css';

const ATTENTION: NotebookSection[] = ['overdue', 'blocked', 'weather'];
const TODAY: NotebookSection[] = ['today'];
const NEXT: NotebookSection[] = ['tomorrow', 'week', 'later'];

interface TodoNotebookProps {
  tasks: FieldTask[];
  fields: Field[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  proposals: TaskProposal[];
  onOpen: (task: FieldTask) => void;
  onPrimary: (task: FieldTask, action: NotebookAction) => void;
  onMenu: (task: FieldTask, action: NotebookMenuAction) => void;
  onScheduleGroup: (group: ProposalTemplateGroup) => void;
  onDismissChoice: (group: ProposalTemplateGroup, choice: ProposalDismissChoice) => void;
}

const TodoNotebook: React.FC<TodoNotebookProps> = ({
  tasks,
  fields,
  fieldNames,
  personNames,
  year,
  busyId,
  proposals,
  onOpen,
  onPrimary,
  onMenu,
  onScheduleGroup,
  onDismissChoice,
}) => {
  const { t } = useTranslation('tasks');
  const colorByField = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.color])),
    [fields]
  );

  const buckets = useMemo(() => {
    const units = groupWorkUnits(tasks.filter(isOpenWork));
    const bySection = new Map<NotebookSection, TaskUnit[]>();
    units.forEach((unit) => {
      const section = unitSection(unit);
      const list = bySection.get(section) || [];
      list.push(unit);
      bySection.set(section, list);
    });
    return bySection;
  }, [tasks]);

  const renderUnits = (sections: NotebookSection[]) => {
    const units = sections.flatMap((section) => buckets.get(section) || []);
    if (units.length === 0) return null;
    return (
      <ul className="notebook-section-list">
        {units.map((unit) => {
          const person = resolveTaskPerson(leadTask(unit), personNames);
          return (
            <li key={unit.key}>
              <TaskNotebookCard
                unit={unit}
                fieldName={(id) => fieldNames[id] || t('fieldWork.unknownField')}
                fieldColor={(id) => colorByField[id]}
                personName={person || undefined}
                year={year}
                busy={unit.tasks.some((task) => task.id === busyId)}
                onOpen={onOpen}
                onPrimary={onPrimary}
                onMenu={onMenu}
              />
            </li>
          );
        })}
      </ul>
    );
  };

  const attention = renderUnits(ATTENTION);
  const today = renderUnits(TODAY);
  const next = renderUnits(NEXT);
  const hasWork = Boolean(attention || today || next);

  return (
    <div className="notebook-sections">
      {attention ? (
        <section aria-labelledby="notebook-attention">
          <h2 id="notebook-attention" className="notebook-section-title">
            {t('notebook.sections.attention')}
          </h2>
          {attention}
        </section>
      ) : null}
      {today ? (
        <section aria-labelledby="notebook-today">
          <h2 id="notebook-today" className="notebook-section-title">
            {t('notebook.sections.today')}
          </h2>
          {today}
        </section>
      ) : null}
      {next ? (
        <section aria-labelledby="notebook-next">
          <h2 id="notebook-next" className="notebook-section-title">
            {t('notebook.sections.next')}
          </h2>
          {next}
        </section>
      ) : null}
      {!hasWork && proposals.length === 0 ? (
        <TasksEmptyState
          title={t('fieldWork.empty.nowTitle')}
          description={t('fieldWork.empty.nowDescription')}
        />
      ) : null}
      {proposals.length > 0 ? (
        <section aria-labelledby="notebook-suggestions">
          <h2 id="notebook-suggestions" className="notebook-section-title">
            {t('notebook.sections.suggestions')}
            {` · ${proposals.length}`}
          </h2>
          <TaskProposalList
            proposals={proposals}
            fieldNames={fieldNames}
            unknownField={t('fieldWork.unknownField')}
            introTitle={t('fieldWork.proposalsIntro.title')}
            introSubtitle={t('fieldWork.proposalsIntro.subtitle')}
            emptyTitle={t('fieldWork.empty.proposalsTitle')}
            emptyDescription={t('fieldWork.empty.proposalsDescription')}
            busyId={busyId}
            onScheduleGroup={onScheduleGroup}
            onDismissChoice={onDismissChoice}
          />
        </section>
      ) : null}
    </div>
  );
};

export default TodoNotebook;
