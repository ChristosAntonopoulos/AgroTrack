import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';

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
  // Log boolean props to catch any non-boolean values
  if (__DEV__) {
    console.log('[Button] Rendering - title:', title, 'variant:', variant);
    console.log('[Button] loading prop - type:', typeof loading, 'value:', loading);
    console.log('[Button] disabled prop - type:', typeof disabled, 'value:', disabled);
    
    if (typeof loading !== 'boolean') {
      console.error('[Button] ⚠️ loading is NOT boolean! Type:', typeof loading, 'Value:', loading);
    }
    if (typeof disabled !== 'boolean') {
      console.error('[Button] ⚠️ disabled is NOT boolean! Type:', typeof disabled, 'Value:', disabled);
    }
  }
  
  // Props are already correct types, use directly
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? colors.gray300 : colors.primary,
          borderColor: 'transparent',
          textColor: colors.white,
        };
      case 'secondary':
        return {
          backgroundColor: disabled ? colors.gray300 : colors.secondary,
          borderColor: 'transparent',
          textColor: colors.white,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: disabled ? colors.gray300 : colors.primary,
          textColor: disabled ? colors.gray400 : colors.primary,
        };
      case 'text':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: disabled ? colors.gray400 : colors.primary,
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

  // Ensure touchableDisabled is a strict boolean for native component
  // Use toBoolean to handle cases where disabled or loading might be strings
  const touchableDisabled = toBoolean(disabled || loading, 'Button.touchableDisabled');
  
  // Log detailed prop information for debugging
  if (__DEV__) {
    console.log('[Button] About to render TouchableOpacity');
    console.log('[Button] disabled prop for TouchableOpacity - type:', typeof touchableDisabled, 'value:', touchableDisabled);
    console.log('[Button] disabled || loading =', disabled, '||', loading, '=', touchableDisabled);
    
    if (typeof touchableDisabled !== 'boolean') {
      console.error('[Button] ⚠️ TouchableOpacity disabled is NOT boolean! Type:', typeof touchableDisabled, 'Value:', touchableDisabled);
    }
    
    // Store component context for error tracking
    if (typeof (global as any).__lastRenderedComponent === 'undefined') {
      (global as any).__lastRenderedComponent = {};
    }
    (global as any).__lastRenderedComponent.Button = {
      disabled: { value: disabled, type: typeof disabled },
      loading: { value: loading, type: typeof loading },
      touchableDisabled: { value: touchableDisabled, type: typeof touchableDisabled },
      timestamp: Date.now(),
    };
  }

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
          opacity: disabled || loading ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={touchableDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
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
