import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FieldOverviewDto } from '../../services/fieldOverviewService';
import { useTheme } from '../../context/ThemeContext';
import { formatLitres } from '../../finance/format';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import { typography } from '../../theme';
import FieldOverviewCard from './FieldOverviewCard';
import MoneyTriadFacts from '../money/MoneyTriadFacts';

type Props = {
  overview: FieldOverviewDto;
  onSeeFinance: () => void;
  canViewMoney?: boolean;
};

const formatKg = (value: number, locale: string): string =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} kg`;

/**
 * Year glance from canonical Field Overview DTO only (FIELD_OVERVIEW_SOURCES.md).
 */
const FieldYearGlance: React.FC<Props> = ({ overview, onSeeFinance, canViewMoney = true }) => {
  const { t, i18n } = useTranslation(['fields', 'money', 'myOil']);
  const { colors } = useTheme();
  const locale = numberLocaleFor(i18n.language);
  const { production, money, cropYear } = overview;
  const currency = money.currency || 'EUR';
  const unknown = t('money:unknownAmount');

  return (
    <FieldOverviewCard accentColor={colors.primary}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t('fields:overview.yearGlance.title')}
      </Text>

      <Text style={[styles.group, { color: colors.textSecondary }]}>
        {t('fields:overview.yearGlance.production', { defaultValue: 'Παραγωγή' })}
      </Text>
      <View style={styles.grid}>
        <Metric
          label={t('fields:overview.yearGlance.harvest')}
          value={
            production.harvestOliveKg > 0
              ? formatKg(production.harvestOliveKg, locale)
              : t('fields:overview.yearGlance.noHarvest', { year: cropYear.id })
          }
          colors={colors}
        />
        <Metric
          label={t('fields:overview.yearGlance.oilProduced', { defaultValue: 'Παραγόμενο λάδι' })}
          value={
            production.hasOilEntries || production.oilProducedLitres > 0
              ? formatLitres(production.oilProducedLitres, locale, unknown)
              : t('fields:overview.yearGlance.noOilYet', { defaultValue: '—' })
          }
          colors={colors}
        />
        <Metric
          label={t('fields:overview.yearGlance.inCellarNow', { defaultValue: 'Στο κελάρι τώρα' })}
          value={
            production.oilCurrentlyInCellarLitres > 0.05
              ? formatLitres(production.oilCurrentlyInCellarLitres, locale, unknown)
              : '—'
          }
          colors={colors}
        />
      </View>

      {canViewMoney ? (
        <>
          <Text style={[styles.group, { color: colors.textSecondary }]}>
            {t('fields:overview.yearGlance.money', { defaultValue: 'Χρήματα' })}
          </Text>
          <MoneyTriadFacts
            income={money.postedIncome}
            expenses={money.postedExpense}
            net={money.result}
            currency={currency}
            locale={locale}
            unknown={unknown}
            incomeLabel={t('money:income')}
            expensesLabel={t('money:expenses')}
            resultLabel={t('money:result')}
            labelColor={colors.textSecondary}
            valueColor={colors.textPrimary}
            incomeColor={colors.primary}
          />
          <Pressable onPress={onSeeFinance} accessibilityRole="button">
            <Text style={{ color: colors.primary, marginTop: 8 }}>
              {t('fields:overview.yearGlance.openMoney', { defaultValue: 'Άνοιγμα Χρημάτων' })}
            </Text>
          </Pressable>
        </>
      ) : null}
    </FieldOverviewCard>
  );
};

const Metric: React.FC<{
  label: string;
  value: string;
  colors: { textPrimary: string; textSecondary: string };
}> = ({ label, value, colors }) => (
  <View style={styles.metric}>
    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  title: { ...typography.subtitle, marginBottom: 8 },
  group: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  grid: { gap: 8 },
  metric: { marginBottom: 4 },
  metricLabel: { fontSize: 12 },
  metricValue: { fontSize: 16, fontWeight: '600' },
});

export default FieldYearGlance;
