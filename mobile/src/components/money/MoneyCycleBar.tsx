import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { HARVEST_YEAR_STAGES, type HarvestYearStatus } from '../../finance/harvestYear';
import { seasonStageIndex } from '../../chronologio/yearPresentation';
import { appFonts, createElevation, radii, spacing } from '../../theme';

type Props = {
  year: number;
  yearSpan: string;
  yearRangeLabel?: string;
  yearStatus: HarvestYearStatus;
  seasonLine?: string | null;
  tapMin: number;
  onYearChange: (year: number) => void;
};

/**
 * Harvest-year stepper with the four-stage season cycle.
 * Same paper card language as the warehouse.
 */
const MoneyCycleBar: React.FC<Props> = ({
  year,
  yearSpan,
  yearRangeLabel,
  yearStatus,
  seasonLine,
  tapMin,
  onYearChange,
}) => {
  const { t } = useTranslation('money');
  const { colors, fontScaleMultiplier } = useTheme();
  const liveIndex =
    yearStatus === 'current' ? seasonStageIndex() : yearStatus === 'closed' ? HARVEST_YEAR_STAGES.length - 1 : -1;
  const statusLabel =
    yearStatus === 'upcoming'
      ? t('harvestYearUpcoming')
      : yearStatus === 'closed'
        ? t('harvestYearClosed')
        : t('harvestYearCurrent');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'flat'),
        },
      ]}
      accessibilityRole="adjustable"
      accessibilityLabel={t('cycleAria')}
    >
      <View style={styles.yearRow}>
        <Pressable
          onPress={() => onYearChange(year - 1)}
          accessibilityLabel={t('prevYear')}
          style={[styles.yearBtn, { minWidth: tapMin, minHeight: tapMin }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.yearLabel}>
          <Text
            style={[styles.status, { color: colors.textTertiary, fontSize: 10 * fontScaleMultiplier }]}
            numberOfLines={1}
          >
            {statusLabel}
          </Text>
          <Text
            style={[styles.year, { color: colors.textPrimary, fontSize: 22 * fontScaleMultiplier }]}
            accessibilityLiveRegion="polite"
          >
            {yearSpan}
          </Text>
          {yearRangeLabel ? (
            <Text
              style={[styles.range, { color: colors.textTertiary, fontSize: 11 * fontScaleMultiplier }]}
              numberOfLines={1}
            >
              {yearRangeLabel}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => onYearChange(year + 1)}
          accessibilityLabel={t('nextYear')}
          style={[styles.yearBtn, { minWidth: tapMin, minHeight: tapMin }]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.track} accessibilityRole="progressbar">
        {HARVEST_YEAR_STAGES.map((stage, index) => {
          const filled = liveIndex >= 0 && index <= liveIndex;
          const now = yearStatus === 'current' && index === liveIndex;
          return (
            <View key={stage} style={styles.stage}>
              <View
                style={[
                  styles.segment,
                  {
                    backgroundColor: filled ? colors.primary : colors.borderLight,
                    opacity: now ? 1 : filled ? 0.55 : 0.45,
                  },
                ]}
              />
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 10 * fontScaleMultiplier,
                  fontWeight: now ? '700' : '500',
                  color: now || filled ? colors.textPrimary : colors.textTertiary,
                }}
                numberOfLines={2}
              >
                {t(`cycleStages.${stage}`)}
              </Text>
            </View>
          );
        })}
      </View>

      {seasonLine ? (
        <Text style={[styles.season, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
          {seasonLine}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.dock,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearBtn: { alignItems: 'center', justifyContent: 'center' },
  yearLabel: { flex: 1, alignItems: 'center', minWidth: 0 },
  status: {
    fontFamily: appFonts.semibold,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  year: {
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  range: { fontWeight: '500', textAlign: 'center', marginTop: 1 },
  track: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.sm },
  stage: { flex: 1, gap: 6, alignItems: 'center' },
  segment: { alignSelf: 'stretch', height: 6, borderRadius: radii.full },
  season: {
    fontFamily: appFonts.medium,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});

export default MoneyCycleBar;
