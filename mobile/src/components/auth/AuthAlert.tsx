import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { loginTheme } from '../../theme/loginTheme';
import { typography, spacing, radii } from '../../theme';

type Props = {
  message: string;
  tone?: 'error' | 'success';
};

const AuthAlert: React.FC<Props> = ({ message, tone = 'error' }) => (
  <View
    style={[styles.box, tone === 'success' ? styles.success : styles.error]}
    accessibilityRole="alert"
    accessibilityLiveRegion="assertive"
  >
    <Text style={[styles.text, tone === 'success' ? styles.successText : styles.errorText]}>
      {message}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  box: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  error: {
    backgroundColor: loginTheme.errorBg,
  },
  success: {
    backgroundColor: loginTheme.successBg,
  },
  text: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
  },
  errorText: {
    color: loginTheme.error,
  },
  successText: {
    color: loginTheme.success,
  },
});

export default AuthAlert;
