import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
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
import EmptyState from '../EmptyState';
import type { ProposalTemplateGroup } from '../../utils/proposalPresentation';
import { spacing, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

const ATTENTION: NotebookSection[] = ['overdue', 'blocked', 'weather'];
const TODAY: NotebookSection[] = ['today'];
const NEXT: NotebookSection[] = ['tomorrow', 'week', 'later'];

type Props = {
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
};

const TodoNotebook: React.FC<Props> = ({
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
  const { colors } = useTheme();
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
      <View style={styles.list}>
        {units.map((unit) => {
          const person = resolveTaskPerson(leadTask(unit), personNames);
          return (
            <TaskNotebookCard
              key={unit.key}
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
          );
        })}
      </View>
    );
  };

  const countUnits = (sections: NotebookSection[]) =>
    sections.reduce((sum, section) => sum + (buckets.get(section)?.length || 0), 0);

  const attention = renderUnits(ATTENTION);
  const today = renderUnits(TODAY);
  const next = renderUnits(NEXT);
  const hasWork = Boolean(attention || today || next);

  const heading = (label: string, count: number) => (
    <View style={styles.headingRow}>
      <Text style={[styles.heading, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.count, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>{count}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      {attention ? (
        <View>
          {heading(t('notebook.sections.attention'), countUnits(ATTENTION))}
          {attention}
        </View>
      ) : null}
      {today ? (
        <View>
          {heading(t('notebook.sections.today'), countUnits(TODAY))}
          {today}
        </View>
      ) : null}
      {next ? (
        <View>
          {heading(t('notebook.sections.next'), countUnits(NEXT))}
          {next}
        </View>
      ) : null}
      {!hasWork && proposals.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="checkmark-circle-outline" size={36} color={colors.primary} />}
          title={t('fieldWork.empty.nowTitle')}
          description={t('fieldWork.empty.nowDescription')}
        />
      ) : null}
      {proposals.length > 0 ? (
        <View>
          {heading(t('notebook.sections.suggestions'), proposals.length)}
          <TaskProposalList
            proposals={proposals}
            fieldNames={fieldNames}
            unknownField={t('fieldWork.unknownField')}
            busyId={busyId}
            onScheduleGroup={onScheduleGroup}
            onDismissChoice={onDismissChoice}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: { ...typography.styles.overline, letterSpacing: 0.6 },
  count: {
    minWidth: 22,
    height: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default TodoNotebook;
