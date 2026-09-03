import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { typography, spacing } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { createElevation } from '../theme/elevation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  badge?: number;
  showArrow?: boolean;
}

const MoreScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier, experienceMode } = usePreferences();
  const { t } = useTranslation(['settings', 'common', 'nav']);
  const navigation = useNavigation<Nav>();

  const menuItems: MenuItem[] = [
    {
      id: 'calendar',
      icon: 'calendar-outline',
      label: t('nav:calendar'),
      onPress: () => navigation.navigate('Calendar' as any),
      showArrow: true,
    },
    {
      id: 'ministry',
      icon: 'document-text-outline',
      label: t('nav:ministry'),
      onPress: () => navigation.navigate('Ministry' as any),
      showArrow: true,
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: t('nav:settings'),
      onPress: () => navigation.navigate('Settings' as any),
      showArrow: true,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 28 * fontScaleMultiplier }]}>
          {t('settings:more.title', { defaultValue: 'More' })}
        </Text>
        {user?.name ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }]}>
            {user.name}
          </Text>
        ) : null}
      </View>

      <View style={styles.menu}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              {
                backgroundColor: colors.surfaceElevated,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: colors.borderLight,
                minHeight: Math.max(tapMin, 56),
                ...createElevation(colors, 'sm'),
              },
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.menuLabel,
                  {
                    color: colors.textPrimary,
                    fontSize: 16 * fontScaleMultiplier,
                  },
                ]}
              >
                {item.label}
              </Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.badge ? (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.badgeText, { color: colors.textInverse }]}>{item.badge}</Text>
                </View>
              ) : null}
              {item.showArrow ? (
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoSection}>
        <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
          {t('settings:experience.currentMode', { defaultValue: 'Experience mode' })}:{' '}
          <Text style={{ fontWeight: '700' }}>
            {experienceMode === 'everyday' 
              ? t('settings:experience.everyday') 
              : t('settings:experience.full')}
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.styles.h1,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.styles.body,
  },
  menu: {
    marginHorizontal: spacing.base,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    ...typography.styles.body,
    fontWeight: '600',
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoSection: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  infoText: {
    textAlign: 'center',
  },
});

export default MoreScreen;
