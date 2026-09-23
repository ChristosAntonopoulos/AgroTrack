import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { spacing, radii, createElevation } from '../../theme';
import type {
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { periodEventCount } from '../../utils/summaryFacts';
import {
  comparisonDriverMonths,
  costPerOilKg,
  fairYearPair,
  yearComparisonCopyKey,
  yearComparisonInsights,
} from '../../chronologio/yearPresentation';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';

type Props = {
  left: ChronologioPeriodSummary | null;
  right: ChronologioPeriodSummary | null;
  leftMonths: ChronologioMonthSummary[];
  rightMonths: ChronologioMonthSummary[];
  leftYear: number;
  rightYear: number;
  availableYears: number[];
  numberLocale: string;
  fieldNames: string[];
  onChangeYears: (pair: [number, number]) => void;
  onOpenMonth?: (year: number, month: number) => void;
  onClose: () => void;
};

const ChronologioComparePanel: React.FC<Props> = ({
  left,
  right,
  leftMonths,
  rightMonths,
  leftYear,
  rightYear,
  availableYears,
  numberLocale,
  fieldNames,
  onChangeYears,
  onOpenMonth,
  onClose,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors } = useTheme();
  const { tapMin } = usePreferences();

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'short', timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2020, i, 1))));
  }, [i18n.language]);

  const insights = yearComparisonInsights(left, right, {
    currentMonths:
      left && right && left.periodYear >= right.periodYear ? leftMonths : rightMonths,
    previousMonths:
      left && right && left.periodYear >= right.periodYear ? rightMonths : leftMonths,
  });
  const liveYear = agriculturalYearFor(new Date());
  const comparesLive = leftYear === liveYear || rightYear === liveYear;
  const newerIsLeft = (left?.periodYear ?? leftYear) >= (right?.periodYear ?? rightYear);
  const newerSummary = newerIsLeft ? left : right;
  const olderSummary = newerIsLeft ? right : left;
  const newerMonths = newerIsLeft ? leftMonths : rightMonths;
  const olderMonths = newerIsLeft ? rightMonths : leftMonths;
  const newerYear = newerIsLeft ? (left?.periodYear ?? leftYear) : (right?.periodYear ?? rightYear);
  const olderYear = newerIsLeft ? (right?.periodYear ?? rightYear) : (left?.periodYear ?? leftYear);
  const fair = fairYearPair(newerSummary, olderSummary, {
    currentMonths: newerMonths,
    previousMonths: olderMonths,
  });
  const currency = left?.currency || right?.currency || 'EUR';
  const currentCost = fair ? costPerOilKg(fair.current.expenseTotal, fair.current.oilKg) : null;
  const previousCost = fair ? costPerOilKg(fair.previous.expenseTotal, fair.previous.oilKg) : null;
  const costForYear = (year: number): number | null => {
    if (!fair) return null;
    if (year === fair.current.periodYear) return currentCost;
    if (year === fair.previous.periodYear) return previousCost;
    return null;
  };
  const formatCost = (value: number | null) =>
    value == null ? '—' : formatChronologioMoney(value, currency, numberLocale);
  const drivers = comparisonDriverMonths(newerMonths, olderMonths, newerYear, olderYear);

  const rows = [
    ...(left?.expenseTotal || right?.expenseTotal
      ? [
          {
            label: t('yearSummary.expenses'),
            a:
              left?.expenseTotal && left.expenseTotal > 0
                ? formatChronologioMoney(left.expenseTotal, left.currency || 'EUR', numberLocale)
                : '—',
            b:
              right?.expenseTotal && right.expenseTotal > 0
                ? formatChronologioMoney(right.expenseTotal, right.currency || 'EUR', numberLocale)
                : '—',
          },
        ]
      : []),
    ...(left?.oliveKg || right?.oliveKg
      ? [
          {
            label: t('yearSummary.harvestKg', { defaultValue: 'Harvest' }),
            a:
              left?.oliveKg && left.oliveKg > 0
                ? `${Math.round(left.oliveKg).toLocaleString(numberLocale)} kg`
                : '—',
            b:
              right?.oliveKg && right.oliveKg > 0
                ? `${Math.round(right.oliveKg).toLocaleString(numberLocale)} kg`
                : '—',
          },
        ]
      : []),
    ...(left?.oilKg || right?.oilKg
      ? [
          {
            label: t('yearSummary.oilKg', { defaultValue: 'Oil' }),
            a:
              left?.oilKg && left.oilKg > 0
                ? `${Math.round(left.oilKg).toLocaleString(numberLocale)} kg`
                : '—',
            b:
              right?.oilKg && right.oilKg > 0
                ? `${Math.round(right.oilKg).toLocaleString(numberLocale)} kg`
                : '—',
          },
        ]
      : []),
    ...(currentCost != null || previousCost != null
      ? [
          {
            label: t('yearView.compare.costPerKg'),
            a: formatCost(costForYear(leftYear)),
            b: formatCost(costForYear(rightYear)),
          },
        ]
      : []),
    ...(left?.oilYieldPercent != null || right?.oilYieldPercent != null
      ? [
          {
            label: t('living.yield', { defaultValue: 'Yield' }),
            a: left?.oilYieldPercent != null ? `${left.oilYieldPercent}%` : '—',
            b: right?.oilYieldPercent != null ? `${right.oilYieldPercent}%` : '—',
          },
        ]
      : []),
    ...(left?.taskCount || right?.taskCount
      ? [
          {
            label: t('yearSummary.completedWorks'),
            a: left?.taskCount ? String(left.taskCount) : '—',
            b: right?.taskCount ? String(right.taskCount) : '—',
          },
        ]
      : []),
  ];

  const YearPicker = ({
    value,
    onPick,
    label,
  }: {
    value: number;
    onPick: (y: number) => void;
    label: string;
  }) => (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {availableYears.map((y) => {
          const active = y === value;
          return (
            <Pressable
              key={`${label}-${y}`}
              onPress={() => onPick(y)}
              style={[
                styles.yearChip,
                {
                  borderColor: active ? colors.oliveBorder : colors.borderLight,
                  backgroundColor: active ? colors.primaryLight : colors.surface,
                  minHeight: Math.max(tapMin, 40),
                },
              ]}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: active ? '800' : '600' }}>
                {y}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const spine = (months: ChronologioMonthSummary[]) =>
    monthNames.map((name, idx) => {
      const month = idx + 1;
      const hit = months.find((m) => m.month === month);
      const count = hit ? periodEventCount(hit) : 0;
      return (
        <View key={name} style={styles.spineRow}>
          <Text style={{ color: colors.textSecondary, width: 36, fontSize: 12 }}>{name}</Text>
          <View
            style={[
              styles.spineBar,
              {
                backgroundColor: count > 0 ? colors.primary : colors.borderLight,
                opacity: count > 0 ? 0.75 : 1,
                width: Math.min(120, 8 + count * 10),
              },
            ]}
          />
          <Text style={{ color: colors.textTertiary, fontSize: 11 }}>{count || '—'}</Text>
        </View>
      );
    });

  return (
                <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'flat'),
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}>
          {t('living.compare')}
        </Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('living.closeCompare')}</Text>
        </Pressable>
      </View>

      <View style={styles.pickers}>
        <YearPicker
          value={leftYear}
          label={t('living.compareLeft')}
          onPick={(y) => onChangeYears([y, rightYear])}
        />
        <YearPicker
          value={rightYear}
          label={t('living.compareRight')}
          onPick={(y) => onChangeYears([leftYear, y])}
        />
      </View>

      {rows.map((row) => (
        <View key={row.label} style={[styles.metricRow, { borderBottomColor: colors.borderLight }]}>
          <Text style={{ color: colors.textSecondary, flex: 1 }}>{row.label}</Text>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', width: '28%', textAlign: 'right' }}>
            {row.a}
          </Text>
          <Text style={{ color: colors.textPrimary, fontWeight: '700', width: '28%', textAlign: 'right' }}>
            {row.b}
          </Text>
        </View>
      ))}

      <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
        {fieldNames.length === 1
          ? t('yearView.compare.fieldsOne', { field: fieldNames[0] })
          : fieldNames.length > 1
            ? t('yearView.compare.fieldsAll', { fields: fieldNames.join(' · ') })
            : t('yearView.compare.fieldsEvery')}
      </Text>
      {comparesLive ? (
        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
          {t('yearView.compare.inProgress', { year: liveYear })}
        </Text>
      ) : null}
      {currentCost != null && previousCost != null && fair ? (
        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
          {t(currentCost >= previousCost ? 'yearView.compare.costUp' : 'yearView.compare.costDown', {
            context: fair.scope === 'ytd' ? 'ytd' : undefined,
            amount: formatChronologioMoney(
              Math.abs(currentCost - previousCost),
              currency,
              numberLocale
            ),
            year: fair.previous.periodYear,
          })}
        </Text>
      ) : null}
      {insights.map((comparison) => (
        <Text
          key={comparison.kind}
          style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', lineHeight: 20 }}
        >
          {t(yearComparisonCopyKey(comparison), {
            context: comparison.scope === 'ytd' ? 'ytd' : undefined,
            pct: Math.abs(comparison.percent).toLocaleString(numberLocale),
            points: comparison.percent.toLocaleString(numberLocale, {
              signDisplay: 'exceptZero',
              maximumFractionDigits: 1,
            }),
            year: comparison.previousYear,
          })}
        </Text>
      ))}
      {drivers.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
            {t('yearView.compare.drivers')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {drivers.map((link) => (
              <Pressable
                key={`${link.year}-${link.month}`}
                onPress={() => onOpenMonth?.(link.year, link.month)}
                style={[
                  styles.yearChip,
                  {
                    borderColor: colors.borderLight,
                    backgroundColor: colors.surfaceMuted,
                    minHeight: Math.max(tapMin, 36),
                  },
                ]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
                  {new Date(Date.UTC(link.year, link.month - 1, 1)).toLocaleDateString(i18n.language, {
                    month: 'short',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                  {' · '}
                  {link.metric === 'oil'
                    ? `${link.amount.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} kg`
                    : formatChronologioMoney(link.amount, currency, numberLocale)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.spines}>
        <View style={{ flex: 1 }}>{spine(leftMonths)}</View>
        <View style={{ flex: 1 }}>{spine(rightMonths)}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 12,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickers: { flexDirection: 'row', gap: 12 },
  yearChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    justifyContent: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spines: { flexDirection: 'row', gap: 16, marginTop: 4 },
  spineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  spineBar: { height: 6, borderRadius: 3 },
});

export default ChronologioComparePanel;
