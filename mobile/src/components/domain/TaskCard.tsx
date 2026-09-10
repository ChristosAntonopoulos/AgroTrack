import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import StatusBadge from '../StatusBadge';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { FieldTask, fieldTaskTypeKey } from '../../services/fieldWorkService';
import { formatDate } from '../../utils/formatters';
import { getTaskCategoryColor } from '../../utils/calendarCategoryColors';
import { isTaskOverdue } from '../../utils/taskListUtils';
import { resolveFieldColor } from '../../utils/fieldColors';
import { resolveTaskCategoryAccent } from '../../utils/taskCategoryAccents';
import CardAccentFades from '../common/CardAccentFades';

export interface TaskCardProps {
  task: FieldTask;
  fieldName?: string;
  fieldColor?: string | null;
  onPress?: () => void;
  compact?: boolean;
  /** Drop outer bottom margin (horizontal category rails). */
  embedded?: boolean;
}

/**
 * Task list card accents:
 * left edge = field color + wash, right fade = system category / type color.
 * Overdue keeps a thin top strip only.
 */
const TaskCard: React.FC<TaskCardProps> = ({
  task,
  fieldName,
  fieldColor,
  onPress,
  compact = false,
  embedded = false,
}) => {
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const { t } = useTranslation(['tasks', 'common']);
  const overdue = isTaskOverdue(task);
  const typeKey = fieldTaskTypeKey(task);
  const categoryAccent = resolveTaskCategoryAccent(typeKey);
  const fieldAccent = resolveFieldColor(fieldColor, task.fieldId);
  const categoryColor = getTaskCategoryColor(typeKey);

  const dateLabel = task.plannedStart
    ? formatDate(task.plannedStart)
    : t('tasks:notScheduled');

  const dueLabel =
    task.plannedEnd && task.status !== 'completed' ? formatDate(task.plannedEnd) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      style={[
        styles.wrapper,
        embedded && styles.wrapperEmbedded,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          borderLeftColor: fieldAccent,
          minHeight: Math.max(tapMin, 88),
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <CardAccentFades fieldColor={fieldAccent} endColor={categoryAccent} />

      {overdue ? (
        <View style={[styles.overdueStrip, { backgroundColor: colors.error }]} />
      ) : null}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={[styles.typeDot, { backgroundColor: categoryColor }]} />
          <Text
            style={[
              styles.taskTitle,
              {
                color: colors.textPrimary,
                fontSize: 16 * fontScaleMultiplier,
                lineHeight: 22 * fontScaleMultiplier,
              },
            ]}
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
              <Text
                style={[styles.overdueText, { color: colors.error, fontSize: 10 * fontScaleMultiplier }]}
              >
                {t('tasks:overdue')}
              </Text>
            </View>
          ) : null}
        </View>

        {!compact && task.description ? (
          <Text
            style={[
              styles.description,
              { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier },
            ]}
            numberOfLines={2}
          >
            {task.description}
          </Text>
        ) : null}

        <View style={[styles.metaGrid, { borderTopColor: colors.borderLight }]}>
          {fieldName ? (
            <View style={styles.fieldChip}>
              <View style={[styles.fieldDot, { backgroundColor: fieldAccent }]} />
              <Text
                style={{ color: colors.textSecondary, fontSize: 12 * fontScaleMultiplier, flexShrink: 1 }}
                numberOfLines={1}
              >
                {fieldName}
              </Text>
            </View>
          ) : null}
          <MetaCell
            icon="pricetag-outline"
            label={t('tasks:type')}
            value={typeKey}
            colors={colors}
            fontScale={fontScaleMultiplier}
          />
          <MetaCell
            icon="calendar-outline"
            label={t('tasks:scheduled')}
            value={dateLabel}
            colors={colors}
            fontScale={fontScaleMultiplier}
          />
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
      <Text style={[styles.metaLabel, { color: colors.textTertiary, fontSize: 10 * fontScale }]}>
        {label}
      </Text>
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
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  wrapperEmbedded: {
    marginBottom: 0,
    height: '100%',
  },
  overdueStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 1,
  },
  body: {
    paddingTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.sm,
    zIndex: 1,
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
  fieldChip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  fieldDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
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
