import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import StatusBadge from '../StatusBadge';
import { colors, typography, spacing } from '../../theme';
import { Task } from '../../services/taskService';
import { formatDate } from '../../utils/formatters';

export interface TaskCardProps {
  task: Task;
  fieldName?: string;
  onPress?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, fieldName, onPress }) => {
  // taskService already returns correct types, use directly
  const scheduledDate = task.scheduledStart
    ? formatDate(task.scheduledStart)
    : 'Not scheduled';

  return (
    <Card onPress={onPress} variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {task.title}
        </Text>
        <StatusBadge status={task.status} showIcon={true} />
      </View>

      {task.description && (
        <Text style={styles.description} numberOfLines={2}>
          {task.description}
        </Text>
      )}

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{task.type}</Text>
        </View>

        {fieldName && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Field:</Text>
            <Text style={styles.value}>{fieldName}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.label}>Scheduled:</Text>
          <Text style={styles.value}>{scheduledDate}</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  taskTitle: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  description: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  details: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },
  value: {
    ...typography.styles.bodySmall,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
});

export default TaskCard;
