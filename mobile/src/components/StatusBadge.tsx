import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface StatusBadgeProps {
  status: 'pending' | 'in_progress' | 'completed' | string;
  showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = false }) => {
  // Props are already correct types, use directly
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          color: colors.taskPending,
          backgroundColor: '#fef3c7',
          label: 'Pending',
        };
      case 'in_progress':
        return {
          color: colors.taskInProgress,
          backgroundColor: '#dbeafe',
          label: 'In Progress',
        };
      case 'completed':
        return {
          color: colors.taskCompleted,
          backgroundColor: '#d1fae5',
          label: 'Completed',
        };
      default:
        return {
          color: colors.gray600,
          backgroundColor: colors.gray200,
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
    borderRadius: spacing.md,
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
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
});

export default StatusBadge;
