import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing } from '../theme';

interface StatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | string;
  showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = false }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'pending':
      case 'planned':
      case 'ready':
        return {
          color: colors.taskPending,
          backgroundColor: colors.warningLight,
          label:
            status.toLowerCase() === 'ready'
              ? t('taskStatus.ready', { defaultValue: 'Ready' })
              : status.toLowerCase() === 'planned'
                ? t('taskStatus.planned', { defaultValue: 'Planned' })
                : t('taskStatus.pending'),
        };
      case 'blocked':
        return {
          color: colors.textSecondary,
          backgroundColor: colors.surfaceMuted,
          label: t('taskStatus.blocked', { defaultValue: 'Blocked' }),
        };
      case 'in_progress':
        return {
          color: colors.taskInProgress,
          backgroundColor: colors.infoLight,
          label: t('taskStatus.in_progress'),
        };
      case 'completed':
        return {
          color: colors.taskCompleted,
          backgroundColor: colors.successLight,
          label: t('taskStatus.completed'),
        };
      default:
        return {
          color: colors.textSecondary,
          backgroundColor: colors.surfaceMuted,
          label: status,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      {showIcon ? <View style={[styles.dot, { backgroundColor: config.color }]} /> : null}
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  text: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 11,
  },
});

export default StatusBadge;
