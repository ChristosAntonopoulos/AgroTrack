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
  const { colors } = useTheme();
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
          backgroundColor: colors.primaryDark,
          ...createElevation(colors, 'md'),
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.left}>
          <View style={[styles.logoWrap, { backgroundColor: colors.textInverse + '20' }]}>
            <BrandLogo size={24} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.textInverse }]}>OliveCycle</Text>
            <Text style={[styles.tagline, { color: colors.textInverse + 'BB' }]}>
              {t('tagline')}
            </Text>
          </View>
        </View>
        {roleLabel ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: colors.textInverse + '18',
                borderColor: colors.textInverse + '40',
              },
            ]}
          >
            <Ionicons name="person-circle-outline" size={14} color={colors.textInverse} />
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>{roleLabel}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {},
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
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 4,
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
