import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import StatusBadge from '../StatusBadge';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { Task } from '../../services/taskService';
import { formatDate } from '../../utils/formatters';
import { getTaskCategoryColor } from '../../utils/calendarCategoryColors';
import { getStatusAccentColor, isTaskOverdue } from '../../utils/taskListUtils';

export interface TaskCardProps {
  task: Task;
  fieldName?: string;
  onPress?: () => void;
  compact?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, fieldName, onPress, compact = false }) => {
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const { t } = useTranslation(['tasks', 'common']);
  const overdue = isTaskOverdue(task);
  const accent = overdue ? colors.error : getStatusAccentColor(task.status, colors);
  const categoryColor = getTaskCategoryColor(task.type);
  const needsApproval = task.approvalStatus === 'pending';

  const dateLabel = task.scheduledStart
    ? formatDate(task.scheduledStart)
    : t('tasks:notScheduled');

  const dueLabel =
    task.scheduledEnd && task.status !== 'completed'
      ? formatDate(task.scheduledEnd)
      : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          minHeight: Math.max(tapMin, 88),
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={[styles.typeDot, { backgroundColor: categoryColor }]} />
          <Text
            style={[styles.taskTitle, { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier }]}
            numberOfLines={compact ? 1 : 2}
          >
            {task.title}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>

        <View style={styles.badgeRow}>
          <StatusBadge status={task.status} showIcon />
          {overdue ? (
            <View style={[styles.overduePill, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="alert-circle" size={12} color={colors.error} />
              <Text style={[styles.overdueText, { color: colors.error, fontSize: 10 * fontScaleMultiplier }]}>
                {t('tasks:overdue')}
              </Text>
            </View>
          ) : null}
          {needsApproval ? (
            <View style={[styles.overduePill, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="hourglass-outline" size={12} color={colors.warningDark} />
              <Text style={[styles.overdueText, { color: colors.warningDark, fontSize: 10 * fontScaleMultiplier }]}>
                {t('tasks:filters.approval')}
              </Text>
            </View>
          ) : null}
        </View>

        {!compact && task.description ? (
          <Text style={[styles.description, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]} numberOfLines={2}>
            {task.description}
          </Text>
        ) : null}

        <View style={[styles.metaGrid, { borderTopColor: colors.borderLight }]}>
          {fieldName ? (
            <MetaCell
              icon="leaf-outline"
              label={t('tasks:field')}
              value={fieldName}
              colors={colors}
              fontScale={fontScaleMultiplier}
            />
          ) : null}
          <MetaCell icon="pricetag-outline" label={t('tasks:type')} value={task.type} colors={colors} fontScale={fontScaleMultiplier} />
          <MetaCell icon="calendar-outline" label={t('tasks:scheduled')} value={dateLabel} colors={colors} fontScale={fontScaleMultiplier} />
          {dueLabel ? (
            <MetaCell
              icon="time-outline"
              label={t('tasks:due')}
              value={dueLabel}
              colors={colors}
              fontScale={fontScaleMultiplier}
              highlight={overdue}
            />
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const MetaCell = ({
  icon,
  label,
  value,
  colors,
  fontScale = 1,
  highlight = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  fontScale?: number;
  highlight?: boolean;
}) => (
  <View style={styles.metaCell}>
    <View style={styles.metaLabelRow}>
      <Ionicons name={icon} size={14} color={colors.textTertiary} />
      <Text style={[styles.metaLabel, { color: colors.textTertiary, fontSize: 10 * fontScale }]}>{label}</Text>
    </View>
    <Text
      style={[
        styles.metaValue,
        { color: highlight ? colors.error : colors.textPrimary, fontSize: 13 * fontScale },
      ]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  accentBar: {
    width: 5,
  },
  body: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskTitle: {
    ...typography.styles.body,
    fontWeight: '700',
    lineHeight: 22,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  overduePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
  },
  overdueText: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  description: {
    ...typography.styles.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  metaCell: {
    width: '46%',
    minWidth: 120,
  },
  metaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metaLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
  },
});

export default TaskCard;
