import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme';

interface LifecycleIndicatorProps {
  year: 'low' | 'high' | string;
  showLabel?: boolean;
}

const LifecycleIndicator: React.FC<LifecycleIndicatorProps> = ({
  year,
  showLabel = true,
}) => {
  const isLowYear = year.toLowerCase() === 'low';
  const backgroundColor = isLowYear ? colors.lifecycleLow : colors.lifecycleHigh;
  const label = isLowYear ? 'Low Year' : 'High Year';

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor }]} />
      {showLabel && <Text style={styles.label}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  label: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
});

export default LifecycleIndicator;
