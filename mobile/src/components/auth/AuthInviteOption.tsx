import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { loginTheme } from '../../theme/loginTheme';
import { typography, spacing, radii } from '../../theme';

type Props = {
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
};

/** Clear invitation path — not a buried text link. */
const AuthInviteOption: React.FC<Props> = ({ selected = false, onPress, disabled = false }) => {
  const { t } = useTranslation('auth');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && !disabled && styles.cardPressed,
        disabled && styles.cardDisabled,
      ]}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <Ionicons
          name="people-outline"
          size={20}
          color={selected ? loginTheme.softSelectedText : loginTheme.link}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, selected && styles.titleSelected]}>
          {t('register.inviteToggle')}
        </Text>
        <Text style={styles.subtitle}>{t('register.inviteOptionHint')}</Text>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'chevron-forward'}
        size={selected ? 22 : 18}
        color={selected ? loginTheme.softSelectedText : loginTheme.textMuted}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: loginTheme.inviteBorder,
    backgroundColor: loginTheme.inviteBg,
  },
  cardSelected: {
    borderColor: loginTheme.softSelectedText,
    backgroundColor: loginTheme.softSelected,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: loginTheme.inviteIconBg,
  },
  iconWrapSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.styles.bodySmall,
    color: loginTheme.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: -0.1,
  },
  titleSelected: {
    color: loginTheme.softSelectedText,
  },
  subtitle: {
    ...typography.styles.caption,
    color: loginTheme.textMuted,
    lineHeight: 16,
  },
});

export default AuthInviteOption;
