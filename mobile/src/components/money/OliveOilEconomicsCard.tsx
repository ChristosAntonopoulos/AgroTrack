import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { OliveOilEconomics } from '../../services/financialSummaryService';
import { formatEuroPerLitre, formatLitres } from '../../finance/format';
import { harvestYearSpan } from '../../finance/harvestYear';
import { spacing, typography } from '../../theme';

type Props = {
  year: number;
  oil: OliveOilEconomics;
  locale: string;
  embedded?: boolean;
};

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.fact}>
      <Text style={[styles.dt, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.dd, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
};

const OliveOilEconomicsCard: React.FC<Props> = ({ year, oil, locale, embedded = false }) => {
  const { t } = useTranslation('money');
  const { colors } = useTheme();
  if (!oil.hasProductionOrSales) return null;
  const dash = '—';

  return (
    <View style={styles.wrap}>
      {!embedded ? (
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('oliveOilYear', { span: harvestYearSpan(year) })}
        </Text>
      ) : null}
      <View style={styles.grid}>
        <Fact label={t('produced')} value={formatLitres(oil.producedLitres, locale, dash)} />
        <Fact label={t('sold')} value={formatLitres(oil.soldLitres, locale, dash)} />
        <Fact
          label={t('remaining')}
          value={oil.remainingIsConfirmed ? formatLitres(oil.remainingLitres, locale, dash) : dash}
        />
        <Fact
          label={t('averagePrice')}
          value={formatEuroPerLitre(oil.averageSalePricePerLitre, locale, dash)}
        />
        <Fact
          label={t('costPerLitre')}
          value={formatEuroPerLitre(oil.productionCostPerLitre, locale, dash)}
        />
        <Fact
          label={t('resultPerLitre')}
          value={formatEuroPerLitre(oil.resultPerLitre, locale, dash)}
        />
      </View>
      {oil.productionCostMessage ? (
        <Text style={[styles.note, { color: colors.textTertiary }]}>{oil.productionCostMessage}</Text>
      ) : null}
      {oil.averagePriceMessage ? (
        <Text style={[styles.note, { color: colors.textTertiary }]}>{oil.averagePriceMessage}</Text>
      ) : null}
      {oil.remainingMessage ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>{oil.remainingMessage}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontWeight: '700', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fact: { width: '30%', minWidth: 92, gap: 2 },
  dt: { ...typography.styles.overline },
  dd: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  note: { ...typography.styles.caption, lineHeight: 18 },
});

export default OliveOilEconomicsCard;
