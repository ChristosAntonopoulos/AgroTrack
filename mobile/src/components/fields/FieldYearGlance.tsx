import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { FieldOverviewDto } from '../../services/fieldOverviewService';
import { useTheme } from '../../context/ThemeContext';
import { formatLitres } from '../../finance/format';
import { numberLocaleFor } from '../../utils/fieldDisplay';
import { createElevation, radii, spacing } from '../../theme';

type Props = {
  overview: FieldOverviewDto;
  onSeeFinance: () => void;
  canViewMoney?: boolean;
};

const formatKg = (value: number, locale: string): string =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)} kg`;

/** Compact 3-metric year bar for mobile overview. */
const FieldYearGlance: React.FC<Props> = ({ overview, onSeeFinance, canViewMoney = true }) => {
  const { t, i18n } = useTranslation(['fields', 'money']);
  const { colors, tapMin } = useTheme();
  const locale = numberLocaleFor(i18n.language);
  const { production, money } = overview;
  const unknown = t('money:unknownAmount');

  const harvest =
    production.harvestOliveKg > 0 ? formatKg(production.harvestOliveKg, locale) : '—';
  const oil =
    production.hasOilEntries || production.oilProducedLitres > 0
      ? formatLitres(production.oilProducedLitres, locale, unknown)
      : '—';
  const stock =
    production.oilCurrentlyInCellarLitres > 0.05
      ? formatLitres(production.oilCurrentlyInCellarLitres, locale, unknown)
      : '—';

  const showNet =
    canViewMoney && !(money.result === 0 && money.postedIncome === 0 && money.postedExpense === 0);
  const netLabel = showNet
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: money.currency || 'EUR',
        maximumFractionDigits: 0,
      }).format(money.result)
    : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <View style={styles.head}>
        <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('fields:overview.yearGlance.titleShort', { defaultValue: 'Η χρονιά' })}
        </Text>
        {canViewMoney ? (
          <Pressable onPress={onSeeFinance} hitSlop={8} accessibilityRole="button">
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
              {t('fields:overview.yearGlance.openMoney', { defaultValue: 'Χρήματα' })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.bar}>
        <Metric
          icon="scale-outline"
          value={harvest}
          label={t('fields:overview.yearGlance.harvest')}
          colors={colors}
        />
        <Metric
          icon="water-outline"
          value={oil}
          label={t('fields:overview.yearGlance.oilProduced', { defaultValue: 'Παραγωγή' })}
          colors={colors}
        />
        <Metric
          icon="cube-outline"
          value={stock}
          label={t('fields:overview.yearGlance.inCellarNow', { defaultValue: 'Αποθήκη' })}
          colors={colors}
        />
      </View>

      {netLabel ? (
        <Pressable
          onPress={onSeeFinance}
          style={({ pressed }) => [
            styles.net,
            { opacity: pressed ? 0.9 : 1, minHeight: Math.max(36, tapMin - 12) },
          ]}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.netValue,
              {
                color:
                  money.result > 0
                    ? colors.success || colors.primary
                    : money.result < 0
                      ? colors.error
                      : colors.textPrimary,
              },
            ]}
          >
            {netLabel}
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{t('money:result')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const Metric: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
  colors: { textPrimary: string; textTertiary: string; primary: string; primaryLight: string };
}> = ({ icon, value, label, colors }) => (
  <View style={styles.metric}>
    <Ionicons name={icon} size={14} color={colors.primary} />
    <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
      {value}
    </Text>
    <Text style={[styles.label, { color: colors.textTertiary }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { flex: 1, fontSize: 15, fontWeight: '700' },
  bar: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    alignItems: 'flex-start',
  },
  value: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  label: { fontSize: 11, fontWeight: '600' },
  net: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingTop: 2,
  },
  netValue: { fontSize: 15, fontWeight: '800' },
});

export default FieldYearGlance;
