import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { colors, typography, spacing } from '../../theme';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'default';
  onPress?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  variant = 'default',
  onPress,
}) => {
  if (__DEV__) {
    console.log('[StatCard] Rendering - title:', title, 'variant:', variant);
    console.log('[StatCard] onPress type:', typeof onPress, 'value:', onPress ? 'function' : 'undefined');
  }
  
  const getVariantColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.info;
      default:
        return colors.textPrimary;
    }
  };

  const variantColor = getVariantColor();

  if (__DEV__) {
    console.log('[StatCard] Passing props to Card - onPress type:', typeof onPress);
  }

  return (
    <Card
      onPress={onPress}
      variant="elevated"
      style={[styles.card, { borderLeftWidth: 4, borderLeftColor: variantColor }]}
    >
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: variantColor + '15' }]}>
          {icon}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color: variantColor }]}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 100,
    padding: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontSize: 11,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    ...typography.styles.h2,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs / 2,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
});

export default StatCard;
