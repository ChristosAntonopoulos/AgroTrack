import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ministryNotificationService, MinistryNotification } from '../../services/ministryNotificationService';
import MinistryNotificationCard from './MinistryNotificationCard';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';
import EmptyState from '../EmptyState';

export interface MinistryNotificationListProps {
  userRole: string;
  maxItems?: number;
  showUnreadOnly?: boolean;
}

const MinistryNotificationList: React.FC<MinistryNotificationListProps> = ({
  userRole,
  maxItems,
  showUnreadOnly = false,
}) => {
  const [notifications, setNotifications] = useState<MinistryNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, [userRole, showUnreadOnly]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const allNotifications = await ministryNotificationService.getNotifications(userRole);
      const filtered = showUnreadOnly
        ? allNotifications.filter(n => !n.read)
        : allNotifications;
      
      const limited = maxItems ? filtered.slice(0, maxItems) : filtered;
      setNotifications(limited);
      
      const count = await ministryNotificationService.getUnreadCount(userRole);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await ministryNotificationService.markAsRead(id);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const safeRefreshing = toBoolean(refreshing, 'MinistryNotificationList.refreshing');

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <EmptyState
        icon="📢"
        title="No Notifications"
        description={showUnreadOnly ? "You're all caught up! No unread notifications." : "No notifications available."}
      />
    );
  }

  return (
    <View style={styles.container}>
      {!showUnreadOnly && unreadCount > 0 ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : null}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={safeRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {notifications.map((notification) => (
          <MinistryNotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.base,
  },
  unreadBadge: {
    backgroundColor: colors.primary + '15',
    padding: spacing.sm,
    borderRadius: spacingPatterns.borderRadius.md,
    marginBottom: spacing.sm,
  },
  unreadText: {
    ...typography.styles.bodySmall,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.base,
  },
});

export default MinistryNotificationList;
