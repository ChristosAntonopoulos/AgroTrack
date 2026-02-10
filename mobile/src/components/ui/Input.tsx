import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ViewStyle, TextInputProps } from 'react-native';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';

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
  ...textInputProps
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Convert boolean props to strict booleans for native TextInput component
  const hasError = !!error;
  
  if (__DEV__ && typeof secureTextEntry !== 'boolean' && secureTextEntry !== undefined && secureTextEntry !== null) {
    console.warn(`[Input] Received non-boolean secureTextEntry prop: ${typeof secureTextEntry} (${secureTextEntry})`);
  }
  const isSecureTextEntry: boolean = toBoolean(secureTextEntry, 'Input.secureTextEntry');
  const displaySecureTextEntry = showPasswordToggle && isSecureTextEntry && !isPasswordVisible;
  
  // Convert editable and autoCorrect for TextInput (native component)
  if (__DEV__ && textInputProps.editable !== undefined && typeof textInputProps.editable !== 'boolean' && textInputProps.editable !== null) {
    console.warn(`[Input] Received non-boolean editable prop: ${typeof textInputProps.editable} (${textInputProps.editable})`);
  }
  if (__DEV__ && textInputProps.autoCorrect !== undefined && typeof textInputProps.autoCorrect !== 'boolean' && textInputProps.autoCorrect !== null) {
    console.warn(`[Input] Received non-boolean autoCorrect prop: ${typeof textInputProps.autoCorrect} (${textInputProps.autoCorrect})`);
  }
  const editable = textInputProps.editable !== undefined ? toBoolean(textInputProps.editable, 'Input.editable') : textInputProps.editable;
  const autoCorrect = textInputProps.autoCorrect !== undefined ? toBoolean(textInputProps.autoCorrect, 'Input.autoCorrect') : textInputProps.autoCorrect;
  
  // Create sanitized textInputProps with converted booleans
  const sanitizedTextInputProps = {
    ...textInputProps,
    editable,
    autoCorrect,
  };

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
          style={[styles.input, leftIcon && styles.inputWithLeftIcon, (rightIcon || showPasswordToggle) && styles.inputWithRightIcon, style]}
          placeholderTextColor={colors.gray400}
          secureTextEntry={toBoolean(displaySecureTextEntry)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...sanitizedTextInputProps}
        />
        
        {showPasswordToggle && isSecureTextEntry ? (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            <Text>{isPasswordVisible ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        ) : null}
        
        {rightIcon && !showPasswordToggle ? (
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
