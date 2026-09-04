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
import { usePreferences } from '../../context/PreferencesContext';
import { typography, spacing, spacingPatterns } from '../../theme';
import { createElevation } from '../../theme/elevation';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'ghost';
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
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const touchableDisabled = disabled || loading;

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: touchableDisabled ? colors.gray300 : colors.primaryDark,
          borderColor: 'transparent',
          textColor: colors.textInverse,
        };
      case 'secondary':
        return {
          backgroundColor: touchableDisabled ? colors.gray300 : colors.secondary,
          borderColor: 'transparent',
          textColor: colors.textInverse,
        };
      case 'outline':
        return {
          backgroundColor: colors.surface,
          borderColor: touchableDisabled ? colors.gray300 : colors.primaryDark,
          textColor: touchableDisabled ? colors.gray400 : colors.primaryDark,
        };
      case 'ghost':
        return {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
          textColor: touchableDisabled ? colors.gray400 : colors.textPrimary,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: touchableDisabled ? colors.gray400 : colors.primaryDark,
        };
      default:
        return {
          backgroundColor: colors.primaryDark,
          borderColor: 'transparent',
          textColor: colors.textInverse,
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
          minHeight: tapMin,
        };
      case 'large':
        return {
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.xl,
          fontSize: typography.fontSize.lg * fontScaleMultiplier,
          minHeight: Math.max(tapMin * 1.3, 56),
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
  const bordered = variant === 'outline' || variant === 'ghost';

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
      activeOpacity={0.75}
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
    borderRadius: spacingPatterns.borderRadius.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  iconLeft: { marginRight: spacing.xs },
  iconRight: { marginLeft: spacing.xs },
});

export default Button;
