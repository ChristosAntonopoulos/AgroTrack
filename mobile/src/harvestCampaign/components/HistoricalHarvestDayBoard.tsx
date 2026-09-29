import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useTheme } from '../../context/ThemeContext';
import type { HarvestRecord } from '../../services/harvestService';
import { radii, spacing, typography } from '../../theme';
import { athensCalendarDateKey } from '../../utils/athensDate';
import { formatKg } from '../../utils/harvestUtils';
import { summarizeHistoricalDay } from '../historicalDay';
import { HarvestCard } from './HarvestCard';

type Props = {
  fieldLabel: string;
  day: string;
  records: HarvestRecord[];
  loading: boolean;
  onOpenChronologio: () => void;
  onOpenRecord: (record: HarvestRecord) => void;
};

export const HistoricalHarvestDayBoard: React.FC<Props> = ({
  fieldLabel,
  day,
  records,
  loading,
  onOpenChronologio,
  onOpenRecord,
}) => {
  const { t, i18n } = useTranslation(['fields']);
  const locale = i18n.language || 'en';
  const { colors } = useTheme();
  const totals = summarizeHistoricalDay(records);
  const dated = new Date(`${day}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.block}>
      <Text style={[styles.overline, { color: colors.textTertiary }]}>
        {t('fields:harvestCampaign.historical.kicker', { defaultValue: 'From Chronologio' })}
      </Text>
      <Text style={[styles.h2, { color: colors.textPrimary }]}>
        {t('fields:harvestCampaign.historical.title', { defaultValue: 'Harvest day' })}
      </Text>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        {fieldLabel} · {dated}
      </Text>
      <Button
        title={t('fields:thisHarvest.openChronologio', { defaultValue: 'History' })}
        variant="ghost"
        onPress={onOpenChronologio}
        fullWidth
      />
      {loading ? <LoadingSpinner /> : null}
      {!loading && records.length === 0 ? (
        <HarvestCard>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            {t('fields:harvestCampaign.historical.missing', {
              defaultValue: 'No harvest records were found for this day.',
            })}
          </Text>
        </HarvestCard>
      ) : null}
      {!loading && records.length > 0 ? (
        <>
          <View style={styles.dayMetrics}>
            {totals.sacks > 0 ? (
              <View style={[styles.dayMetric, { backgroundColor: colors.surface }]}>
                <Text style={[styles.dayMetricLabel, { color: colors.textTertiary }]}>
                  {t('fields:harvestCampaign.sacks.unit')}
                </Text>
                <Text style={[styles.dayMetricValue, { color: colors.textPrimary }]}>
                  {totals.sacks}
                </Text>
              </View>
            ) : null}
            {totals.oliveKg > 0 ? (
              <View style={[styles.dayMetric, { backgroundColor: colors.surface }]}>
                <Text style={[styles.dayMetricLabel, { color: colors.textTertiary }]}>
                  {t('fields:harvestCampaign.record.olives')}
                </Text>
                <Text style={[styles.dayMetricValue, { color: colors.textPrimary }]}>
                  {formatKg(totals.oliveKg)}
                </Text>
              </View>
            ) : null}
            {totals.oilKg > 0 ? (
              <View style={[styles.dayMetric, { backgroundColor: colors.surface }]}>
                <Text style={[styles.dayMetricLabel, { color: colors.textTertiary }]}>
                  {t('fields:harvestCampaign.actions.oil')}
                </Text>
                <Text style={[styles.dayMetricValue, { color: colors.textPrimary }]}>
                  {formatKg(totals.oilKg)} kg
                </Text>
              </View>
            ) : null}
          </View>
          {records.map((record) => (
            <Pressable
              key={record.id}
              onPress={() => onOpenRecord(record)}
              style={[styles.historicalRow, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.dayMetricValue, { color: colors.textPrimary }]}>
                {record.sackCount && record.sackCount > 0
                  ? t('fields:harvestCampaign.historical.sacksRow', {
                      count: record.sackCount,
                      defaultValue: `${record.sackCount} sacks`,
                    })
                  : formatKg(record.oliveKg)}
              </Text>
              {record.millName ? (
                <Text style={[styles.dayMetricLabel, { color: colors.textTertiary }]}>
                  {record.millName}
                </Text>
              ) : null}
              <Text style={[styles.dayMetricLabel, { color: colors.textTertiary }]}>
                {athensCalendarDateKey(record.harvestDate)}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.md, paddingHorizontal: spacing.sm },
  lead: { ...typography.styles.body, lineHeight: 22 },
  h2: { ...typography.styles.h3 },
  overline: {
    ...typography.styles.overline,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dayMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historicalRow: {
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  dayMetric: {
    width: '47%',
    flexGrow: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  dayMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dayMetricValue: {
    fontSize: 22,
    fontWeight: '800',
  },
});
