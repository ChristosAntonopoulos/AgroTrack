import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import { useTheme } from '../../context/ThemeContext';
import { formatKg } from '../../utils/harvestUtils';
import { createElevation, harvestPipelinePalette, radii, spacing } from '../../theme';
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

  const metric = (label: string, bg: string) => (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: bg,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{label}</Text>
    </View>
  );

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
        {metric(
          t('harvestCampaign.complete.olives', { kg: formatKg(officialKg) }),
          harvestPipelinePalette.fruit.bg
        )}
        {metric(
          t('harvestCampaign.complete.oil', { kg: formatKg(oilKg) }),
          harvestPipelinePalette.oil.bg
        )}
        {yieldPct != null ? (
          <View
            style={[
              styles.metricWide,
              {
                backgroundColor: colors.eventHarvestSoft,
                ...createElevation(colors, 'sm'),
              },
            ]}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
              {t('harvestCampaign.complete.yield', {
                yield: formatHarvestYieldPercent(yieldPct, locale),
              })}
            </Text>
          </View>
        ) : null}
        {metric(t('harvestCampaign.complete.days', { count: days }), colors.surfaceElevated)}
        {metric(
          t('harvestCampaign.complete.personDays', { count: personDays }),
          colors.surfaceElevated
        )}
        {metric(
          t('harvestCampaign.complete.expense', { amount: expenseEur }),
          colors.surfaceElevated
        )}
      </View>
      {unweighedSacks > 0 ? (
        <Text style={{ color: colors.warning, fontWeight: '600' }}>
          {t('harvestCampaign.complete.unweighed', { count: unweighedSacks })}
        </Text>
      ) : null}
    </HarvestSheetShell>
  );
};

const styles = StyleSheet.create({
  hero: { fontWeight: '800', fontSize: 22, letterSpacing: -0.3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: '46%',
    flexGrow: 1,
  },
  metricWide: {
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
});
