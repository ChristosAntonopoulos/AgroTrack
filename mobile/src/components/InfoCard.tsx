import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, typography, spacing, spacingPatterns } from '../theme';

interface InfoCardProps {
  title?: string;
  value?: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  onPress?: () => void;
  style?: ViewStyle;
  children?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
}

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  onPress,
  style,
  children,
  variant = 'default',
}) => {
  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primaryLight + '20',
          borderColor: colors.primary,
          iconColor: colors.primary,
        };
      case 'success':
        return {
          backgroundColor: colors.successLight + '20',
          borderColor: colors.success,
          iconColor: colors.success,
        };
      case 'warning':
        return {
          backgroundColor: colors.warningLight + '20',
          borderColor: colors.warning,
          iconColor: colors.warning,
        };
      case 'info':
        return {
          backgroundColor: colors.infoLight + '20',
          borderColor: colors.info,
          iconColor: colors.info,
        };
      default:
        return {
          backgroundColor: colors.white,
          borderColor: colors.border,
          iconColor: colors.primary,
        };
    }
  };

  const variantColors = getVariantColors();
  const CardComponent = onPress ? TouchableOpacity : View;
  const isPressable = !!onPress;

  return (
    <CardComponent
      style={[
        styles.card,
        {
          backgroundColor: variantColors.backgroundColor,
          borderColor: variantColors.borderColor,
        },
        style,
      ]}
      onPress={onPress}
      {...(isPressable && { activeOpacity: 0.7 })}
    >
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: variantColors.iconColor + '20' }]}>
          {icon}
        </View>
      )}
      {children ? (
        children
      ) : (
        <>
          {title && <Text style={styles.title}>{title}</Text>}
          {value !== undefined && (
            <Text style={[styles.value, { color: variantColors.iconColor }]}>
              {value}
            </Text>
          )}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </>
      )}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
    borderRadius: spacingPatterns.borderRadius.lg,
    borderWidth: 1,
    ...spacingPatterns.shadow.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.styles.h3,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },
});

export default InfoCard;
