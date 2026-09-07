import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/layout/ScreenLayout';
import ScreenHeader from '../components/layout/ScreenHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';
import { usePreferences } from '../context/PreferencesContext';
import { useRefresh } from '../hooks/useRefresh';
import { reportsService, FieldProfit, FieldSummaryReport } from '../services/reportsService';
import { currentHarvestSeason, formatKg } from '../utils/harvestUtils';
import { RootStackParamList } from '../navigation/types';
import { spacing, typography } from '../theme';
import { createElevation } from '../theme/elevation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const formatMoney = (amount: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(amount);

const ThisHarvestScreen = () => {
  const { colors } = useTheme();
  const { tapMin, fontScaleMultiplier } = usePreferences();
  const { t } = useTranslation(['fields', 'common']);
  const navigation = useNavigation<Nav>();
  const season = useMemo(() => currentHarvestSeason(), []);
  const [loading, setLoading] = useState(true);
  const [oliveKg, setOliveKg] = useState(0);
  const [spent, setSpent] = useState(0);
  const [received, setReceived] = useState(0);
  const [net, setNet] = useState(0);
  const [cards, setCards] = useState<
    Array<{ fieldId: string; fieldName: string; oliveKg: number; spent: number; received: number }>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = { season };
      const [harvests, pnl, summaries] = await Promise.all([
        reportsService.getHarvestRecords(query).catch(() => []),
        reportsService.getProfitLoss(query).catch(() => null),
        reportsService.getFieldSummaries(query).catch(() => [] as FieldSummaryReport[]),
      ]);

      const kgByField = new Map<string, number>();
      let totalKg = 0;
      for (const row of harvests) {
        totalKg += row.oliveKg || 0;
        kgByField.set(row.fieldId, (kgByField.get(row.fieldId) ?? 0) + (row.oliveKg || 0));
      }

      const profitByField = new Map<string, FieldProfit>();
      (pnl?.profitByField ?? []).forEach((row) => profitByField.set(row.fieldId, row));

      const nextCards = summaries
        .map((summary) => {
          const profit = profitByField.get(summary.fieldId);
          return {
            fieldId: summary.fieldId,
            fieldName: summary.fieldName,
            oliveKg: kgByField.get(summary.fieldId) ?? summary.totalProductionKg ?? 0,
            spent: profit?.cost ?? summary.totalCost ?? 0,
            received: profit?.revenue ?? 0,
          };
        })
        .filter((card) => card.oliveKg > 0 || card.spent > 0 || card.received > 0);

      setOliveKg(totalKg);
      setSpent(Number(pnl?.totalExpenses ?? 0));
      setReceived(Number(pnl?.totalIncome ?? 0));
      setNet(Number(pnl?.netProfit ?? 0));
      setCards(nextCards);
    } finally {
      setLoading(false);
    }
  }, [season]);

  useEffect(() => {
    void load();
  }, [load]);

  const { refreshing, onRefresh } = useRefresh(load);

  if (loading && cards.length === 0 && oliveKg === 0 && spent === 0 && received === 0) {
    return <LoadingSpinner fullScreen />;
  }

  const hasHeroKg = oliveKg > 0;
  const hasMoney = spent > 0 || received > 0;
  const empty = !hasHeroKg && !hasMoney && cards.length === 0;

  return (
    <ScreenLayout
      scroll
      refreshControl={{ refreshing, onRefresh }}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader title={t('fields:thisHarvest.title')} subtitle={t('fields:thisHarvest.season', { year: season })} />

      {empty ? (
        <EmptyState
          icon={<Ionicons name="basket-outline" size={36} color={colors.textTertiary} />}
          title={t('fields:thisHarvest.emptyTitle')}
          description={t('fields:thisHarvest.emptyHint')}
        />
      ) : (
        <View style={[styles.hero, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderLight }]}>
          {hasHeroKg ? (
            <>
              <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]}>
                {t('fields:thisHarvest.olives')}
              </Text>
              <Text style={[styles.heroValue, { color: colors.textPrimary, fontSize: 32 * fontScaleMultiplier }]}>
                {t('fields:thisHarvest.kgValue', { kg: formatKg(oliveKg) })}
              </Text>
            </>
          ) : hasMoney ? (
            <>
              <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }]}>
                {t('fields:thisHarvest.net')}
              </Text>
              <Text style={[styles.heroValue, { color: colors.textPrimary, fontSize: 32 * fontScaleMultiplier }]}>
                {formatMoney(net)}
              </Text>
            </>
          ) : null}

          {hasMoney ? (
            <View style={styles.moneyRow}>
              {spent > 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }}>
                  {t('fields:costs.spent')}: {formatMoney(spent)}
                </Text>
              ) : null}
              {received > 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }}>
                  {t('fields:costs.received')}: {formatMoney(received)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      )}

      {cards.map((card) => (
        <TouchableOpacity
          key={card.fieldId}
          style={[
            styles.fieldCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.borderLight,
              minHeight: tapMin,
              ...createElevation(colors, 'sm'),
            },
          ]}
          onPress={() => navigation.navigate('FieldDetail', { fieldId: card.fieldId, focus: 'harvest' })}
        >
          <Text style={[styles.fieldName, { color: colors.textPrimary, fontSize: 17 * fontScaleMultiplier }]}>
            {card.fieldName}
          </Text>
          {card.oliveKg > 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }}>
              {t('fields:thisHarvest.kgValue', { kg: formatKg(card.oliveKg) })}
            </Text>
          ) : null}
          {card.spent > 0 || card.received > 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier }}>
              {[
                card.spent > 0 ? `${t('fields:costs.spent')} ${formatMoney(card.spent)}` : null,
                card.received > 0 ? `${t('fields:costs.received')} ${formatMoney(card.received)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: spacing['3xl'] },
  hero: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.xs,
  },
  heroLabel: {
    ...typography.styles.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroValue: {
    fontWeight: '800',
  },
  moneyRow: {
    marginTop: spacing.sm,
    gap: 4,
  },
  fieldCard: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  fieldName: {
    fontWeight: '700',
  },
});

export default ThisHarvestScreen;
