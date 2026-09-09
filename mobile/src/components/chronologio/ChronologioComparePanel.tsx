import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { usePreferences } from '../../context/PreferencesContext';
import { spacing } from '../../theme';
import type {
  ChronologioMonthSummary,
  ChronologioPeriodSummary,
} from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { periodEventCount } from '../../utils/summaryFacts';

type Props = {
  left: ChronologioPeriodSummary | null;
  right: ChronologioPeriodSummary | null;
  leftMonths: ChronologioMonthSummary[];
  rightMonths: ChronologioMonthSummary[];
  leftYear: number;
  rightYear: number;
  availableYears: number[];
  numberLocale: string;
  onChangeYears: (pair: [number, number]) => void;
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
  onChangeYears,
  onClose,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors } = useTheme();
  const { tapMin } = usePreferences();

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: 'short', timeZone: 'UTC' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2020, i, 1))));
  }, [i18n.language]);

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
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary + '22' : 'transparent',
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
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 }}>
          {t('living.compare')}
        </Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('living.closeCompare')}</Text>
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

      <View style={styles.spines}>
        <View style={{ flex: 1 }}>{spine(leftMonths)}</View>
        <View style={{ flex: 1 }}>{spine(rightMonths)}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickers: { flexDirection: 'row', gap: 12 },
  yearChip: {
    borderWidth: 1,
    borderRadius: 999,
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
  spines: { flexDirection: 'row', gap: 16, marginTop: 8 },
  spineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  spineBar: { height: 8, borderRadius: 4 },
});

export default ChronologioComparePanel;
