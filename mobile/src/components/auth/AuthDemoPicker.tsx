import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { mobileDemoUsers, TestUser } from '../../services/mockUsers';
import { loginTheme } from '../../theme/loginTheme';
import { typography, spacing, radii } from '../../theme';

type Props = {
  loading?: boolean;
  onSelect: (user: TestUser) => void;
};

const AuthDemoPicker: React.FC<Props> = ({ loading, onSelect }) => {
  const { t } = useTranslation(['auth', 'common']);
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>{t('common:or')}</Text>
        <View style={styles.line} />
      </View>

      <Pressable
        onPress={() => setOpen((v) => !v)}
        disabled={loading}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: Boolean(loading) }}
      >
        <Text style={styles.ctaText}>{t('auth:login.demoCta')}</Text>
      </Pressable>

      {open ? (
        <View style={styles.panel}>
          <Text style={styles.choose}>{t('auth:login.demoChoose')}</Text>
          {mobileDemoUsers.map((user) => (
            <Pressable
              key={user.userId}
              disabled={loading}
              onPress={() => onSelect(user)}
              style={styles.option}
            >
              <Ionicons name="person-circle-outline" size={22} color={loginTheme.link} />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>{t(`auth:${user.nameKey}`)}</Text>
                <Text style={styles.optionSub}>{t(`auth:${user.subtitleKey}`)}</Text>
              </View>
            </Pressable>
          ))}
          <Text style={styles.note}>{t('auth:login.demoDataNote')}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: loginTheme.divider },
  or: { ...typography.styles.caption, color: loginTheme.textMuted },
  cta: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...typography.styles.bodySmall,
    color: loginTheme.link,
    fontWeight: '700',
  },
  panel: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: loginTheme.demoBg,
    borderWidth: 1,
    borderColor: loginTheme.cardBorder,
    gap: spacing.sm,
  },
  choose: {
    ...typography.styles.caption,
    color: loginTheme.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
  },
  optionText: { flex: 1 },
  optionTitle: {
    ...typography.styles.bodySmall,
    color: loginTheme.textPrimary,
    fontWeight: '700',
  },
  optionSub: {
    ...typography.styles.caption,
    color: loginTheme.textSecondary,
  },
  note: {
    ...typography.styles.caption,
    color: loginTheme.textMuted,
  },
});

export default AuthDemoPicker;
