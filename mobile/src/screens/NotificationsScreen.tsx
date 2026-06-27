import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MinistryNotification } from '../services/ministryApiService';
import { getMinistryService } from '../services/serviceFactory';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/ui/Card';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { typography, spacing } from '../theme';

const NotificationsScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('common');
  const [notifications, setNotifications] = useState<MinistryNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMinistryService().getNotifications(user.role);
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    await getMinistryService().markAsRead(id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const priorityColor = (p: string) => {
    if (p === 'high' || p === 'critical') return colors.error;
    if (p === 'medium') return colors.warning;
    return colors.info;
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <FlatList
      style={[styles.list, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      data={notifications}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListEmptyComponent={<EmptyState title={t('empty.noData')} />}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleMarkRead(item.id)} activeOpacity={0.8}>
          <Card
            variant="elevated"
            style={{
              marginBottom: spacing.sm,
              ...( !item.read ? { borderLeftWidth: 4, borderLeftColor: colors.primaryDark } : {}),
            }}
          >
            <View style={styles.row}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: priorityColor(item.priority) + '25' }]}>
                <Text style={[styles.badgeText, { color: priorityColor(item.priority) }]}>{item.priority}</Text>
              </View>
            </View>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{item.message}</Text>
            <Text style={[styles.date, { color: colors.textTertiary }]}>
              {item.date.toLocaleDateString()}
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
  card: { marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  title: { ...typography.styles.body, fontWeight: '700', flex: 1, marginRight: spacing.sm },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { ...typography.styles.caption, fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
  message: { ...typography.styles.bodySmall, lineHeight: 20, marginBottom: spacing.xs },
  date: { ...typography.styles.caption },
});

export default NotificationsScreen;
