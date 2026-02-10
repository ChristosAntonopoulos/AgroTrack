import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Card from '../ui/Card';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';
import EmptyState from '../EmptyState';

export interface UrgentAction {
  id: string;
  type: 'task_due' | 'weather_alert' | 'field_attention' | 'deadline' | 'notification';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium';
  actionUrl?: string;
  dueDate?: Date;
  fieldId?: string;
  taskId?: string;
  onPress?: () => void;
}

export interface UrgentActionsCardProps {
  actions: UrgentAction[];
  maxItems?: number;
  onActionPress?: (action: UrgentAction) => void;
}

const UrgentActionsCard: React.FC<UrgentActionsCardProps> = ({
  actions,
  maxItems = 5,
  onActionPress,
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task_due':
        return '📋';
      case 'weather_alert':
        return '⚠️';
      case 'field_attention':
        return '🏡';
      case 'deadline':
        return '⏰';
      case 'notification':
        return '📢';
      default:
        return '❗';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.warning;
      default:
        return colors.info;
    }
  };

  const formatDueDate = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 0) return 'Overdue';
    if (hours < 24) return `Due in ${hours}h`;
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  // Sort by priority and due date
  const sortedActions = [...actions]
    .sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      return 0;
    })
    .slice(0, maxItems);

  if (sortedActions.length === 0) {
    return (
      <Card variant="elevated" style={styles.container}>
        <EmptyState
          icon="✅"
          title="All Clear"
          description="No urgent actions at this time."
        />
      </Card>
    );
  }

  return (
    <Card variant="elevated" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Requires Attention</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{sortedActions.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedActions.map((action) => {
          const priorityColor = getPriorityColor(action.priority);
          const handlePress = () => {
            if (onActionPress) {
              onActionPress(action);
            } else if (action.onPress) {
              action.onPress();
            }
          };

          return (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { borderLeftColor: priorityColor }]}
              onPress={handlePress}
              activeOpacity={0.7}
            >
              <View style={styles.actionHeader}>
                <Text style={styles.actionIcon}>{getTypeIcon(action.type)}</Text>
                <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              </View>
              <Text style={styles.actionTitle} numberOfLines={2}>
                {action.title}
              </Text>
              <Text style={styles.actionDescription} numberOfLines={2}>
                {action.description}
              </Text>
              {action.dueDate ? (
                <Text style={[styles.dueDate, { color: priorityColor }]}>
                  {formatDueDate(action.dueDate)}
                </Text>
              ) : null}
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
  scrollContent: {
    paddingRight: spacing.base,
  },
  actionCard: {
    width: 200,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: spacingPatterns.borderRadius.md,
    borderLeftWidth: 3,
    marginRight: spacing.sm,
    ...spacingPatterns.shadow.sm,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  actionIcon: {
    fontSize: 24,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionTitle: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
    fontSize: 13,
  },
  actionDescription: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: spacing.xs,
    lineHeight: 14,
  },
  dueDate: {
    ...typography.styles.caption,
    fontSize: 10,
    fontWeight: typography.fontWeight.medium,
    marginTop: 'auto',
  },
});

export default UrgentActionsCard;
