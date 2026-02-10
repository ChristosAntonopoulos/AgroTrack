import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, spacingPatterns } from '../../theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  showDot?: boolean;
}

const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'medium',
  icon,
  showDot = false,
}) => {
  // Prop is already correct type, use directly
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primaryLight + '20',
          textColor: colors.primary,
        };
      case 'success':
        return {
          backgroundColor: colors.successLight + '20',
          textColor: colors.success,
        };
      case 'warning':
        return {
          backgroundColor: colors.warningLight + '20',
          textColor: colors.warning,
        };
      case 'error':
        return {
          backgroundColor: colors.errorLight + '20',
          textColor: colors.error,
        };
      case 'info':
        return {
          backgroundColor: colors.infoLight + '20',
          textColor: colors.info,
        };
      default:
        return {
          backgroundColor: colors.gray200,
          textColor: colors.gray700,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.xs / 2,
          paddingHorizontal: spacing.xs,
          fontSize: typography.fontSize.xs,
        };
      case 'large':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: typography.fontSize.sm,
        };
      default:
        return {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          fontSize: typography.fontSize.xs,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantStyles.backgroundColor,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: variantStyles.textColor },
            { marginRight: spacing.xs },
          ]}
        />
      )}
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text
        style={[
          styles.text,
          {
            color: variantStyles.textColor,
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: spacingPatterns.borderRadius.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    ...typography.styles.caption,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
});

export default Badge;
