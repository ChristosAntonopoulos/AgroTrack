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
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii } from '../../theme';
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
  const { colors, fontScaleMultiplier, tapMin } = useTheme();
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
      {label ? (
        <Text style={[styles.label, { color: colors.textPrimary, fontSize: typography.styles.label.fontSize * fontScaleMultiplier }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: hasError ? colors.error : isFocused ? colors.focusRing : colors.border,
            borderWidth: isFocused ? 2 : 1,
          },
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              fontSize: typography.styles.body.fontSize * fontScaleMultiplier,
              minHeight: tapMin,
            },
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon || showToggle ? styles.inputWithRightIcon : null,
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          onFocus={e => {
            setIsFocused(true);
            restProps.onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            restProps.onBlur?.(e);
          }}
        />

        {showToggle && isSecure ? (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible(v => !v)}
          >
            <Text style={{ color: colors.textSecondary }}>{isPasswordVisible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        ) : null}

        {rightIcon && !showToggle ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : null}
      {helperText && !error ? (
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.base },
  label: {
    fontSize: typography.styles.label.fontSize,
    fontWeight: typography.styles.label.fontWeight,
    lineHeight: typography.styles.label.lineHeight,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
  },
  input: {
    flex: 1,
    fontSize: typography.styles.body.fontSize,
    lineHeight: typography.styles.body.lineHeight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  inputWithLeftIcon: { paddingLeft: spacing.xs },
  inputWithRightIcon: { paddingRight: spacing.xs },
  leftIcon: { paddingLeft: spacing.base, justifyContent: 'center', alignItems: 'center' },
  rightIcon: { paddingRight: spacing.base, justifyContent: 'center', alignItems: 'center' },
  errorText: {
    fontSize: typography.styles.caption.fontSize,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: typography.styles.caption.fontSize,
    marginTop: spacing.xs,
  },
});

export default Input;
