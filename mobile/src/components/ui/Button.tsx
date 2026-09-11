import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii, motion, createElevation } from '../../theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'ghost' | 'success' | 'warning' | 'error';
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
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const touchableDisabled = disabled || loading;

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: touchableDisabled ? colors.gray300 : colors.primary,
          borderColor: 'transparent',
          textColor: colors.onOlive,
        };
      case 'secondary':
        return {
          backgroundColor: touchableDisabled ? colors.gray300 : colors.surfaceMuted,
          borderColor: colors.border,
          textColor: touchableDisabled ? colors.gray400 : colors.textPrimary,
        };
      case 'success':
        return {
          backgroundColor: touchableDisabled ? colors.gray300 : colors.success,
          borderColor: 'transparent',
          textColor: colors.onOlive,
        };
      case 'warning':
        return {
          backgroundColor: touchableDisabled ? colors.gray300 : colors.warning,
          borderColor: 'transparent',
          textColor: colors.onOlive,
        };
      case 'error':
        return {
          backgroundColor: touchableDisabled ? colors.gray300 : colors.error,
          borderColor: 'transparent',
          textColor: colors.onOlive,
        };
      case 'outline':
        return {
          backgroundColor: colors.surface,
          borderColor: touchableDisabled ? colors.gray300 : colors.oliveBorder,
          textColor: touchableDisabled ? colors.gray400 : colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: colors.primaryLight,
          borderColor: 'transparent',
          textColor: touchableDisabled ? colors.gray400 : colors.primary,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: touchableDisabled ? colors.gray400 : colors.link,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: 'transparent',
          textColor: colors.onOlive,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: typography.fontSize.sm * fontScaleMultiplier,
          minHeight: Math.max(40, tapMin * 0.9),
        };
      case 'large':
        return {
          paddingVertical: spacing.base,
          paddingHorizontal: spacing.xl,
          fontSize: typography.fontSize.lg * fontScaleMultiplier,
          minHeight: Math.max(tapMin * 1.2, 52),
        };
      default:
        return {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          fontSize: typography.fontSize.base * fontScaleMultiplier,
          minHeight: tapMin,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const bordered = variant === 'outline' || variant === 'secondary';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: bordered ? 1 : 0,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          minHeight: sizeStyles.minHeight,
          width: fullWidth ? '100%' : 'auto',
          opacity: touchableDisabled ? 0.55 : 1,
        },
        variant === 'primary' && !touchableDisabled ? createElevation(colors, 'sm') : null,
        style,
      ]}
      onPress={onPress}
      disabled={touchableDisabled}
      activeOpacity={motion.pressOpacity}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon && iconPosition === 'left' ? <View style={styles.iconLeft}>{icon}</View> : null}
          <Text
            style={[
              styles.text,
              { color: variantStyles.textColor, fontSize: sizeStyles.fontSize },
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' ? <View style={styles.iconRight}>{icon}</View> : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '650' as unknown as '600',
    textAlign: 'center',
  },
  iconLeft: { marginRight: spacing.xs },
  iconRight: { marginLeft: spacing.xs },
});

export default Button;
