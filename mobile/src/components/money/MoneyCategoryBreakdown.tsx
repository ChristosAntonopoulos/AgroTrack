import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { CategoryFinancialResult } from '../../services/financialSummaryService';
import { formatOfficialAmount } from '../../finance/format';
import { spacing, typography, radii } from '../../theme';

type RankedProps = {
  title: string;
  rows: CategoryFinancialResult[];
  currency: string;
  locale: string;
  fillColor: string;
  onSelectCategory: (category: string) => void;
};

const RankedList: React.FC<RankedProps> = ({
  title,
  rows,
  currency,
  locale,
  fillColor,
  onSelectCategory,
}) => {
  const { t } = useTranslation('money');
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const [showAll, setShowAll] = useState(false);
  if (!rows.length) return null;
  const visible = showAll ? rows : rows.slice(0, 5);

  return (
    <View style={styles.block}>
      <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{title}</Text>
      {visible.map((row) => (
        <Pressable
          key={row.category}
          onPress={() => onSelectCategory(row.category)}
          accessibilityRole="button"
          style={[styles.category, { minHeight: tapMin * 0.85 }]}
        >
          <View style={styles.barMeta}>
            <Text
              style={{ color: colors.textPrimary, flex: 1, fontSize: 14 * fontScaleMultiplier }}
              numberOfLines={1}
            >
              {row.categoryLabel || row.category}
            </Text>
            <Text style={{ fontWeight: '700', color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
              {formatOfficialAmount(row.amount, currency, locale, '—')}
              {row.percentageOfTotal != null ? ` · ${Math.round(row.percentageOfTotal)}%` : ''}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.max(6, row.percentageOfTotal || 0)}%`,
                  backgroundColor: fillColor,
                },
              ]}
            />
          </View>
        </Pressable>
      ))}
      {rows.length > 5 ? (
        <Pressable onPress={() => setShowAll((value) => !value)} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '700', marginTop: spacing.sm }}>
            {showAll ? t('showLess') : t('showAll')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

type Props = {
  expenses: CategoryFinancialResult[];
  income: CategoryFinancialResult[];
  currency: string;
  locale: string;
  onSelectCategory: (category: string) => void;
  expensesOnly?: boolean;
};

const MoneyCategoryBreakdown: React.FC<Props> = ({
  expenses,
  income,
  currency,
  locale,
  onSelectCategory,
  expensesOnly = false,
}) => {
  const { t } = useTranslation('money');
  const { colors } = useTheme();
  if (!expenses.length && (expensesOnly || !income.length)) return null;

  return (
    <View style={styles.stack}>
      <RankedList
        title={t('moneyWent')}
        rows={expenses}
        currency={currency}
        locale={locale}
        fillColor={colors.eventExpense}
        onSelectCategory={onSelectCategory}
      />
      {!expensesOnly ? (
        <RankedList
          title={t('incomeCategories')}
          rows={income}
          currency={currency}
          locale={locale}
          fillColor={colors.eventIncome}
          onSelectCategory={onSelectCategory}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  block: { gap: 4 },
  sectionLabel: { ...typography.styles.overline, marginBottom: spacing.sm },
  category: { gap: 6, marginBottom: spacing.sm, justifyContent: 'center' },
  barMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  track: { height: 6, borderRadius: radii.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.full },
});

export default MoneyCategoryBreakdown;
