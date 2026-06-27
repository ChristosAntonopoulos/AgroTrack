import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { loginTheme } from '../../theme/loginTheme';
import { typography, spacing, spacingPatterns } from '../../theme';

type Props = TextInputProps & {
  label: string;
  leftIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
};

const AuthTextField: React.FC<Props> = ({
  label,
  leftIcon,
  showPasswordToggle = false,
  secureTextEntry,
  style,
  editable = true,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const isSecure = Boolean(secureTextEntry);
  const hidePassword = showPasswordToggle && isSecure && !visible;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          editable === false && styles.fieldDisabled,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          {...rest}
          editable={editable}
          secureTextEntry={hidePassword}
          placeholderTextColor={loginTheme.inputPlaceholder}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
        />
        {showPasswordToggle && isSecure ? (
          <TouchableOpacity
            style={styles.toggle}
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          >
            <Text style={styles.toggleIcon}>{visible ? '👁' : '👁‍🗨️'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.base,
  },
  label: {
    ...typography.styles.label,
    color: loginTheme.textPrimary,
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: loginTheme.inputBg,
    borderWidth: 1,
    borderColor: loginTheme.inputBorder,
    borderRadius: spacingPatterns.borderRadius.lg,
    minHeight: 52,
  },
  fieldFocused: {
    borderColor: loginTheme.inputBorderFocused,
    borderWidth: 1.5,
  },
  fieldDisabled: {
    opacity: 0.65,
  },
  leftIcon: {
    paddingLeft: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: loginTheme.textPrimary,
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 52,
  },
  toggle: {
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleIcon: {
    fontSize: 18,
    color: loginTheme.textMuted,
  },
});

export default AuthTextField;
