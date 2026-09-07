import React, { useEffect, useState } from 'react';
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
import { getMinistryService } from '../services/serviceFactory';
import type { ExperienceMode } from '../experience/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  badge?: number;
  showArrow?: boolean;
}

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

const MoreScreen = () => {
  const { user, isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier, experienceMode, setExperienceMode } = usePreferences();
  const { t } = useTranslation(['settings', 'common', 'nav', 'fields']);
  const navigation = useNavigation<Nav>();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const rowHeight = Math.max(tapMin, 64);

  useEffect(() => {
    if (!user) return;
    getMinistryService()
      .getNotifications(user.role)
      .then((items) => setUnreadAlerts(items.filter((n) => !n.read).length))
      .catch(() => setUnreadAlerts(0));
  }, [user]);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  const sections: MenuSection[] = [
    {
      id: 'work',
      title: t('nav:sections.work'),
      items: [
        ...(isFieldOwner()
          ? [
              {
                id: 'harvest',
                icon: 'basket-outline' as const,
                label: t('fields:thisHarvest.title'),
                onPress: () => navigation.navigate('ThisHarvest'),
                showArrow: true,
              },
              {
                id: 'people',
                icon: 'people-outline' as const,
                label: t('fields:people.title'),
                onPress: () => navigation.navigate('People'),
                showArrow: true,
              },
            ]
          : []),
        {
          id: 'week',
          icon: 'calendar-outline',
          label: t('nav:thisWeek'),
          onPress: () => navigation.navigate('Main', { screen: 'Calendar' }),
          showArrow: true,
        },
        ...(isFieldOwner()
          ? [
              {
                id: 'dashboard',
                icon: 'grid-outline' as const,
                label: t('nav:dashboard'),
                onPress: () => navigation.navigate('Main', { screen: 'Dashboard' }),
                showArrow: true,
              },
            ]
          : []),
      ],
    },
    {
      id: 'account',
      title: t('nav:sections.account'),
      items: [
        {
          id: 'ministry',
          icon: 'document-text-outline',
          label: t('nav:notifications'),
          onPress: () => navigation.navigate('Notifications'),
          badge: unreadAlerts || undefined,
          showArrow: true,
        },
        {
          id: 'settings',
          icon: 'settings-outline',
          label: t('nav:settings'),
          onPress: () => navigation.navigate('Main', { screen: 'Settings' }),
          showArrow: true,
        },
      ],
    },
  ];

  const modes: { id: ExperienceMode; label: string }[] = [
    { id: 'everyday', label: t('settings:experience.everyday') },
    { id: 'full', label: t('settings:experience.full') },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 28 * fontScaleMultiplier }]}>
          {t('settings:more.title')}
        </Text>
        {displayName ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }]}>
            {displayName}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier }]}>
          {t('settings:experience.currentMode')}
        </Text>
        <View style={styles.modeRow}>
          {modes.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              onPress={() => setExperienceMode(mode.id)}
              style={[
                styles.modeBtn,
                {
                  minHeight: rowHeight,
                  backgroundColor: experienceMode === mode.id ? colors.primaryDark : colors.surfaceElevated,
                  borderColor: experienceMode === mode.id ? colors.primaryDark : colors.borderLight,
                  ...createElevation(colors, 'sm'),
                },
              ]}
            >
              <Text
                style={{
                  color: experienceMode === mode.id ? colors.textInverse : colors.textPrimary,
                  fontWeight: '800',
                  fontSize: 16 * fontScaleMultiplier,
                }}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier }]}>
            {section.title}
          </Text>
          <View style={[styles.menu, { backgroundColor: colors.surfaceElevated, ...createElevation(colors, 'sm') }]}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  {
                    borderBottomWidth: index < section.items.length - 1 ? 1 : 0,
                    borderBottomColor: colors.borderLight,
                    minHeight: rowHeight,
                  },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={item.icon} size={24} color={colors.primary} />
                  </View>
                  <Text
                    style={[
                      styles.menuLabel,
                      {
                        color: colors.textPrimary,
                        fontSize: 18 * fontScaleMultiplier,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.menuItemRight}>
                  {item.badge ? (
                    <View style={[styles.badge, { backgroundColor: colors.error }]}>
                      <Text style={[styles.badgeText, { color: colors.textInverse, fontSize: 12 * fontScaleMultiplier }]}>
                        {item.badge}
                      </Text>
                    </View>
                  ) : null}
                  {item.showArrow ? (
                    <Ionicons name="chevron-forward" size={22} color={colors.textTertiary} />
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
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
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  sectionTitle: {
    ...typography.styles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  menu: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontWeight: '700',
  },
});

export default MoreScreen;
