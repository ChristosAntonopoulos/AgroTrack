import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { formatKg } from '../../utils/harvestUtils';
import { radii, spacing } from '../../theme';
import { HarvestSheetShell } from '../components/HarvestSheetShell';
import { formatHarvestYieldPercent } from '../utils/harvestCalculations';

export const HarvestCompleteSheet: React.FC<{
  officialKg: number;
  oilKg: number;
  yieldPct: number | null;
  days: number;
  personDays: number;
  expenseEur: number;
  unweighedSacks: number;
  locale: string;
  onFill: () => void;
  onFinish: () => void;
}> = ({
  officialKg,
  oilKg,
  yieldPct,
  days,
  personDays,
  expenseEur,
  unweighedSacks,
  locale,
  onFill,
  onFinish,
}) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();

  return (
    <HarvestSheetShell
      footer={
        <>
          {unweighedSacks > 0 ? (
            <Button title={t('harvestCampaign.complete.fill')} variant="outline" onPress={onFill} fullWidth />
          ) : null}
          <Button
            title={
              unweighedSacks > 0
                ? t('harvestCampaign.complete.without')
                : t('harvestCampaign.complete.confirm')
            }
            onPress={onFinish}
            fullWidth
          />
        </>
      }
    >
      <Text style={[styles.hero, { color: colors.textPrimary }]}>
        {t('harvestCampaign.complete.finishedTitle')}
      </Text>
      <View style={styles.metrics}>
        <View style={[styles.metric, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('harvestCampaign.complete.olives', { kg: formatKg(officialKg) })}
          </Text>
        </View>
        <View style={[styles.metric, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('harvestCampaign.complete.oil', { kg: formatKg(oilKg) })}
          </Text>
        </View>
        {yieldPct != null ? (
          <View style={[styles.metricWide, { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}>
            <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
              {t('harvestCampaign.complete.yield', {
                yield: formatHarvestYieldPercent(yieldPct, locale),
              })}
            </Text>
          </View>
        ) : null}
        <View style={[styles.metric, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('harvestCampaign.complete.days', { count: days })}
          </Text>
        </View>
        <View style={[styles.metric, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('harvestCampaign.complete.personDays', { count: personDays })}
          </Text>
        </View>
        <View style={[styles.metric, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {t('harvestCampaign.complete.expense', { amount: expenseEur })}
          </Text>
        </View>
      </View>
      {unweighedSacks > 0 ? (
        <Text style={{ color: colors.warning }}>
          {t('harvestCampaign.complete.unweighed', { count: unweighedSacks })}
        </Text>
      ) : null}
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  hero: { fontSize: 18, fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48%', borderWidth: 1, borderRadius: radii.lg, padding: spacing.md },
  metricWide: { width: '100%', borderWidth: 1, borderRadius: radii.lg, padding: spacing.md },
});
