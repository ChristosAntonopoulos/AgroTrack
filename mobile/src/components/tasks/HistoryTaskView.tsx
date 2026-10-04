import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { Field } from '../../services/fieldService';
import type { FieldTask } from '../../services/fieldWorkService';
import { resolveTaskPerson } from '../../utils/plannedTaskGroups';
import { groupWorkUnits, isRecordedWork, leadTask, type NotebookAction } from '../../utils/taskNotebook';
import TaskNotebookCard, { type NotebookMenuAction } from './TaskNotebookCard';
import EmptyState from '../EmptyState';
import { createElevation, radii, spacing } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  tasks: FieldTask[];
  fields: Field[];
  fieldNames: Record<string, string>;
  personNames: Record<string, string>;
  year: number;
  busyId: string | null;
  onOpen: (task: FieldTask) => void;
  onPrimary: (task: FieldTask, action: NotebookAction) => void;
  onMenu: (task: FieldTask, action: NotebookMenuAction) => void;
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
  onPrimary,
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
          {t('fieldWork.history.banner')}
        </Text>
        <Pressable onPress={onOpenChronologio} hitSlop={8} style={styles.bannerLink}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
            {t('fieldWork.history.openChronologio')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>
      {units.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="time-outline" size={36} color={colors.primary} />}
          title={t('fieldWork.empty.historyTitle')}
          description={t('fieldWork.empty.historyDescription')}
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
              onPrimary={onPrimary}
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
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  list: { gap: spacing.sm },
});

export default HistoryTaskView;
