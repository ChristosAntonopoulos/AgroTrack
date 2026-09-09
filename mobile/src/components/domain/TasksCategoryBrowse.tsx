import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Task } from '../../services/taskService';
import TaskCard from './TaskCard';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import { spacing, typography } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export type CategoryRow = {
  key: string;
  label: string;
  accent: string;
  tasks: Task[];
};

type Props = {
  tasks: Task[];
  fields: Record<string, { name?: string; color?: string | null } | undefined>;
  compact?: boolean;
  onPressTask: (taskId: string) => void;
};

export const groupTasksByCategory = (tasks: Task[]): CategoryRow[] => {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.type?.trim() || 'Task';
    const list = map.get(key) || [];
    list.push(task);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, rowTasks]) => ({
      key,
      label: key,
      accent: resolveTaskCategoryAccent(key),
      tasks: rowTasks,
    }))
    .sort((a, b) => b.tasks.length - a.tasks.length || a.label.localeCompare(b.label));
};

const CategoryRail: React.FC<{
  row: CategoryRow;
  fields: Props['fields'];
  compact?: boolean;
  onPressTask: (taskId: string) => void;
  cardWidth: number;
}> = ({ row, fields, compact, onPressTask, cardWidth }) => {
  const { t } = useTranslation(['tasks']);
  const { colors } = useTheme();
  const title = t(`tasks:categories.${row.key}`, { defaultValue: row.label });

  return (
    <View style={styles.rail} accessibilityLabel={title}>
      <View style={styles.railHeader}>
        <View style={[styles.swatch, { backgroundColor: row.accent }]} />
        <Text style={[styles.railTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.railCount, { color: colors.textTertiary }]}>{row.tasks.length}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railScroller}
        decelerationRate="fast"
        snapToInterval={cardWidth + spacing.sm}
        snapToAlignment="start"
      >
        {row.tasks.map((task) => (
          <View key={task.id} style={[styles.railCard, { width: cardWidth }]}>
            <TaskCard
              task={task}
              fieldName={fields[task.fieldId]?.name}
              fieldColor={fields[task.fieldId]?.color}
              compact={compact}
              embedded
              onPress={() => onPressTask(task.id)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const TasksCategoryBrowse: React.FC<Props> = ({ tasks, fields, compact, onPressTask }) => {
  const rows = useMemo(() => groupTasksByCategory(tasks), [tasks]);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(300, Math.max(260, width * 0.78));

  return (
    <View style={styles.browse}>
      {rows.map((row) => (
        <CategoryRail
          key={row.key}
          row={row}
          fields={fields}
          compact={compact}
          onPressTask={onPressTask}
          cardWidth={cardWidth}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  browse: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  rail: {
    marginBottom: spacing.xs,
  },
  railHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  railTitle: {
    ...typography.styles.body,
    fontWeight: '700',
    flex: 1,
    fontSize: 16,
  },
  railCount: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  railScroller: {
    gap: spacing.sm,
    paddingRight: spacing.base,
  },
  railCard: {
    // TaskCard already has marginBottom; kill it in rails so cards align tightly
  },
});

export default TasksCategoryBrowse;
