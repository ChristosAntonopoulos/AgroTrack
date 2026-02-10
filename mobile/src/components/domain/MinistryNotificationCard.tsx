import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from '../ui/Card';
import { MinistryNotification } from '../../services/ministryNotificationService';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';

export interface MinistryNotificationCardProps {
  notification: MinistryNotification;
  onPress?: () => void;
  onMarkAsRead?: (id: string) => void;
}

const MinistryNotificationCard: React.FC<MinistryNotificationCardProps> = ({
  notification,
  onPress,
  onMarkAsRead,
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'regulation':
        return '📋';
      case 'subsidy':
        return '💰';
      case 'deadline':
        return '⏰';
      case 'alert':
        return '⚠️';
      case 'training':
        return '🎓';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return colors.error;
      case 'high':
        return colors.warning;
      case 'medium':
        return colors.info;
      default:
        return colors.gray400;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const priorityColor = getPriorityColor(notification.priority);
  const safeRead = toBoolean(notification.read, 'MinistryNotificationCard.read');

  return (
    <Card
      variant="elevated"
      style={[
        styles.card,
        !safeRead ? styles.unread : null,
        { borderLeftWidth: 3, borderLeftColor: priorityColor },
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{getTypeIcon(notification.type)}</Text>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {notification.title}
              </Text>
              {!safeRead ? (
                <View style={styles.unreadDot} />
              ) : null}
            </View>
            <Text style={styles.date}>{formatDate(notification.date)}</Text>
          </View>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
          <Text style={[styles.priorityText, { color: priorityColor }]}>
            {notification.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.message} numberOfLines={3}>
        {notification.message}
      </Text>

      <View style={styles.footer}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{notification.category}</Text>
        </View>
        {notification.expirationDate ? (
          <Text style={styles.expirationText}>
            Expires: {notification.expirationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        ) : null}
        {!safeRead && onMarkAsRead ? (
          <TouchableOpacity
            onPress={() => onMarkAsRead(notification.id)}
            style={styles.markReadButton}
          >
            <Text style={styles.markReadText}>Mark as read</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  unread: {
    backgroundColor: colors.primary + '05',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  title: {
    ...typography.styles.bodySmall,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing.xs,
  },
  date: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  priorityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacingPatterns.borderRadius.sm,
  },
  priorityText: {
    ...typography.styles.caption,
    fontSize: 9,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  message: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.gray200,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacingPatterns.borderRadius.sm,
  },
  categoryText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  expirationText: {
    ...typography.styles.caption,
    color: colors.warning,
    fontSize: 10,
    marginLeft: 'auto',
  },
  markReadButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  markReadText: {
    ...typography.styles.caption,
    color: colors.primary,
    fontSize: 10,
    fontWeight: typography.fontWeight.medium,
  },
});

export default MinistryNotificationCard;
