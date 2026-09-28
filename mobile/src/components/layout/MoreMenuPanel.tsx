import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useHarvestCampaignOptional } from '../../context/HarvestCampaignContext';
import {
  useFamilyCollaboratorOwnerLabel,
  useFamilyMembershipModules,
} from '../../hooks/useFamilyMembershipModules';
import { typography, spacing, radii, motion } from '../../theme';
import { RootStackParamList } from '../../navigation/types';
import { openHarvestCampaign } from '../../navigation/intents';
import { getPartnerService } from '../../services/serviceFactory';
import { inAppMessageService } from '../../services/inAppCampaignService';
import { useInAppMessagesOptional } from '../../context/InAppMessageContext';
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

/** More tab body — identity and grouped destinations. */
const MoreMenuPanel: React.FC = () => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const { t } = useTranslation(['settings', 'common', 'nav', 'fields', 'partners', 'chronologio']);
  const navigation = useNavigation<Nav>();
  const harvest = useHarvestCampaignOptional();
  const familyModules = useFamilyMembershipModules();
  const collaboratorOwnerLabel = useFamilyCollaboratorOwnerLabel();
  const inApp = useInAppMessagesOptional();
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const rowHeight = Math.max(tapMin, 52);
  const role = user?.role || '';
  const canMoney = ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'].includes(role);
  const showPartners = familyModules === null;
  const showMoney = canMoney && (familyModules === null || Boolean(familyModules.has('money')));
  const showHarvest = familyModules === null || Boolean(familyModules.has('harvest'));
  const showPhotos = familyModules === null || Boolean(familyModules.has('photos'));
  const collaboratorBadge = collaboratorOwnerLabel
    ? t('common:familyCollaboratorBadge', { owner: collaboratorOwnerLabel })
    : null;

  const loadAlerts = useCallback(() => {
    if (!user) return;
    void inAppMessageService
      .getInbox()
      .then((items) => items.filter((n) => !n.isRead).length)
      .then(setUnreadAlerts)
      .catch(() =>
        getPartnerService()
          .getNotifications()
          .then((items) => items.filter((n) => !n.isRead).length)
          .then(setUnreadAlerts)
          .catch(() => setUnreadAlerts(0))
      );
  }, [user]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts, inApp?.refreshInboxSignal]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const workItems: MenuItem[] = [];
  if (showPartners) {
    workItems.push({
      id: 'partners',
      icon: 'people-circle-outline',
      label: t('nav:partners'),
      onPress: () => navigation.navigate('Partners'),
      showArrow: true,
    });
  }
  if (showMoney) {
    workItems.push({
      id: 'money',
      icon: 'wallet-outline',
      label: t('nav:money', { defaultValue: 'Costs' }),
      onPress: () => navigation.navigate('Money'),
      showArrow: true,
    });
    workItems.push({
      id: 'my-oil',
      icon: 'water-outline',
      label: t('nav:myOil', { defaultValue: 'My oil' }),
      onPress: () => navigation.navigate('MyOil'),
      showArrow: true,
    });
  }
  if (showPhotos) {
    workItems.push({
      id: 'photos',
      icon: 'images-outline',
      label: t('nav:photos', { defaultValue: 'Photos' }),
      onPress: () => navigation.navigate('Photos'),
      showArrow: true,
    });
  }
  if (showHarvest) {
    workItems.push({
      id: 'harvest',
      icon: 'basket-outline',
      label: harvest?.isLive
        ? `${t('fields:harvestCampaign.title', {
            defaultValue: t('fields:thisHarvest.title'),
          })} · ${t('fields:harvestCampaign.headerOpen', { defaultValue: 'Live' })}`
        : t('fields:harvestCampaign.title', {
            defaultValue: t('fields:thisHarvest.title'),
          }),
      onPress: () => openHarvestCampaign(navigation),
      showArrow: true,
    });
  }

  const accountItems: MenuItem[] = [
    {
      id: 'feedback',
      icon: 'heart-outline',
      label: t('nav:feedback', { defaultValue: 'Feedback' }),
      onPress: () => navigation.navigate('Feedback'),
      showArrow: true,
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: t('nav:settings'),
      onPress: () => navigation.navigate('Settings'),
      showArrow: true,
    },
  ];

  const sections: MenuSection[] = [
    {
      id: 'work',
      title: t('nav:sections.work'),
      items: workItems,
    },
    {
      id: 'account',
      title: t('nav:sections.account'),
      items: accountItems,
    },
  ].filter((section) => section.items.length > 0);

  return (
    <ScreenLayout scroll tabBarInset padded>
      <ScreenHeader
        title={displayName || t('nav:more')}
        subtitle={collaboratorBadge || undefined}
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
