import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { YearFinancialSummary } from '../../services/financialSummaryService';
import { agriculturalYearFor } from '../../chronologio/agriculturalYear';
import {
  isProvisionalActiveYearResult,
  resultLabel as computeResultLabel,
} from '../../finance/display';
import { formatOfficialAmount, formatOfficialNet } from '../../finance/format';
import { radii, spacing, typography, createElevation } from '../../theme';

type Props = {
  summary: YearFinancialSummary;
  locale: string;
  onAddIncome?: () => void;
};

const HARVEST_INCOME = new Set(['olive_oil_sale', 'olive_sale']);

/** Result / Income / Expenses triad — mirrors web MoneySummaryGrid. */
const MoneySummaryCards: React.FC<Props> = ({ summary, locale, onAddIncome }) => {
  const { t } = useTranslation('money');
  const { colors, fontScaleMultiplier } = useTheme();
  const unknown = t('unknownAmount');
  const currency = summary.currency || 'EUR';
  const hasPosted = summary.dataAvailability.hasPostedRecords;
  const net = summary.netResult;
  const isActiveYear = summary.year === agriculturalYearFor(new Date());
  const hasHarvestIncome = useMemo(
    () =>
      (summary.incomeByCategory || []).some(
        (row) => HARVEST_INCOME.has(row.category) && row.amount > 0
      ),
    [summary.incomeByCategory]
  );
  const provisional = isProvisionalActiveYearResult(net, hasPosted, {
    isActiveYear,
    totalIncome: summary.totalIncome,
    hasHarvestIncome,
  });
  const displayLabel = provisional
    ? t('provisionalBalance')
    : isActiveYear && hasPosted && net != null
      ? computeResultLabel(net, hasPosted, locale, {
          isActiveYear,
          totalIncome: summary.totalIncome,
          hasHarvestIncome,
        })
      : summary.resultLabel || unknown;
  const incomeKicker = isActiveYear ? t('incomeToDate') : t('income');
  const expenseKicker = isActiveYear ? t('expensesToDate') : t('expenses');
  const isLoss = !provisional && hasPosted && net != null && net < 0;
  const isProfit = !provisional && hasPosted && net != null && net > 0;
  const resultColor = isLoss ? colors.eventExpense : isProfit ? colors.eventIncome : colors.textPrimary;

  return (
    <View style={styles.grid}>
      <View
        style={[
          styles.card,
          styles.resultCard,
          {
            backgroundColor: colors.surface,
            borderColor: isLoss
              ? 'rgba(153,102,45,0.28)'
              : isProfit
                ? 'rgba(54,115,77,0.25)'
                : colors.borderLight,
            ...createElevation(colors, 'sm'),
          },
        ]}
      >
        <Text style={[styles.kicker, { color: colors.textTertiary }]}>
          {provisional ? t('provisionalBalance') : t('resultYear', { year: summary.year })}
        </Text>
        <Text
          style={[
            styles.hero,
            { color: resultColor, fontSize: 34 * fontScaleMultiplier },
          ]}
        >
          {formatOfficialNet(net, currency, locale, unknown)}
        </Text>
        <View style={styles.stateRow}>
          {isLoss ? <Ionicons name="trending-down" size={16} color={colors.eventExpense} /> : null}
          {isProfit ? <Ionicons name="trending-up" size={16} color={colors.eventIncome} /> : null}
          <Text style={[styles.stateLabel, { color: colors.textSecondary }]}>{displayLabel}</Text>
        </View>
        {hasPosted ? (
          <Text style={[styles.note, { color: colors.textTertiary }]}>
            {incomeKicker} {formatOfficialAmount(summary.totalIncome, currency, locale, unknown)}
            {' − '}
            {expenseKicker} {formatOfficialAmount(summary.totalExpenses, currency, locale, unknown)}
          </Text>
        ) : null}
      </View>

      <View style={styles.split}>
        <View
          style={[
            styles.card,
            styles.half,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              ...createElevation(colors, 'flat'),
            },
          ]}
        >
          <Text style={[styles.kicker, { color: colors.textTertiary }]}>{incomeKicker}</Text>
          <Text style={[styles.value, { color: colors.eventIncome, fontSize: 22 * fontScaleMultiplier }]}>
            {formatOfficialAmount(summary.totalIncome, currency, locale, unknown)}
          </Text>
          {!hasPosted || !summary.totalIncome ? (
            <>
              <Text style={[styles.note, { color: colors.textTertiary }]}>
                {isActiveYear ? t('noIncomeYetActive') : t('noIncomeYet')}
              </Text>
              {onAddIncome ? (
                <Pressable onPress={onAddIncome} hitSlop={8}>
                  <Text style={[styles.link, { color: colors.primary }]}>{t('addIncome')}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>

        <View
          style={[
            styles.card,
            styles.half,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              ...createElevation(colors, 'flat'),
            },
          ]}
        >
          <Text style={[styles.kicker, { color: colors.textTertiary }]}>{expenseKicker}</Text>
          <Text style={[styles.value, { color: colors.eventExpense, fontSize: 22 * fontScaleMultiplier }]}>
            {formatOfficialAmount(summary.totalExpenses, currency, locale, unknown)}
          </Text>
          {hasPosted ? (
            <Text style={[styles.note, { color: colors.textTertiary }]} numberOfLines={2}>
              {t('entryCount', { count: summary.transactionCount })}
              {summary.expenseByCategory[0]
                ? ` · ${t('largestCategory')}: ${summary.expenseByCategory[0].categoryLabel}`
                : ''}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  split: { flexDirection: 'row', gap: spacing.md },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.base,
    gap: 6,
  },
  resultCard: { paddingVertical: spacing.lg },
  half: { flex: 1 },
  kicker: {
    ...typography.styles.overline,
  },
  hero: {
    fontWeight: '700',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  value: {
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stateLabel: { fontWeight: '700', fontSize: 14 },
  note: { ...typography.styles.caption, lineHeight: 18 },
  link: { fontWeight: '700', fontSize: 14, marginTop: 2 },
});

export default MoneySummaryCards;
