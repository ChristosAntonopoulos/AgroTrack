import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { Field } from '../../services/fieldService';
import type { Task, TaskSuggestion } from '../../services/taskService';
import {
  groupWorkUnits,
  isOpenWork,
  leadTask,
  resolveTaskPerson,
  unitSection,
  type NotebookMenuAction,
  type NotebookSection,
  type TaskUnit,
} from '../../utils/taskNotebook';
import TaskNotebookCard from './TaskNotebookCard';
import SuggestionCard from './SuggestionCard';
import EmptyState from '../EmptyState';
import { spacing } from '../../theme';

const UPCOMING_SECTIONS: NotebookSection[] = ['tomorrow', 'week', 'later'];
const SUGGESTION_PREVIEW = 2;

type Props = {
  mode: 'today' | 'upcoming';
  tasks: Task[];
  fields: Field[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  suggestions: TaskSuggestion[];
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onMenu: (task: Task, action: NotebookMenuAction) => void;
  onScheduleSuggestion: (suggestion: TaskSuggestion) => void;
  onDismissSuggestion: (suggestion: TaskSuggestion) => void;
};

const TodoNotebook: React.FC<Props> = ({
  mode,
  tasks,
  fields,
  fieldNames,
  personNames,
  year,
  busyId,
  suggestions,
  onOpen,
  onComplete,
  onMenu,
  onScheduleSuggestion,
  onDismissSuggestion,
}) => {
  const { t } = useTranslation('tasks');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
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

  const renderUnits = (sections: NotebookSection[], heading: string) => {
    const units = sections.flatMap((section) => buckets.get(section) || []);
    if (units.length === 0) return null;
    return (
      <View>
        <View style={styles.headingRow}>
          <Text style={[styles.heading, { color: colors.textSecondary }]}>{heading}</Text>
          <View
            style={[
              styles.count,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight },
            ]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
              {units.length}
            </Text>
          </View>
        </View>
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
                onComplete={onComplete}
                onMenu={onMenu}
              />
            );
          })}
        </View>
      </View>
    );
  };

  if (mode === 'today') {
    const overdue = renderUnits(['overdue'], t('notebook.sections.overdue'));
    const today = renderUnits(['today'], t('notebook.sections.today'));
    const hasWork = Boolean(overdue || today);
    const showSuggestions = suggestions.length > 0;
    const visibleSuggestions =
      showAllSuggestions || suggestions.length <= SUGGESTION_PREVIEW
        ? suggestions
        : suggestions.slice(0, SUGGESTION_PREVIEW);
    const hasMoreSuggestions = suggestions.length > SUGGESTION_PREVIEW;

    return (
      <View style={styles.wrap}>
        {overdue}
        {today}
        {showSuggestions ? (
          <View>
            <View style={styles.headingRow}>
              <Text style={[styles.heading, { color: colors.textSecondary }]}>
                {t('notebook.sections.suggestions')}
              </Text>
            </View>
            <View style={styles.list}>
              {visibleSuggestions.map((suggestion, index) => (
                <SuggestionCard
                  key={`${suggestion.fieldId}-${suggestion.templateCode}-${index}`}
                  suggestion={suggestion}
                  fieldName={fieldNames[suggestion.fieldId] || t('fieldWork.unknownField')}
                  busy={busyId === `suggestion:${suggestion.fieldId}:${suggestion.templateCode}`}
                  onSchedule={onScheduleSuggestion}
                  onDismiss={onDismissSuggestion}
                />
              ))}
            </View>
            {hasMoreSuggestions ? (
              <Pressable
                onPress={() => setShowAllSuggestions((open) => !open)}
                style={[styles.moreBtn, { minHeight: Math.max(44, tapMin * 0.9) }]}
                accessibilityRole="button"
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: '700',
                    fontSize: 15 * fontScaleMultiplier,
                  }}
                >
                  {showAllSuggestions
                    ? t('notebook.sections.showFewerSuggestions')
                    : t('notebook.sections.seeAllSuggestions')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {!hasWork && !showSuggestions ? (
          <EmptyState
            icon={<Ionicons name="checkmark-circle-outline" size={36} color={colors.primary} />}
            title={t('notebook.empty.todayTitle')}
            description={t('notebook.empty.todayDescription')}
          />
        ) : null}
      </View>
    );
  }

  const sections = UPCOMING_SECTIONS.map((section) =>
    renderUnits(
      [section],
      t(`notebook.sections.${section === 'week' ? 'thisWeek' : section}`)
    )
  ).filter(Boolean);

  return (
    <View style={styles.wrap}>
      {sections}
      {sections.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="calendar-outline" size={36} color={colors.primary} />}
          title={t('notebook.empty.upcomingTitle')}
          description={t('notebook.empty.upcomingDescription')}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heading: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 12,
  },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  list: { gap: spacing.sm },
  moreBtn: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
});

export default TodoNotebook;
