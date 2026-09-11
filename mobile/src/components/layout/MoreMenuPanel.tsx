import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { typography, spacing, radii, motion } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { getPartnerService } from '../../services/serviceFactory';
import type { ExperienceMode } from '../../experience/types';
import SegmentedControl from '../ui/SegmentedControl';
import BrandLogo from '../ui/BrandLogo';
import ScreenHeader from './ScreenHeader';
import HeaderIconButton from './HeaderIconButton';
import ScreenLayout from './ScreenLayout';

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

/** More tab body — identity, experience mode, grouped destinations. */
const MoreMenuPanel: React.FC = () => {
  const { user, isFieldOwner } = useAuth();
  const { colors, isDark } = useTheme();
  const { tapMin, fontScaleMultiplier, experienceMode, setExperienceMode, isFullPicture } =
    usePreferences();
  const { t } = useTranslation(['settings', 'common', 'nav', 'fields', 'partners', 'chronologio']);
  const navigation = useNavigation<Nav>();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const rowHeight = Math.max(tapMin, 52);
  const role = user?.role || '';
  const canMoney = ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'].includes(role);
  const canInsights = isFullPicture && (role === 'FieldOwner' || role === 'Administrator');

  const loadAlerts = useCallback(() => {
    if (!user) return;
    void getPartnerService()
      .getNotifications()
      .then(items => items.filter(n => !n.isRead).length)
      .then(setUnreadAlerts)
      .catch(() => setUnreadAlerts(0));
  }, [user]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const sections: MenuSection[] = [
    {
      id: 'work',
      title: t('nav:sections.work'),
      items: [
        {
          id: 'calendar',
          icon: 'calendar-outline',
          label: t('nav:calendar'),
          onPress: () => navigation.navigate('Calendar'),
          showArrow: true,
        },
        {
          id: 'partners',
          icon: 'people-circle-outline',
          label: t('nav:partners'),
          onPress: () => navigation.navigate('Partners'),
          showArrow: true,
        },
        ...(canMoney
          ? [
              {
                id: 'money',
                icon: 'wallet-outline' as const,
                label: t('nav:money', { defaultValue: 'Costs' }),
                onPress: () => navigation.navigate('Money'),
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
                onPress: () => navigation.navigate('ThisHarvest'),
                showArrow: true,
              },
              {
                id: 'apologismos',
                icon: 'book-outline' as const,
                label: t('fields:apologismos.title'),
                onPress: () => navigation.navigate('ThisHarvestReview'),
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
                onPress: () => navigation.navigate('Reports'),
                showArrow: true,
              },
              {
                id: 'dashboard',
                icon: 'home-outline' as const,
                label: t('nav:dashboard'),
                onPress: () => navigation.navigate('Dashboard'),
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
                onPress: () => navigation.navigate('MyServices'),
                showArrow: true,
              },
            ]
          : []),
        {
          id: 'settings',
          icon: 'settings-outline',
          label: t('nav:settings'),
          onPress: () => navigation.navigate('Settings'),
          showArrow: true,
        },
      ],
    },
  ];

  return (
    <ScreenLayout scroll tabBarInset padded>
      <ScreenHeader
        title={displayName || t('nav:more')}
        action={
          <HeaderIconButton
            icon="notifications-outline"
            accessibilityLabel={t('nav:inbox', { defaultValue: 'Inbox' })}
            onPress={() => navigation.navigate('Notifications')}
            badge={unreadAlerts || undefined}
          />
        }
        context={
          <View style={styles.identityRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
            </View>
            <BrandLogo variant="horizontal" tone={isDark ? 'on-dark' : 'on-light'} size={18} />
          </View>
        }
      />

      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier },
          ]}
        >
          {t('settings:experience.currentMode')}
        </Text>
        <SegmentedControl
          fullWidth
          value={experienceMode}
          onChange={setExperienceMode}
          options={[
            { value: 'everyday' as ExperienceMode, label: t('settings:experience.everyday') },
            { value: 'full' as ExperienceMode, label: t('settings:experience.full') },
          ]}
        />
      </View>

      {sections.map(section => (
        <View key={section.id} style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.textTertiary, fontSize: 12 * fontScaleMultiplier },
            ]}
          >
            {section.title}
          </Text>
          <View style={[styles.menu, { backgroundColor: colors.surface }]}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  {
                    borderBottomWidth: index < section.items.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: colors.borderLight,
                    minHeight: rowHeight,
                  },
                ]}
                onPress={item.onPress}
                activeOpacity={motion.pressOpacity}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon} size={22} color={colors.primary} />
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
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.styles.caption,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  menu: {
    borderRadius: radii.xl,
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
  menuLabel: {
    ...typography.styles.body,
    fontWeight: '500',
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontWeight: '700',
  },
});

export default MoreMenuPanel;
