import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { UserNotificationItem } from '../services/partnerService';
import { getPartnerService } from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { typography, spacing } from '../theme';

const NotificationsScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation(['common', 'nav', 'partners']);
  const [inbox, setInbox] = useState<UserNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const nextInbox = await getPartnerService().getNotifications().catch(() => [] as UserNotificationItem[]);
      setInbox(nextInbox);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePress = async (item: UserNotificationItem) => {
    if (!item.isRead) {
      await getPartnerService().markNotificationRead(item.id).catch(() => undefined);
      setInbox((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <FlatList
      style={[styles.list, { backgroundColor: colors.background }]}
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
      ListEmptyComponent={<EmptyState title={t('empty.noData')} />}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => void handlePress(item)} activeOpacity={0.8}>
          <Card
            variant="elevated"
            style={{
              marginBottom: spacing.sm,
              ...(item.isRead ? {} : { borderLeftWidth: 4, borderLeftColor: colors.primary }),
            }}
          >
            <View style={styles.row}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.oliveBorder }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {t('nav:inbox', { defaultValue: 'Inbox' })}
                </Text>
              </View>
            </View>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{item.message}</Text>
            <Text style={[styles.date, { color: colors.textTertiary }]}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </Card>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  title: { ...typography.styles.body, fontWeight: '700', flex: 1, marginRight: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { ...typography.styles.caption, fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
  message: { ...typography.styles.bodySmall, lineHeight: 20, marginBottom: spacing.xs },
  date: { ...typography.styles.caption },
});

export default NotificationsScreen;
