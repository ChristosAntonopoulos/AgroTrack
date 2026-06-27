import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { colors, typography, spacing, spacingPatterns } from '../../theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
}) => {
  const isLoading = Boolean(loading);
  const isDisabled = Boolean(disabled);
  const touchableDisabled = isDisabled || isLoading;

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: touchableDisabled ? colors.gray300 : colors.primary,
          borderColor: 'transparent',
          textColor: colors.white,
        };
      case 'secondary':
        return {
          backgroundColor: touchableDisabled ? colors.gray300 : colors.secondary,
          borderColor: 'transparent',
          textColor: colors.white,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: touchableDisabled ? colors.gray300 : colors.primary,
          textColor: touchableDisabled ? colors.gray400 : colors.primary,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: touchableDisabled ? colors.gray400 : colors.primary,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: 'transparent',
          textColor: colors.white,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: typography.fontSize.sm,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          fontSize: typography.fontSize.lg,
        };
      default:
        return {
          paddingVertical: spacing.base,
          paddingHorizontal: spacing.lg,
          fontSize: typography.fontSize.base,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          width: fullWidth ? '100%' : 'auto',
          opacity: touchableDisabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={touchableDisabled}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' ? (
            <Text style={styles.iconLeft}>{icon}</Text>
          ) : null}
          <Text
            style={[
              styles.text,
              {
                color: variantStyles.textColor,
                fontSize: sizeStyles.fontSize,
              },
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' ? (
            <Text style={styles.iconRight}>{icon}</Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacingPatterns.borderRadius.md,
    ...spacingPatterns.shadow.sm,
  },
  text: {
    fontSize: typography.styles.button.fontSize,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.styles.button.lineHeight,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: spacing.xs,
    fontSize: 18,
  },
  iconRight: {
    marginLeft: spacing.xs,
    fontSize: 18,
  },
});

export default Button;
