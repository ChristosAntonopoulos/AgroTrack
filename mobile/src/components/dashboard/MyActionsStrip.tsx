import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';
import {
  MeDashboard,
  MeDashboardPeriod,
  trendPercent,
} from '../../services/meDashboardService';

export interface MyActionsStripProps {
  data: MeDashboard;
  density?: 'everyday' | 'full';
  period?: MeDashboardPeriod;
  onPressTile: (target: 'Tasks' | 'Today' | 'Fields' | 'Partners') => void;
  tapMin?: number;
}

const MyActionsStrip: React.FC<MyActionsStripProps> = ({
  data,
  density = 'everyday',
  onPressTile,
  tapMin = 44,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation('dashboard');

  const tiles = useMemo(() => {
    const openEstimate =
      data.pending.overdue + data.pending.dueToday + Math.max(0, data.counts.tasksStarted);

    if (density === 'everyday') {
      return [
        {
          key: 'tasksCompleted',
          value: data.counts.tasksCompleted,
          prev: data.previousCounts.tasksCompleted,
          icon: 'checkmark-circle-outline' as const,
          target: 'Tasks' as const,
        },
        {
          key: 'open',
          value: openEstimate,
          icon: 'time-outline' as const,
          target: 'Tasks' as const,
        },
        {
          key: 'dueToday',
          value: data.pending.dueToday,
          icon: 'sunny-outline' as const,
          target: 'Today' as const,
        },
      ];
    }

    return [
      { key: 'tasksCompleted', value: data.counts.tasksCompleted, prev: data.previousCounts.tasksCompleted, icon: 'checkmark-circle-outline' as const, target: 'Tasks' as const },
      { key: 'tasksStarted', value: data.counts.tasksStarted, prev: data.previousCounts.tasksStarted, icon: 'play-circle-outline' as const, target: 'Tasks' as const },
      { key: 'evidenceAdded', value: data.counts.evidenceAdded, prev: data.previousCounts.evidenceAdded, icon: 'camera-outline' as const, target: 'Tasks' as const },
      { key: 'harvestsRecorded', value: data.counts.harvestsRecorded, prev: data.previousCounts.harvestsRecorded, icon: 'leaf-outline' as const, target: 'Fields' as const },
      { key: 'expensesLogged', value: data.counts.expensesLogged, prev: data.previousCounts.expensesLogged, icon: 'cash-outline' as const, target: 'Fields' as const },
      { key: 'contactsSent', value: data.counts.contactsSent, prev: data.previousCounts.contactsSent, icon: 'people-outline' as const, target: 'Partners' as const },
    ];
  }, [data, density]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.section, { color: colors.textSecondary }]}>{t('myActions.stripTitle')}</Text>
      <View style={styles.grid}>
        {tiles.map((tile) => {
          const trend =
            'prev' in tile && tile.prev !== undefined
              ? trendPercent(tile.value, tile.prev as number)
              : null;
          return (
            <TouchableOpacity
              key={tile.key}
              style={[
                styles.tile,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderLight,
                  minHeight: Math.max(88, tapMin + 40),
                  ...createElevation(colors, 'sm'),
                },
                density === 'everyday' ? styles.tileThird : styles.tileHalf,
              ]}
              onPress={() => onPressTile(tile.target)}
              accessibilityRole="button"
              accessibilityLabel={t(`myActions.tiles.${tile.key}`)}
            >
              <Ionicons name={tile.icon} size={18} color={colors.primary} />
              <Text style={[styles.value, { color: colors.textPrimary }]}>{tile.value}</Text>
              <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>
                {t(`myActions.tiles.${tile.key}`)}
              </Text>
              {trend !== null ? (
                <Text
                  style={{
                    color: trend >= 0 ? colors.success : colors.error,
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  section: {
    ...typography.styles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    gap: 4,
  },
  tileThird: { width: '31%', flexGrow: 1 },
  tileHalf: { width: '48%', flexGrow: 1 },
  value: { ...typography.styles.h3, fontWeight: '800' },
  label: { ...typography.styles.caption, fontWeight: '600' },
});

export default MyActionsStrip;
