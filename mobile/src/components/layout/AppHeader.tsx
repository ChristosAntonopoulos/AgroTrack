import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BrandLogo from '../ui/BrandLogo';
import { typography, spacing } from '../../theme';

const AppHeader = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  const roleLabel = user?.role
    ? t(`roles.${user.role}`, { defaultValue: user.role })
    : '';

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
      <View style={styles.inner}>
        <View style={styles.left}>
          <BrandLogo size={28} />
          <Text style={[styles.title, { color: colors.primary }]}>AgroTrack</Text>
        </View>
        {roleLabel ? (
          <View style={[styles.badge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{roleLabel}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: { fontSize: 22 },
  title: {
    ...typography.styles.h3,
    fontWeight: typography.fontWeight.bold,
    fontSize: 18,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    ...typography.styles.caption,
    fontWeight: typography.fontWeight.semibold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

export default AppHeader;
