import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { FinancialTransaction } from '../../services/financialTransactionService';
import {
  financialCategoryLabel,
  financialStatusLabel,
  isRawFinancialValue,
  unassignedFieldLabel,
} from '../../finance/display';
import { formatOfficialAmount } from '../../finance/format';
import { formatQuantityLine } from '../../finance/moneyUi';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { radii, spacing, typography, createElevation, motion } from '../../theme';

type Props = {
  item: FinancialTransaction;
  locale: string;
  fieldNames: Record<string, string>;
  unknown: string;
  onOpen: (item: FinancialTransaction) => void;
};

const iconFor = (category?: string): React.ComponentProps<typeof Ionicons>['name'] => {
  if (category === 'fuel_and_energy') return 'flash-outline';
  if (category === 'fertilizers') return 'leaf-outline';
  if (category === 'olive_oil_sale' || category === 'irrigation') return 'water-outline';
  if (category === 'labor') return 'people-outline';
  if (category === 'harvest' || category === 'olive_sale') return 'basket-outline';
  return 'wallet-outline';
};

/** Signed ledger row — mirrors web FinancialTransactionRow. */
const MoneyTransactionRow: React.FC<Props> = ({
  item,
  locale,
  fieldNames,
  unknown,
  onOpen,
}) => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const category = item.category
    ? item.categoryLabel && !isRawFinancialValue(item.categoryLabel)
      ? item.categoryLabel
      : financialCategoryLabel(item.category, locale)
    : null;
  const field = item.fieldId
    ? fieldNames[item.fieldId] || friendlyFieldLabel(item.fieldId)
    : unassignedFieldLabel(locale);
  const qty = formatQuantityLine(item.quantity, item.quantityUnit, item.unitPrice, locale);
  const date = new Date(item.occurredOn).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
  const sign = item.type === 'income' ? '+' : '−';
  const showStatus = item.status === 'draft' || item.status === 'void';
  const amountColor = item.type === 'income' ? colors.eventIncome : colors.textPrimary;

  return (
    <Pressable
      onPress={() => onOpen(item)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          minHeight: Math.max(64, tapMin),
          opacity: pressed ? motion.pressOpacity : 1,
          ...createElevation(colors, 'flat'),
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor:
              item.type === 'income' ? colors.eventIncomeSoft : colors.eventExpenseSoft,
          },
        ]}
      >
        <Ionicons
          name={iconFor(item.category)}
          size={18}
          color={item.type === 'income' ? colors.eventIncome : colors.eventExpense}
        />
      </View>
      <View style={styles.body}>
        <Text
          style={[styles.title, { color: colors.textPrimary, fontSize: 15 * fontScaleMultiplier }]}
          numberOfLines={1}
        >
          {item.description}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[category, field].filter(Boolean).join(' · ')}
        </Text>
        {qty ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {qty}
          </Text>
        ) : null}
        {showStatus ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  item.status === 'draft' ? colors.primaryLight : colors.errorLight,
              },
            ]}
          >
            <Text
              style={{
                color: item.status === 'draft' ? colors.primary : colors.errorDark,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {financialStatusLabel(item.status, locale)}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            { color: amountColor, fontSize: 16 * fontScaleMultiplier },
          ]}
        >
          {sign}
          {formatOfficialAmount(item.amount, item.currency, locale, unknown)}
        </Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>{date}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontWeight: '600' },
  meta: { ...typography.styles.caption },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: {
    fontWeight: '700',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  date: { ...typography.styles.caption, fontSize: 11 },
});

export default MoneyTransactionRow;
