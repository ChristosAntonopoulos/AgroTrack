import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { MonthlyFinancialResult } from '../../services/financialSummaryService';
import { formatOfficialNet } from '../../finance/format';
import { harvestMonthTitle, orderHarvestYearMonths } from '../../finance/harvestYear';
import { shortMonthLabel } from '../../finance/display';
import { createElevation, radii, spacing, typography } from '../../theme';

type Props = {
  year: number;
  months: MonthlyFinancialResult[];
  currency: string;
  locale: string;
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
};

const MoneyMonthStrip: React.FC<Props> = ({
  year,
  months,
  currency,
  locale,
  selectedMonth,
  onSelectMonth,
}) => {
  const { t } = useTranslation('money');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const unknown = t('unknownAmount');

  const active = useMemo(
    () => orderHarvestYearMonths(year, months).filter((item) => item.row?.hasRecords),
    [months, year]
  );

  if (!active.length) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'flat'),
        },
      ]}
      accessibilityLabel={t('monthlyAria')}
    >
      <Text style={[styles.label, { color: colors.textTertiary }]}>{t('trendTitle')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {active.map((item) => {
          const month = item.month;
          const selected = selectedMonth === month;
          const name = shortMonthLabel(item.calendarYear, month - 1, locale);
          return (
            <Pressable
              key={`${item.calendarYear}-${month}`}
              onPress={() => onSelectMonth(selected ? 0 : month)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${harvestMonthTitle(year, month, locale)}: ${formatOfficialNet(
                item.row?.netResult,
                currency,
                locale,
                unknown
              )}`}
              style={[
                styles.chip,
                {
                  minHeight: Math.max(56, tapMin),
                  borderColor: selected ? colors.oliveBorder : colors.borderLight,
                  backgroundColor: selected ? colors.primaryLight : colors.surfaceElevated,
                },
              ]}
            >
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 13 * fontScaleMultiplier,
                  color: selected ? colors.primary : colors.textPrimary,
                }}
              >
                {name}
              </Text>
              <Text
                style={{
                  fontWeight: '600',
                  fontSize: 12 * fontScaleMultiplier,
                  color: colors.textSecondary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatOfficialNet(item.row?.netResult, currency, locale, unknown)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  label: { ...typography.styles.overline },
  rail: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    minWidth: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    gap: 2,
  },
});

export default MoneyMonthStrip;
