import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FieldPhenology, FieldTask } from '../../services/fieldWorkService';
import type { ChronologioEntry } from '../../services/chronologioService';
import type { FieldAttentionModel } from '../../utils/fieldOverviewAttention';
import { getNextUpcomingTask } from '../../utils/fieldDisplay';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';

type Props = {
  phenology: FieldPhenology | null;
  tasks: FieldTask[];
  attention: FieldAttentionModel;
  latestEntry?: ChronologioEntry;
  onOpenTask?: (taskId: string) => void;
  onOpenAttention?: () => void;
  onOpenChronologio?: () => void;
};

type CellProps = {
  label: string;
  value: string;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  borderRight?: boolean;
  borderBottom?: boolean;
};

const StatusCell: React.FC<CellProps> = ({
  label,
  value,
  onPress,
  colors,
  borderRight,
  borderBottom,
}) => {
  const body = (
    <>
      <Text style={[styles.label, { color: colors.textTertiary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          { color: colors.textPrimary },
          onPress ? styles.valueLink : null,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </>
  );

  const cellStyle = [
    styles.cell,
    {
      borderRightColor: colors.borderLight,
      borderBottomColor: colors.borderLight,
      borderRightWidth: borderRight ? StyleSheet.hairlineWidth : 0,
      borderBottomWidth: borderBottom ? StyleSheet.hairlineWidth : 0,
    },
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={cellStyle} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }

  return <View style={cellStyle}>{body}</View>;
};

/**
 * Compact 2×2 status strip — phenology, next task, attention, last recording.
 */
const FieldStatusStrip: React.FC<Props> = ({
  phenology,
  tasks,
  attention,
  latestEntry,
  onOpenTask,
  onOpenAttention,
  onOpenChronologio,
}) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();
  const nextTask = getNextUpcomingTask(tasks);
  const attentionLabel =
    attention.kind === 'none'
      ? t('overview.statusStrip.noWarning')
      : attention.title || t('overview.needsAttention');
  const lastLabel = latestEntry?.title || t('overview.statusStrip.noRecording');
  const stageLabel = phenology?.isKnown
    ? phenology.stageLabel
    : phenology?.message || t('overview.statusStrip.unknownStage');

  return (
    <View
      style={[styles.strip, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
      accessibilityLabel={t('overview.statusStrip.aria')}
    >
      <View style={styles.row}>
        <StatusCell
          label={t('overview.statusStrip.now')}
          value={stageLabel}
          colors={colors}
          borderRight
          borderBottom
        />
        <StatusCell
          label={t('overview.nextTask')}
          value={nextTask?.title || t('overview.noNextTask')}
          colors={colors}
          borderBottom
          onPress={nextTask && onOpenTask ? () => onOpenTask(nextTask.id) : undefined}
        />
      </View>
      <View style={styles.row}>
        <StatusCell
          label={t('overview.statusStrip.attention')}
          value={attentionLabel}
          colors={colors}
          borderRight
          onPress={
            attention.primaryAction && attention.primaryAction !== 'none' && onOpenAttention
              ? onOpenAttention
              : undefined
          }
        />
        <StatusCell
          label={t('overview.statusStrip.lastRecording')}
          value={lastLabel}
          colors={colors}
          onPress={latestEntry && onOpenChronologio ? onOpenChronologio : undefined}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  valueLink: {
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(0,0,0,0.15)',
  },
});

export default FieldStatusStrip;
