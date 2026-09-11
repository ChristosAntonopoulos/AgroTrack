import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii } from '../../theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' | 'neutral';
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
  const { colors, fontScaleMultiplier } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primaryLight,
          borderColor: colors.oliveBorder,
          textColor: colors.primary,
        };
      case 'success':
        return {
          backgroundColor: colors.successLight,
          borderColor: colors.success,
          textColor: colors.success,
        };
      case 'warning':
        return {
          backgroundColor: colors.warningLight,
          borderColor: colors.warning,
          textColor: colors.warningDark,
        };
      case 'error':
        return {
          backgroundColor: colors.errorLight,
          borderColor: colors.error,
          textColor: colors.error,
        };
      case 'info':
        return {
          backgroundColor: colors.infoLight,
          borderColor: colors.info,
          textColor: colors.info,
        };
      case 'neutral':
        return {
          backgroundColor: colors.neutralLight,
          borderColor: colors.neutral,
          textColor: colors.textSecondary,
        };
      default:
        return {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          textColor: colors.textSecondary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: 2,
          paddingHorizontal: spacing.xs,
          fontSize: typography.fontSize.xs * fontScaleMultiplier,
        };
      case 'large':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: typography.fontSize.sm * fontScaleMultiplier,
        };
      default:
        return {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          fontSize: typography.fontSize.xs * fontScaleMultiplier,
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
          borderColor: variantStyles.borderColor,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
      ]}
    >
      {showDot ? (
        <View
          style={[
            styles.dot,
            { backgroundColor: variantStyles.textColor },
            { marginRight: spacing.xs },
          ]}
        />
      ) : null}
      {icon ? <View style={styles.icon}>{icon}</View> : null}
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
    borderRadius: radii.md,
    borderWidth: 1,
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
    fontWeight: '550' as unknown as '500',
  },
});

export default Badge;
