import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import GoogleGIcon from './GoogleGIcon';
import { loginTheme } from '../../theme/loginTheme';
import { typography, spacing, radii } from '../../theme';

type Props = {
  onBeforeContinue?: () => void;
};

const AuthSocialButtons: React.FC<Props> = ({ onBeforeContinue }) => {
  const { t } = useTranslation('auth');
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={() => {
          onBeforeContinue?.();
          setNotice(t('register.socialComingSoon', { provider: 'Google' }));
        }}
        accessibilityRole="button"
      >
        <GoogleGIcon size={20} />
        <Text style={styles.label}>{t('register.continueGoogle')}</Text>
      </Pressable>
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
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  btn: {
    minHeight: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: loginTheme.googleBorder,
    backgroundColor: loginTheme.googleBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: loginTheme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  btnPressed: {
    opacity: 0.92,
    backgroundColor: '#FAFAF8',
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
