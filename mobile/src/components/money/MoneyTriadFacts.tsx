import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatOfficialAmount, formatOfficialNet } from '../../finance/format';

type Props = {
  income: number | null | undefined;
  expenses: number | null | undefined;
  net: number | null | undefined;
  currency: string;
  locale: string;
  unknown: string;
  incomeLabel: string;
  expensesLabel: string;
  resultLabel: string;
  incomeEmpty?: string;
  netEmpty?: string;
  labelColor: string;
  valueColor: string;
  incomeColor: string;
};

/** Income / expenses / result facts. Same numbers as MoneySummaryCards, compact for peeks. */
const MoneyTriadFacts: React.FC<Props> = ({
  income,
  expenses,
  net,
  currency,
  locale,
  unknown,
  incomeLabel,
  expensesLabel,
  resultLabel,
  incomeEmpty,
  netEmpty,
  labelColor,
  valueColor,
  incomeColor,
}) => (
  <View style={styles.block}>
    <View style={styles.row}>
      <Text style={[styles.label, { color: labelColor }]}>{incomeLabel}</Text>
      <Text style={[styles.value, { color: incomeColor }]}>
        {formatOfficialAmount(income, currency, locale, incomeEmpty || unknown)}
      </Text>
    </View>
    <View style={styles.row}>
      <Text style={[styles.label, { color: labelColor }]}>{expensesLabel}</Text>
      <Text style={[styles.value, { color: valueColor }]}>
        {formatOfficialAmount(expenses, currency, locale, unknown)}
      </Text>
    </View>
    <View style={styles.row}>
      <Text style={[styles.label, { color: labelColor }]}>{resultLabel}</Text>
      <Text style={[styles.valueStrong, { color: valueColor }]}>
        {formatOfficialNet(net, currency, locale, netEmpty || unknown)}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  block: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  valueStrong: {
    fontSize: 15,
    fontWeight: '800',
  },
});

export default MoneyTriadFacts;
