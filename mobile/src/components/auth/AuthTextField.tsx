import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { loginTheme } from '../../theme/loginTheme';
import { typography, spacing, radii } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = TextInputProps & {
  label: string;
  leftIcon?: IconName;
  showPasswordToggle?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  labelRight?: React.ReactNode;
};

const AuthTextField: React.FC<Props> = ({
  label,
  leftIcon,
  showPasswordToggle = false,
  secureTextEntry,
  style,
  editable = true,
  error,
  helperText,
  required,
  optional,
  labelRight,
  ...rest
}) => {
  const { t } = useTranslation('auth');
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const isSecure = Boolean(secureTextEntry);
  const hidePassword = showPasswordToggle && isSecure && !visible;
  const hasError = Boolean(error);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
          {optional ? <Text style={styles.optional}> {t('register.optional')}</Text> : null}
        </Text>
        {labelRight}
      </View>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          hasError && styles.fieldError,
          editable === false && styles.fieldDisabled,
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={hasError ? loginTheme.error : loginTheme.textMuted}
            style={styles.leftIcon}
          />
        ) : null}
        <TextInput
          {...rest}
          editable={editable}
          secureTextEntry={hidePassword}
          placeholderTextColor={loginTheme.inputPlaceholder}
          style={[styles.input, style]}
          accessibilityLabel={label}
          accessibilityState={{ disabled: editable === false }}
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
            accessibilityLabel={visible ? t('login.hidePassword') : t('login.showPassword')}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={loginTheme.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {helperText && !error ? <Text style={styles.helper}>{helperText}</Text> : null}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.base,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  label: {
    ...typography.styles.label,
    color: loginTheme.textPrimary,
    flex: 1,
  },
  required: {
    color: loginTheme.error,
  },
  optional: {
    ...typography.styles.caption,
    color: loginTheme.textMuted,
    fontWeight: '400',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: loginTheme.inputBg,
    borderWidth: 1,
    borderColor: loginTheme.inputBorder,
    borderRadius: radii.lg,
    minHeight: 52,
  },
  fieldFocused: {
    borderColor: loginTheme.inputBorderFocused,
    borderWidth: 1.5,
  },
  fieldError: {
    borderColor: loginTheme.error,
  },
  fieldDisabled: {
    opacity: 0.65,
  },
  leftIcon: {
    marginLeft: spacing.base,
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
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helper: {
    ...typography.styles.caption,
    color: loginTheme.textMuted,
    marginTop: spacing.xs,
  },
  error: {
    ...typography.styles.caption,
    color: loginTheme.error,
    marginTop: spacing.xs,
  },
});

export default AuthTextField;
