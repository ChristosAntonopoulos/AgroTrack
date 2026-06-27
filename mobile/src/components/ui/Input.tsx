import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { sanitizeNativeBooleans, toBoolean } from '../../utils/booleanConverter';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  showPasswordToggle?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  showPasswordToggle = false,
  secureTextEntry,
  style,
  editable,
  autoCorrect,
  multiline,
  ...restProps
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;
  const isSecure = toBoolean(secureTextEntry);
  const showToggle = toBoolean(showPasswordToggle);
  const displaySecureTextEntry = showToggle && isSecure && !isPasswordVisible;

  const textInputProps = sanitizeNativeBooleans({
    ...restProps,
    editable: editable !== undefined ? toBoolean(editable) : true,
    autoCorrect: autoCorrect !== undefined ? toBoolean(autoCorrect) : undefined,
    multiline: multiline !== undefined ? toBoolean(multiline) : undefined,
    secureTextEntry: toBoolean(displaySecureTextEntry),
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          hasError && styles.inputContainerError,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon || showToggle ? styles.inputWithRightIcon : null,
            style,
          ]}
          placeholderTextColor={colors.gray400}
          onFocus={(e) => {
            setIsFocused(true);
            restProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            restProps.onBlur?.(e);
          }}
        />

        {showToggle && isSecure ? (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible(v => !v)}
          >
            <Text>{isPasswordVisible ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        ) : null}

        {rightIcon && !showToggle ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {helperText && !error ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.styles.label.fontSize,
    fontWeight: typography.styles.label.fontWeight,
    lineHeight: typography.styles.label.lineHeight,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacingPatterns.borderRadius.md,
    ...spacingPatterns.shadow.sm,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: typography.styles.body.fontSize,
    fontWeight: typography.styles.body.fontWeight,
    lineHeight: typography.styles.body.lineHeight,
    color: colors.textPrimary,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    minHeight: 48,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  leftIcon: {
    paddingLeft: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    paddingRight: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: typography.styles.caption.fontSize,
    fontWeight: typography.styles.caption.fontWeight,
    lineHeight: typography.styles.caption.lineHeight,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: typography.styles.caption.fontSize,
    fontWeight: typography.styles.caption.fontWeight,
    lineHeight: typography.styles.caption.lineHeight,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default Input;
