import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import {
  reportsService,
  FieldSummaryReport,
  FieldMonthlyWeather,
  FieldYearlyOperations,
} from '../services/reportsService';
import { currentHarvestSeason, formatKg } from '../utils/harvestUtils';
import { spacing } from '../theme';

type ReportType = 'weather-month' | 'weather-year' | 'year-overview';

const formatMoney = (amount: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);

const formatHa = (area: number) =>
  `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(area)} ha`;

const formatMm = (mm: number) =>
  `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(mm)} mm`;

const ReportsScreen = () => {
  const { t } = useTranslation(['nav', 'fields', 'common']);
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const season = useMemo(() => String(currentHarvestSeason()), []);
  const month = useMemo(() => new Date().getMonth() + 1, []);
  const [type, setType] = useState<ReportType>('weather-month');
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<FieldSummaryReport[]>([]);
  const [monthly, setMonthly] = useState<FieldMonthlyWeather[]>([]);
  const [yearly, setYearly] = useState<FieldYearlyOperations[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const query = { season };
        const [nextSummaries, nextMonthly, nextYearly] = await Promise.all([
          reportsService.getFieldSummaries(query).catch(() => []),
          reportsService.getMonthlyWeather({ ...query, month }).catch(() => ({ fields: [] })),
          reportsService.getYearlyWeather(query).catch(() => ({ fields: [] })),
        ]);
        setSummaries(nextSummaries);
        setMonthly(nextMonthly.fields ?? []);
        setYearly(nextYearly.fields ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [season, month]);

  const types: { id: ReportType; label: string }[] = [
    { id: 'weather-month', label: t('nav:weatherMonth', { defaultValue: 'Month weather' }) },
    { id: 'weather-year', label: t('nav:weatherYear', { defaultValue: 'Year & work' }) },
    { id: 'year-overview', label: t('nav:yearOverview', { defaultValue: 'Year report' }) },
  ];

  const monthName = new Date(Number(season), month - 1, 1).toLocaleDateString(undefined, { month: 'long' });

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader title={t('nav:reports', { defaultValue: 'Reports' })} subtitle={`${season} · ${monthName}`} />
      <View style={styles.row}>
        {types.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setType(item.id)}
            style={[
              styles.chip,
              {
                minHeight: tapMin,
                backgroundColor: type === item.id ? colors.primaryDark : colors.surfaceElevated,
                borderColor: type === item.id ? colors.primaryDark : colors.border,
              },
            ]}
          >
            <Text style={{ color: type === item.id ? colors.textInverse : colors.textPrimary, fontWeight: '700' }}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <LoadingSpinner />
      ) : type === 'weather-month' ? (
        monthly.length === 0 ? (
          <EmptyState title={t('common:empty.noData', { defaultValue: 'No data' })} />
        ) : (
          monthly.map((row) => (
            <View key={row.fieldId} style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{row.fieldName}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {formatHa(row.areaHa)} · {formatMm(row.rainTotalMm)}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                Frost {row.frostNights} · Heat {row.heatDays} · Heavy rain {row.heavyRainDays} · Dry {row.longestDryStreakDays}d
              </Text>
            </View>
          ))
        )
      ) : type === 'weather-year' ? (
        yearly.length === 0 ? (
          <EmptyState title={t('common:empty.noData', { defaultValue: 'No data' })} />
        ) : (
          yearly.map((row) => (
            <View key={row.fieldId} style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{row.fieldName}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {formatMm(row.rainTotalMm)} · {formatMoney(row.totalCost)} · {formatMoney(row.profit)}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {row.tasksCompleted} done · {row.tasksPending} open · {row.tasksOverdue} overdue
              </Text>
            </View>
          ))
        )
      ) : summaries.length === 0 ? (
        <EmptyState title={t('common:empty.noData', { defaultValue: 'No data' })} />
      ) : (
        summaries.map((row) => (
          <View key={row.fieldId} style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{row.fieldName}</Text>
            <Text style={{ color: colors.textSecondary }}>
              {formatHa(row.areaHa)} · {formatKg(row.totalProductionKg)} kg · {formatMoney(row.totalCost)}
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {row.tasksCompleted} done · {row.tasksPending} open · {row.tasksOverdue} overdue
            </Text>
          </View>
        ))
      )}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing.md, justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, gap: 4 },
  name: { fontWeight: '800' },
});

export default ReportsScreen;
