import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { Task } from '../../services/taskService';
import { getTaskDueVariant, getTaskTypeIcon } from '../../utils/dashboardUtils';
import { formatLocaleDate } from '../../utils/formatters';

export interface AgendaTaskRowProps {
  task: Task;
  fieldName?: string;
  onPress?: () => void;
}

const AgendaTaskRow: React.FC<AgendaTaskRowProps> = ({ task, fieldName, onPress }) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('dashboard');
  const variant = getTaskDueVariant(task);
  const icon = getTaskTypeIcon(task.type);

  const pillStyle =
    variant === 'overdue'
      ? { bg: colors.errorLight, text: colors.error, label: t('statusOverdue') }
      : variant === 'tomorrow'
        ? { bg: colors.warningLight, text: colors.warningDark, label: t('statusDueTomorrow') }
        : {
            bg: colors.successLight,
            text: colors.successDark,
            label: task.scheduledStart
              ? formatLocaleDate(new Date(task.scheduledStart), i18n.language, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
              : t('statusScheduled'),
          };

  const iconColor =
    variant === 'overdue' ? colors.error : variant === 'tomorrow' ? colors.warning : colors.success;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {task.title}
        </Text>
        {fieldName ? (
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {fieldName}
          </Text>
        ) : null}
      </View>
      <View style={[styles.pill, { backgroundColor: pillStyle.bg }]}>
        <Text style={[styles.pillText, { color: pillStyle.text }]}>{pillStyle.label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { ...typography.styles.body, fontWeight: '600', fontSize: 14 },
  sub: { ...typography.styles.caption, marginTop: 2 },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 110,
  },
  pillText: { ...typography.styles.caption, fontWeight: '700', fontSize: 10, textAlign: 'center' },
});

export default AgendaTaskRow;
