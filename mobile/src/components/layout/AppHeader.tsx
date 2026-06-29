import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BrandLogo from '../ui/BrandLogo';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';

const AppHeader = () => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation('common');

  const roleLabel = user?.role
    ? t(`roles.${user.role}`, { defaultValue: user.role })
    : '';

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        {
          backgroundColor: colors.headerBackground,
          borderBottomColor: colors.headerBorder,
          ...createElevation(colors, isDark ? 'lg' : 'md'),
        },
      ]}
    >
      {isDark ? (
        <View
          style={[styles.accentLine, { backgroundColor: colors.headerAccent }]}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.inner}>
        <View style={styles.left}>
          <View
            style={[
              styles.logoWrap,
              {
                backgroundColor: isDark
                  ? colors.headerAccent + '28'
                  : colors.headerForeground + '20',
                borderColor: isDark ? colors.headerAccent + '50' : 'transparent',
              },
            ]}
          >
            <BrandLogo size={24} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.headerForeground }]}>OliveCycle</Text>
            <Text style={[styles.tagline, { color: colors.headerForegroundMuted }]}>
              {t('tagline')}
            </Text>
          </View>
        </View>
        {roleLabel ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isDark
                  ? colors.headerAccent + '22'
                  : colors.headerForeground + '18',
                borderColor: isDark ? colors.headerAccent + '55' : colors.headerForeground + '40',
              },
            ]}
          >
            <Ionicons name="person-circle-outline" size={14} color={colors.headerAccent} />
            <Text style={[styles.badgeText, { color: colors.headerForeground }]}>{roleLabel}</Text>
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
  accentLine: {
    position: 'absolute',
    bottom: 0,
    left: spacing.base,
    right: spacing.base,
    height: 2,
    borderRadius: 1,
    opacity: 0.85,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    ...typography.styles.h3,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  tagline: {
    ...typography.styles.caption,
    fontSize: 10,
    marginTop: -2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

export default AppHeader;
