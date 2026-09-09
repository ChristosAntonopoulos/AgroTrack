import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import { Activity } from '../../services/activityService';

export interface ActivityTimelineProps {
  activities: Activity[];
  fieldNames?: Record<string, string>;
  onPressActivity?: (activity: Activity) => void;
  limit?: number;
}

function formatTimeAgo(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return locale.startsWith('el') ? `${mins} λεπτά` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale.startsWith('el') ? `${hours} ώρες` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale.startsWith('el') ? `${days} ημέρες` : `${days}d ago`;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  fieldNames = {},
  onPressActivity,
  limit = 4,
}) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('dashboard');
  const items = activities.slice(0, limit);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="time-outline" size={16} color={colors.primaryDark} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('myActions.recentTitle', { defaultValue: t('recentActivity') })}
        </Text>
      </View>
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t('myActions.recentEmpty', { defaultValue: t('noRecentActivity') })}
        </Text>
      ) : (
        items.map((act, idx) => {
          const body = (
            <>
              <View style={styles.timeline}>
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                {idx < items.length - 1 ? (
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                ) : null}
              </View>
              <View style={styles.content}>
                <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
                  {act.message}
                </Text>
                <Text style={[styles.time, { color: colors.textTertiary }]}>
                  {fieldNames[act.fieldId] ? `${fieldNames[act.fieldId]} · ` : ''}
                  {formatTimeAgo(act.timestamp, i18n.language)}
                </Text>
              </View>
            </>
          );

          if (onPressActivity) {
            return (
              <TouchableOpacity
                key={act.id}
                style={styles.row}
                onPress={() => onPressActivity(act)}
                accessibilityRole="button"
              >
                {body}
              </TouchableOpacity>
            );
          }

          return (
            <View key={act.id} style={styles.row}>
              {body}
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 140,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  title: { ...typography.styles.bodySmall, fontWeight: '700' },
  empty: { ...typography.styles.caption },
  row: { flexDirection: 'row', gap: spacing.sm, minHeight: 44 },
  timeline: { alignItems: 'center', width: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  line: { width: 2, flex: 1, marginTop: 2 },
  content: { flex: 1, paddingBottom: spacing.sm },
  message: { ...typography.styles.caption, fontWeight: '600', lineHeight: 16 },
  time: { ...typography.styles.caption, fontSize: 10, marginTop: 2 },
});

export default ActivityTimeline;
