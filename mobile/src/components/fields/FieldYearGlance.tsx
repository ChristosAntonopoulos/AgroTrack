import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FieldYearSummary, YearFinancialSummary } from '../../services/financialSummaryService';
import { useTheme } from '../../context/ThemeContext';
import {
  formatEuroPerLitre,
  formatLitres,
  formatOfficialAmount,
  perAreaForDisplay,
} from '../../finance/format';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import { typography } from '../../theme';
import FieldOverviewCard from './FieldOverviewCard';
import MoneyTriadFacts from '../money/MoneyTriadFacts';

type Props = {
  year: number;
  costSummary: YearFinancialSummary | null;
  yearRollup: FieldYearSummary | null;
  plannedRemaining: number;
  onSeeFinance: () => void;
};

const formatKg = (value: number | null | undefined, locale: string, unknown: string): string => {
  if (value == null) return unknown;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} kg`;
};

/**
 * Year glance — same data as web FieldYearGlance (work, harvest, money).
 */
const FieldYearGlance: React.FC<Props> = ({
  year,
  costSummary,
  yearRollup,
  plannedRemaining,
  onSeeFinance,
}) => {
  const { t, i18n } = useTranslation(['fields', 'money']);
  const { colors } = useTheme();
  const locale = numberLocaleFor(i18n.language);
  const currency = costSummary?.currency || yearRollup?.currency || 'EUR';
  const unknown = t('money:unknownAmount');
  const availability = costSummary?.dataAvailability || yearRollup?.dataAvailability;
  const hasPosted = Boolean(availability?.hasPostedRecords);
  const income = availability?.incomeIsUnknown ? null : costSummary?.totalIncome ?? yearRollup?.totalIncome;
  const expenses = availability?.expensesAreUnknown
    ? null
    : costSummary?.totalExpenses ?? yearRollup?.totalExpenses;
  const net =
    income == null && expenses == null ? null : costSummary?.netResult ?? yearRollup?.netResult;
  const oliveKg = yearRollup?.oliveKilograms ?? null;
  const oilLitres = yearRollup?.oliveOil?.producedLitres ?? null;
  const costPerHa = costSummary?.costPerHectare ?? null;
  const costPerArea = perAreaForDisplay(costPerHa, i18n.language);
  const costPerLitre = yearRollup?.oliveOil?.productionCostPerLitre ?? null;
  const showPerHa = hasPosted && costPerArea != null && !availability?.areaIsMissing;
  const showPerLitre = hasPosted && costPerLitre != null && oilLitres != null;

  return (
    <FieldOverviewCard accentColor={colors.primary}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('fields:overview.yearGlance.title')}
      </Text>

      <View style={styles.grid}>
        <Metric
          label={t('fields:overview.completedWork')}
          value={yearRollup ? String(yearRollup.completedExecutionCount) : unknown}
          colors={colors}
        />
        <Metric
          label={t('fields:overview.yearGlance.plannedRemaining')}
          value={String(plannedRemaining)}
          colors={colors}
        />
        <Metric
          label={t('fields:overview.yearGlance.harvest')}
          value={
            oliveKg == null
              ? t('fields:overview.yearGlance.noHarvest', { year })
              : formatKg(oliveKg, locale, unknown)
          }
          colors={colors}
        />
        <Metric
          label={t('fields:overview.yearGlance.oil')}
          value={formatLitres(oilLitres, locale, unknown)}
          colors={colors}
        />
      </View>

      {hasPosted ? (
        <View style={[styles.moneyBlock, { borderTopColor: colors.borderLight }]}>
          <MoneyTriadFacts
            income={income}
            expenses={expenses}
            net={net}
            currency={currency}
            locale={locale}
            unknown={unknown}
            incomeLabel={t('fields:overview.income')}
            expensesLabel={t('fields:overview.expenses')}
            resultLabel={t('fields:overview.result')}
            labelColor={colors.textSecondary}
            valueColor={colors.textPrimary}
            incomeColor={colors.successDark}
          />
          {showPerHa ? (
            <View style={styles.moneyRow}>
              <Text style={[styles.moneyLabel, { color: colors.textSecondary }]}>
                {t('fields:overview.yearGlance.perHectare')}
              </Text>
              <Text style={[styles.moneyValue, { color: colors.textPrimary }]}>
                {formatOfficialAmount(costPerArea, currency, locale, unknown)}
              </Text>
            </View>
          ) : null}
          {showPerLitre ? (
            <View style={styles.moneyRow}>
              <Text style={[styles.moneyLabel, { color: colors.textSecondary }]}>
                {t('fields:overview.yearGlance.perLitre')}
              </Text>
              <Text style={[styles.moneyValue, { color: colors.textPrimary }]}>
                {formatEuroPerLitre(costPerLitre, locale, unknown)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={[styles.emptyMoney, { color: colors.textSecondary }]}>
          {t('fields:overview.yearGlance.noMoney', { year })}
        </Text>
      )}

      <Pressable onPress={onSeeFinance} style={styles.link} hitSlop={6}>
        <Text style={[styles.linkText, { color: colors.primary }]}>
          {t('fields:overview.seeFinance')}
        </Text>
      </Pressable>
    </FieldOverviewCard>
  );
};

const Metric = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { textSecondary: string; textPrimary: string };
}) => (
  <View style={styles.metric}>
    <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={2}>
      {label}
    </Text>
    <Text style={[styles.metricValue, { color: colors.textPrimary }]} numberOfLines={2}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  title: {
    ...typography.styles.body,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    width: '47%',
    flexGrow: 1,
    gap: 2,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  moneyBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 8,
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  moneyLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  moneyValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyMoney: {
    fontSize: 13,
    lineHeight: 18,
  },
  link: {
    minHeight: 40,
    justifyContent: 'center',
  },
  linkText: {
    fontWeight: '700',
    fontSize: 14,
  },
});

export default FieldYearGlance;
