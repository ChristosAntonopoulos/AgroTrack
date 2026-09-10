import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Card from '../ui/Card';
import { FieldTask } from '../../services/fieldWorkService';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';
import EmptyState from '../EmptyState';
import Button from '../ui/Button';

export interface TodaysScheduleProps {
  tasks: FieldTask[];
  onTaskPress?: (task: FieldTask) => void;
  onStartTask?: (task: FieldTask) => void;
  onCompleteTask?: (task: FieldTask) => void;
  weatherWorkable?: boolean;
}

const TodaysSchedule: React.FC<TodaysScheduleProps> = ({
  tasks,
  onTaskPress,
  onStartTask,
  onCompleteTask,
  weatherWorkable = true,
}) => {
  const formatTime = (dateString?: string) => {
    if (!dateString) return 'No time set';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in_progress':
        return colors.info;
      case 'planned':
      case 'ready':
      case 'pending':
        return colors.warning;
      case 'blocked':
        return colors.gray400;
      default:
        return colors.gray400;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '🔄';
      case 'planned':
      case 'ready':
      case 'pending':
        return '⏳';
      default:
        return '📋';
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Filter tasks for today
  const todaysTasks = tasks
    .filter((task) => {
      if (!task.plannedStart) return false;
      const scheduled = new Date(task.plannedStart);
      scheduled.setHours(0, 0, 0, 0);
      return scheduled.getTime() === today.getTime();
    })
    .sort((a, b) => {
      if (!a.plannedStart || !b.plannedStart) return 0;
      return new Date(a.plannedStart).getTime() - new Date(b.plannedStart).getTime();
    });

  if (todaysTasks.length === 0) {
    return (
      <Card variant="elevated" style={styles.container}>
        <Text style={styles.title}>Today's Schedule</Text>
        <EmptyState
          icon="📅"
          title="No Tasks Today"
          description="You have no tasks scheduled for today."
        />
      </Card>
    );
  }

  return (
    <Card variant="elevated" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Schedule</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{todaysTasks.length}</Text>
        </View>
      </View>

      {!weatherWorkable ? (
        <View style={styles.weatherWarning}>
          <Text style={styles.weatherWarningText}>
            ⚠️ Weather conditions may affect today's work
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {todaysTasks.map((task) => {
          const statusColor = getStatusColor(task.status);
          const safeOnPress = onTaskPress ? () => onTaskPress(task) : undefined;

          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskCard, { borderLeftColor: statusColor }]}
              onPress={safeOnPress}
              activeOpacity={0.7}
            >
              <View style={styles.taskHeader}>
                <View style={styles.taskHeaderLeft}>
                  <Text style={styles.statusIcon}>{getStatusIcon(task.status)}</Text>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle} numberOfLines={1}>
                      {task.title}
                    </Text>
                    <Text style={styles.taskTime}>
                      {formatTime(task.plannedStart)}
                      {task.plannedEnd ? ` - ${formatTime(task.plannedEnd)}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {task.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              {task.description ? (
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {task.description}
                </Text>
              ) : null}

              <View style={styles.taskActions}>
                {(task.status === 'planned' ||
                  task.status === 'ready' ||
                  task.status === 'pending') &&
                onStartTask ? (
                  <Button
                    title="Start"
                    onPress={() => onStartTask(task)}
                    variant="primary"
                    size="small"
                    style={styles.actionButton}
                  />
                ) : null}
                {task.status === 'in_progress' && onCompleteTask ? (
                  <Button
                    title="Complete"
                    onPress={() => onCompleteTask(task)}
                    variant="success"
                    size="small"
                    style={styles.actionButton}
                  />
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
    maxHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.styles.h5,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
  },
  countBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacingPatterns.borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontSize: 12,
  },
  weatherWarning: {
    backgroundColor: colors.warning + '20',
    padding: spacing.sm,
    borderRadius: spacingPatterns.borderRadius.md,
    marginBottom: spacing.sm,
  },
  weatherWarningText: {
    ...typography.styles.bodySmall,
    color: colors.warning,
    fontSize: 12,
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 300,
  },
  scrollContent: {
    paddingBottom: spacing.xs,
  },
  taskCard: {
    padding: spacing.sm,
    backgroundColor: colors.gray50,
    borderRadius: spacingPatterns.borderRadius.md,
    borderLeftWidth: 3,
    marginBottom: spacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  taskHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: spacing.sm,
  },
  statusIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
    fontSize: 14,
  },
  taskTime: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacingPatterns.borderRadius.sm,
  },
  statusText: {
    ...typography.styles.caption,
    fontSize: 9,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  taskDescription: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  taskActions: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  actionButton: {
    marginRight: spacing.xs,
  },
});

export default TodaysSchedule;
