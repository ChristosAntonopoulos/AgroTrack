import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { loginTheme } from '../../theme/loginTheme';
import { typography, spacing, radii } from '../../theme';

const GoogleMark = () => (
  <View style={styles.mark} accessibilityElementsHidden>
    <Text style={styles.g}>G</Text>
  </View>
);

type Props = {
  onBeforeContinue?: () => void;
};

const AuthSocialButtons: React.FC<Props> = ({ onBeforeContinue }) => {
  const { t } = useTranslation('auth');
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => {
          onBeforeContinue?.();
          setNotice(t('register.socialComingSoon', { provider: 'Google' }));
        }}
        accessibilityRole="button"
      >
        <GoogleMark />
        <Text style={styles.label}>{t('register.continueGoogle')}</Text>
      </TouchableOpacity>
      {notice ? (
        <Text style={styles.note} accessibilityRole="text">
          {notice}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  btn: {
    minHeight: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: loginTheme.googleBorder,
    backgroundColor: loginTheme.googleBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  g: {
    color: '#4285F4',
    fontWeight: '800',
    fontSize: 14,
  },
  label: {
    ...typography.styles.bodySmall,
    color: loginTheme.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  note: {
    ...typography.styles.caption,
    color: loginTheme.textSecondary,
    textAlign: 'center',
  },
});

export default AuthSocialButtons;
