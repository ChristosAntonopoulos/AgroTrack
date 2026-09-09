import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { startOfDay, endOfDay, subMonths, subWeeks } from 'date-fns';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { analyticsService, FieldMetrics, TaskMetrics } from '../services/analyticsService';
import { spacing, typography } from '../theme';

type Period = 'week' | 'month' | 'quarter' | 'year';

const AnalyticsScreen = () => {
  const { t } = useTranslation(['analytics', 'common', 'nav']);
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const [period, setPeriod] = useState<Period>('month');
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [fields, setFields] = useState<FieldMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const start =
      period === 'week'
        ? startOfDay(subWeeks(now, 1))
        : period === 'quarter'
          ? startOfDay(subMonths(now, 3))
          : period === 'year'
            ? startOfDay(subMonths(now, 12))
            : startOfDay(subMonths(now, 1));
    const range = { start, end: endOfDay(now) };
    void (async () => {
      setLoading(true);
      try {
        const [nextMetrics, nextFields] = await Promise.all([
          analyticsService.getTaskMetrics(range),
          analyticsService.getFieldMetrics(range),
        ]);
        setMetrics(nextMetrics);
        setFields(nextFields);
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader title={t('nav:analytics', { defaultValue: 'Analytics' })} />
      <View style={styles.row}>
        {(['week', 'month', 'quarter', 'year'] as Period[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setPeriod(item)}
            style={[
              styles.chip,
              {
                minHeight: tapMin,
                backgroundColor: period === item ? colors.primaryDark : colors.surfaceElevated,
                borderColor: period === item ? colors.primaryDark : colors.border,
              },
            ]}
          >
            <Text style={{ color: period === item ? colors.textInverse : colors.textPrimary, fontWeight: '700' }}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading || !metrics ? (
        <LoadingSpinner />
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
            <Text style={[styles.stat, { color: colors.textPrimary }]}>{metrics.total}</Text>
            <Text style={{ color: colors.textSecondary }}>{t('analytics:totalTasks', { defaultValue: 'Tasks' })}</Text>
          </View>
          <View style={styles.grid}>
            <View style={[styles.card, styles.half, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <Text style={[styles.stat, { color: colors.textPrimary }]}>{metrics.completed}</Text>
              <Text style={{ color: colors.textSecondary }}>{t('analytics:completed', { defaultValue: 'Done' })}</Text>
            </View>
            <View style={[styles.card, styles.half, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <Text style={[styles.stat, { color: colors.textPrimary }]}>{metrics.completionRate.toFixed(0)}%</Text>
              <Text style={{ color: colors.textSecondary }}>
                {t('analytics:completionRate', { defaultValue: 'Completion' })}
              </Text>
            </View>
          </View>
          <View style={styles.grid}>
            <View style={[styles.card, styles.half, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <Text style={[styles.stat, { color: colors.textPrimary }]}>{metrics.inProgress}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {t('analytics:inProgress', { defaultValue: 'In progress' })}
              </Text>
            </View>
            <View style={[styles.card, styles.half, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
              <Text style={[styles.stat, { color: colors.textPrimary }]}>{metrics.pending}</Text>
              <Text style={{ color: colors.textSecondary }}>{t('analytics:pending', { defaultValue: 'Pending' })}</Text>
            </View>
          </View>
          {fields.map((field) => (
            <View
              key={field.fieldId}
              style={[styles.rowCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{field.fieldName}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {field.completedTasks}/{field.totalTasks} · {field.completionRate.toFixed(0)}%
              </Text>
            </View>
          ))}
        </>
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing.md, justifyContent: 'center' },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  grid: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  stat: { ...typography.styles.h2, fontWeight: '800' },
  rowCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
});

export default AnalyticsScreen;
