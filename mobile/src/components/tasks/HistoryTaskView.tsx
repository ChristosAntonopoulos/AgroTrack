import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { Field } from '../../services/fieldService';
import type { Task } from '../../services/taskService';
import {
  groupWorkUnits,
  isRecordedWork,
  leadTask,
  resolveTaskPerson,
  type NotebookMenuAction,
} from '../../utils/taskNotebook';
import TaskNotebookCard from './TaskNotebookCard';
import EmptyState from '../EmptyState';
import { createElevation, radii, spacing } from '../../theme';

type Props = {
  tasks: Task[];
  fields: Field[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onMenu: (task: Task, action: NotebookMenuAction) => void;
  onOpenChronologio: () => void;
};

const HistoryTaskView: React.FC<Props> = ({
  tasks,
  fields,
  fieldNames,
  personNames,
  year,
  busyId,
  onOpen,
  onComplete,
  onMenu,
  onOpenChronologio,
}) => {
  const { t } = useTranslation('tasks');
  const { colors } = useTheme();
  const colorByField = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.id, field.color])),
    [fields]
  );
  const units = useMemo(() => groupWorkUnits(tasks.filter(isRecordedWork)), [tasks]);

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.banner,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            ...createElevation(colors, 'sm'),
          },
        ]}
      >
        <View style={[styles.bannerIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="book-outline" size={18} color={colors.primary} />
        </View>
        <Text style={{ color: colors.textSecondary, flex: 1, lineHeight: 20, fontSize: 13 }}>
          {t('notebook.done.banner')}
        </Text>
        <Pressable onPress={onOpenChronologio} hitSlop={8} style={styles.bannerLink}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
            {t('notebook.done.openChronologio')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>
      {units.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="time-outline" size={36} color={colors.primary} />}
          title={t('notebook.empty.doneTitle')}
          description={t('notebook.empty.doneDescription')}
        />
      ) : (
        <View style={styles.list}>
          {units.map((unit) => (
            <TaskNotebookCard
              key={unit.key}
              unit={unit}
              fieldName={(id) => fieldNames[id] || t('fieldWork.unknownField')}
              fieldColor={(id) => colorByField[id]}
              personName={resolveTaskPerson(leadTask(unit), personNames) || undefined}
              year={year}
              busy={unit.tasks.some((task) => task.id === busyId)}
              onOpen={onOpen}
              onComplete={onComplete}
              onMenu={onMenu}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  list: { gap: spacing.sm },
});

export default HistoryTaskView;
