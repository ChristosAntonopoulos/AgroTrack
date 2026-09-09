import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FieldFinancialSummary } from '../../services/financialEntryService';
import { useTheme } from '../../context/ThemeContext';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { formatSignedMoney, numberLocaleFor } from '../../utils/fieldDisplay';
import { spacing, typography } from '../../theme';

type Props = {
  summary: FieldFinancialSummary | null;
  onSeeFinance: () => void;
};

const FieldFinanceSummary: React.FC<Props> = ({ summary, onSeeFinance }) => {
  const { t, i18n } = useTranslation('fields');
  const { colors } = useTheme();
  const locale = numberLocaleFor(i18n.language);
  const currency = summary?.currency || 'EUR';
  const income = summary?.totalIncome ?? 0;
  const expenses = summary?.totalExpenses ?? 0;
  const net = summary?.net ?? income - expenses;

  return (
    <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('overview.financeTitle')}</Text>
      <View style={styles.row}>
        <Text style={{ color: colors.textSecondary }}>{t('overview.income')}</Text>
        <Text style={{ color: colors.successDark, fontWeight: '700' }}>
          + {formatChronologioMoney(income, currency, locale)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={{ color: colors.textSecondary }}>{t('overview.expenses')}</Text>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
          − {formatChronologioMoney(expenses, currency, locale)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={{ color: colors.textSecondary }}>{t('overview.result')}</Text>
        <Text style={{ color: net >= 0 ? colors.successDark : colors.textPrimary, fontWeight: '800' }}>
          {formatSignedMoney(net, currency, locale)}
        </Text>
      </View>
      <Pressable onPress={onSeeFinance} style={styles.link}>
        <Text style={[styles.linkText, { color: colors.primaryDark }]}>{t('overview.seeFinance')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  block: { borderWidth: 1, borderRadius: 14, padding: spacing.md, gap: 8 },
  title: { ...typography.styles.body, fontWeight: '800', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  link: { marginTop: spacing.xs, minHeight: 44, justifyContent: 'center' },
  linkText: { fontWeight: '700' },
});

export default FieldFinanceSummary;
