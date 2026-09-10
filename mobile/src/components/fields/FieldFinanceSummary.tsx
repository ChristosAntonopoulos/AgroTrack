import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { YearFinancialSummary } from '../../services/financialSummaryService';
import { useTheme } from '../../context/ThemeContext';
import { formatOfficialAmount, formatOfficialNet } from '../../finance/format';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import { spacing, typography } from '../../theme';

type Props = {
  summary: YearFinancialSummary | null;
  onSeeFinance: () => void;
};

const FieldFinanceSummary: React.FC<Props> = ({ summary, onSeeFinance }) => {
  const { t, i18n } = useTranslation(['fields', 'money']);
  const { colors } = useTheme();
  const locale = numberLocaleFor(i18n.language);
  const currency = summary?.currency || 'EUR';
  const unknown = t('money:unknownAmount');

  return (
    <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('overview.financeTitle')}</Text>
      <View style={styles.row}>
        <Text style={{ color: colors.textSecondary }}>{t('overview.income')}</Text>
        <Text style={{ color: colors.successDark, fontWeight: '700' }}>
          {formatOfficialAmount(summary?.totalIncome, currency, locale, unknown)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={{ color: colors.textSecondary }}>{t('overview.expenses')}</Text>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
          {formatOfficialAmount(summary?.totalExpenses, currency, locale, unknown)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={{ color: colors.textSecondary }}>{t('overview.result')}</Text>
        <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
          {formatOfficialNet(summary?.netResult, currency, locale, unknown)}
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
