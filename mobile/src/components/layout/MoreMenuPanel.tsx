import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { typography, spacing, radii, motion } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { createElevation } from '../../theme/elevation';
import { getPartnerService } from '../../services/serviceFactory';
import type { ExperienceMode } from '../../experience/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  onNavigate?: () => void;
};

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

/** Sectioned nav content for the left More overlay (web sidebar equivalent). */
const MoreMenuPanel: React.FC<Props> = ({ onNavigate }) => {
  const { user, isFieldOwner } = useAuth();
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier, experienceMode, setExperienceMode, isFullPicture } =
    usePreferences();
  const { t } = useTranslation(['settings', 'common', 'nav', 'fields', 'partners', 'chronologio']);
  const navigation = useNavigation<Nav>();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const rowHeight = Math.max(tapMin, 56);
  const role = user?.role || '';
  const canMoney = ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'].includes(role);
  const canInsights = isFullPicture && (role === 'FieldOwner' || role === 'Administrator');

  useEffect(() => {
    if (!user) return;
    void getPartnerService()
      .getNotifications()
      .then(items => items.filter(n => !n.isRead).length)
      .then(setUnreadAlerts)
      .catch(() => setUnreadAlerts(0));
  }, [user]);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  const go = (fn: () => void) => {
    onNavigate?.();
    fn();
  };

  const sections: MenuSection[] = [
    {
      id: 'work',
      title: t('nav:sections.work'),
      items: [
        {
          id: 'tasks',
          icon: 'list-outline',
          label: t('nav:tasks'),
          onPress: () => go(() => navigation.navigate('Main', { screen: 'Tasks' })),
          showArrow: true,
        },
        {
          id: 'calendar',
          icon: 'calendar-outline',
          label: t('nav:calendar'),
          onPress: () => go(() => navigation.navigate('Main', { screen: 'Calendar' })),
          showArrow: true,
        },
        {
          id: 'partners',
          icon: 'people-circle-outline',
          label: t('nav:partners'),
          onPress: () => go(() => navigation.navigate('Partners')),
          showArrow: true,
        },
        ...(canMoney
          ? [
              {
                id: 'money',
                icon: 'wallet-outline' as const,
                label: t('nav:money', { defaultValue: 'Costs' }),
                onPress: () => go(() => navigation.navigate('Money')),
                showArrow: true,
              },
            ]
          : []),
        ...(isFieldOwner()
          ? [
              {
                id: 'harvest',
                icon: 'basket-outline' as const,
                label: t('fields:thisHarvest.title'),
                onPress: () => go(() => navigation.navigate('ThisHarvest')),
                showArrow: true,
              },
              {
                id: 'apologismos',
                icon: 'book-outline' as const,
                label: t('fields:apologismos.title'),
                onPress: () => go(() => navigation.navigate('ThisHarvestReview')),
                showArrow: true,
              },
            ]
          : []),
        ...(canInsights
          ? [
              {
                id: 'reports',
                icon: 'document-outline' as const,
                label: t('nav:reports', { defaultValue: 'Reports' }),
                onPress: () => go(() => navigation.navigate('Reports')),
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
        ...(isFieldOwner()
          ? [
              {
                id: 'myservices',
                icon: 'briefcase-outline' as const,
                label: t('partners:myServices'),
                onPress: () => go(() => navigation.navigate('MyServices')),
                showArrow: true,
              },
            ]
          : []),
        {
          id: 'inbox',
          icon: 'notifications-outline',
          label: t('nav:inbox', { defaultValue: 'Inbox' }),
          onPress: () => go(() => navigation.navigate('Notifications')),
          badge: unreadAlerts || undefined,
          showArrow: true,
        },
        {
          id: 'settings',
          icon: 'settings-outline',
          label: t('nav:settings'),
          onPress: () => go(() => navigation.navigate('Main', { screen: 'Settings' })),
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
    <ScrollView
      style={{ backgroundColor: colors.backgroundSidebar || colors.surfaceMuted }}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      {displayName ? (
        <Text
          style={[
            styles.subtitle,
            { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier },
          ]}
        >
          {displayName}
        </Text>
      ) : null}

      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.textTertiary, fontSize: 11 * fontScaleMultiplier },
          ]}
        >
          {t('settings:experience.currentMode')}
        </Text>
        <View style={styles.modeRow}>
          {modes.map(mode => {
            const active = experienceMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                onPress={() => setExperienceMode(mode.id)}
                style={[
                  styles.modeBtn,
                  {
                    minHeight: rowHeight * 0.85,
                    backgroundColor: active ? colors.primaryLight : colors.surface,
                    borderColor: active ? colors.oliveBorder : colors.borderLight,
                  },
                ]}
                activeOpacity={motion.pressOpacity}
              >
                <Text
                  style={{
                    color: active ? colors.primary : colors.textPrimary,
                    fontWeight: '700',
                    fontSize: 14 * fontScaleMultiplier,
                  }}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {sections.map(section => (
        <View key={section.id} style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textTertiary, fontSize: 11 * fontScaleMultiplier },
            ]}
          >
            {section.title}
          </Text>
          <View
            style={[
              styles.menu,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                ...createElevation(colors, 'sm'),
              },
            ]}
          >
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
                activeOpacity={motion.pressOpacity}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                  </View>
                  <Text
                    style={[
                      styles.menuLabel,
                      { color: colors.textPrimary, fontSize: 16 * fontScaleMultiplier },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                <View style={styles.menuItemRight}>
                  {item.badge ? (
                    <View style={[styles.badge, { backgroundColor: colors.error }]}>
                      <Text
                        style={[
                          styles.badgeText,
                          { color: colors.onOlive, fontSize: 12 * fontScaleMultiplier },
                        ]}
                      >
                        {item.badge}
                      </Text>
                    </View>
                  ) : null}
                  {item.showArrow ? (
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
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
  content: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    ...typography.styles.body,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
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
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  menu: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
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
    width: 40,
    height: 40,
    borderRadius: 12,
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
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontWeight: '700',
  },
});

export default MoreMenuPanel;
