import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { InboxItem, inAppMessageService } from '../services/inAppCampaignService';
import { getPartnerService } from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useInAppMessagesOptional } from '../context/InAppMessageContext';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ScreenLayout from '../components/layout/ScreenLayout';
import { typography, spacing, radii } from '../theme';

const kindIcon = (item: InboxItem): React.ComponentProps<typeof Ionicons>['name'] => {
  if (item.source !== 'campaign') return 'notifications-outline';
  if (item.campaignKind === 'poll') return 'pie-chart-outline';
  if (item.campaignKind === 'questionnaire') return 'help-circle-outline';
  return 'megaphone-outline';
};

const NotificationsScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['common', 'nav']);
  const inApp = useInAppMessagesOptional();
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const nextInbox = await inAppMessageService.getInbox().catch(async () => {
        const legacy = await getPartnerService().getNotifications().catch(() => []);
        return legacy.map(
          (n): InboxItem => ({
            id: n.id,
            source: 'transactional',
            type: n.type,
            title: n.title,
            message: n.message,
            actionUrl: n.actionUrl,
            isRead: n.isRead,
            isCompleted: n.isRead,
            createdAt: n.createdAt,
          })
        );
      });
      setInbox(nextInbox);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load, inApp?.refreshInboxSignal]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const badgeLabel = (item: InboxItem) => {
    if (item.source !== 'campaign') return t('common:notifications.badge.inbox', { defaultValue: 'Inbox' });
    if (item.campaignKind === 'poll') return t('common:inApp.poll');
    if (item.campaignKind === 'questionnaire') return t('common:inApp.questionnaire');
    return t('common:inApp.announcement');
  };

  const handlePress = async (item: InboxItem) => {
    if (item.source === 'campaign' && item.campaignId) {
      if (inApp) {
        inApp.openCampaign(item.campaignId);
      }
      setInbox((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      return;
    }

    if (!item.isRead && !item.id.startsWith('campaign:')) {
      await getPartnerService().markNotificationRead(item.id).catch(() => undefined);
      setInbox((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    }

    if (item.actionUrl?.startsWith('/')) {
      // Deep app paths are limited on mobile; keep mark-read behavior.
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <ScreenLayout>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={inbox}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={t('common:notifications.empty')}
            description={t('common:notifications.emptyHint')}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => void handlePress(item)} activeOpacity={0.85}>
            <Card
              variant="elevated"
              style={{
                marginBottom: spacing.sm,
                ...(item.isRead
                  ? {}
                  : { borderLeftWidth: 4, borderLeftColor: colors.primary }),
              }}
            >
              <View style={styles.row}>
                <View style={[styles.iconBubble, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={kindIcon(item)} size={18} color={colors.primary} />
                </View>
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            item.source === 'campaign' ? colors.primaryLight : colors.surfaceMuted,
                          borderColor: colors.oliveBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              item.source === 'campaign' ? colors.primary : colors.textSecondary,
                          },
                        ]}
                      >
                        {badgeLabel(item)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
                    {item.message}
                  </Text>
                  <View style={styles.meta}>
                    <Text style={[styles.date, { color: colors.textTertiary }]}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                    {item.source === 'campaign' && !item.isCompleted && (
                      <Text style={[styles.cta, { color: colors.primary }]}>
                        {t('common:notifications.tapToRespond')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  copy: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: { ...typography.styles.body, fontWeight: '700', flex: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  badgeText: {
    ...typography.styles.caption,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  message: { ...typography.styles.bodySmall, lineHeight: 20, marginBottom: spacing.xs },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  date: { ...typography.styles.caption },
  cta: { ...typography.styles.caption, fontWeight: '700' },
});

export default NotificationsScreen;
