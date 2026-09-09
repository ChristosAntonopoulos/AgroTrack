import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { reportsService, FieldSummaryReport, HarvestReportRecord, ProfitLossReport } from '../services/reportsService';
import { currentHarvestSeason, formatKg } from '../utils/harvestUtils';
import { spacing, typography } from '../theme';

type ReportType = 'summary' | 'harvest' | 'pnl' | 'comparison';

const formatMoney = (amount: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(amount);

const ReportsScreen = () => {
  const { t } = useTranslation(['reports', 'nav', 'fields', 'common']);
  const { colors } = useTheme();
  const { tapMin } = usePreferences();
  const season = useMemo(() => String(currentHarvestSeason()), []);
  const [type, setType] = useState<ReportType>('summary');
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<FieldSummaryReport[]>([]);
  const [harvests, setHarvests] = useState<HarvestReportRecord[]>([]);
  const [pnl, setPnl] = useState<ProfitLossReport | null>(null);
  const [compareRows, setCompareRows] = useState<
    Array<{ fieldId: string; fieldName: string; oliveKg: number; kgPerHa: number; cost: number; tasksCompleted: number }>
  >([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const query = { season };
        const [nextSummaries, nextHarvests, nextPnl, nextCompare] = await Promise.all([
          reportsService.getFieldSummaries(query).catch(() => []),
          reportsService.getHarvestRecords(query).catch(() => []),
          reportsService.getProfitLoss(query).catch(() => null),
          reportsService.getFieldComparison(query).catch(() => []),
        ]);
        setSummaries(nextSummaries);
        setHarvests(nextHarvests);
        setPnl(nextPnl);
        setCompareRows(nextCompare);
      } finally {
        setLoading(false);
      }
    })();
  }, [season]);

  const types: { id: ReportType; label: string }[] = [
    { id: 'summary', label: t('reports:fieldSummary', { defaultValue: 'Fields' }) },
    { id: 'harvest', label: t('reports:harvest', { defaultValue: 'Harvest' }) },
    { id: 'pnl', label: t('reports:profitLoss', { defaultValue: 'P&L' }) },
    { id: 'comparison', label: t('reports:comparison', { defaultValue: 'Compare' }) },
  ];

  return (
    <ScreenLayout scroll padded>
      <ScreenHeader title={t('nav:reports', { defaultValue: 'Reports' })} subtitle={season} />
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
      ) : type === 'summary' ? (
        summaries.length === 0 ? (
          <EmptyState title={t('common:empty.noData', { defaultValue: 'No data' })} />
        ) : (
          summaries.map((row) => (
            <View key={row.fieldId} style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{row.fieldName}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {formatKg(row.totalProductionKg)} kg · {formatMoney(row.totalCost)}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {row.tasksCompleted} done · {row.tasksPending} open · {row.tasksOverdue} overdue
              </Text>
            </View>
          ))
        )
      ) : type === 'harvest' ? (
        harvests.length === 0 ? (
          <EmptyState title={t('fields:thisHarvest.emptyTitle')} />
        ) : (
          harvests.map((row) => (
            <View key={row.id} style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{row.fieldName}</Text>
              <Text style={{ color: colors.textSecondary }}>
                {formatKg(row.oliveKg)} kg{row.oilKg ? ` · ${formatKg(row.oilKg)} kg oil` : ''}
              </Text>
            </View>
          ))
        )
      ) : type === 'pnl' ? (
        !pnl ? (
          <EmptyState title={t('common:empty.noData', { defaultValue: 'No data' })} />
        ) : (
          <View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated }]}>
            <Text style={{ color: colors.textSecondary }}>{t('fields:costs.received')}: {formatMoney(pnl.totalIncome)}</Text>
            <Text style={{ color: colors.textSecondary }}>{t('fields:costs.spent')}: {formatMoney(pnl.totalExpenses)}</Text>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{t('fields:thisHarvest.net')}: {formatMoney(pnl.netProfit)}</Text>
            {pnl.profitByField.map((row) => (
              <Text key={row.fieldId} style={{ color: colors.textSecondary, marginTop: spacing.xs }}>
                {row.fieldName}: {formatMoney(row.profit)}
              </Text>
            ))}
          </View>
        )
      ) : compareRows.length === 0 ? (
        <EmptyState title={t('common:empty.noData', { defaultValue: 'No data' })} />
      ) : (
        compareRows.map((row) => (
          <View key={row.fieldId} style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{row.fieldName}</Text>
            <Text style={{ color: colors.textSecondary }}>
              {formatKg(row.oliveKg)} kg · {formatMoney(row.cost)} · {row.tasksCompleted} tasks
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
