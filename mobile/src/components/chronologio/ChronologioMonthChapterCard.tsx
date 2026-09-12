import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioMonthSummary } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { periodEventCount } from '../../utils/summaryFacts';
import {
  buildMonthWeatherView,
  harvestHasResult,
  monthSeasonStage,
  primaryMonthHighlight,
} from '../../chronologio/monthPresentation';
import { createElevation, motion, radii } from '../../theme';

type Props = {
  summary: ChronologioMonthSummary;
  numberLocale: string;
  isCurrent?: boolean;
  onPress: () => void;
  onOpenDays?: () => void;
  onPressWeather?: () => void;
};

type ChipProps = {
  accent: string;
  soft: string;
  kicker: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
};

const SummaryChip: React.FC<ChipProps> = ({ accent, soft, kicker, title, icon, onPress }) => {
  const { colors, fontScaleMultiplier } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: soft,
          borderColor: colors.borderLight,
          opacity: pressed ? motion.pressOpacity : 1,
        },
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.chipIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <View style={styles.chipBody}>
        <Text style={[styles.chipKicker, { color: accent, fontSize: 10 * fontScaleMultiplier }]}>
          {kicker}
        </Text>
        <Text
          style={[styles.chipTitle, { color: colors.textPrimary, fontSize: 13 * fontScaleMultiplier }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
};

/**
 * Month chapter card — phase, weather, activity chips (web ChronologioMonthSection).
 */
const ChronologioMonthChapterCard: React.FC<Props> = ({
  summary,
  numberLocale,
  isCurrent = false,
  onPress,
  onOpenDays,
  onPressWeather,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors, fontScaleMultiplier } = useTheme();

  const count = periodEventCount(summary);
  const empty = count === 0 && !buildMonthWeatherView(summary).hasAny;
  const phase = monthSeasonStage(summary.month);
  const weather = buildMonthWeatherView(summary);
  const highlight = primaryMonthHighlight(summary);
  const title = new Date(Date.UTC(summary.year, summary.month - 1, 1)).toLocaleDateString(
    i18n.language,
    { month: 'long', timeZone: 'UTC' }
  );

  const rain =
    weather.rainMm != null
      ? `${weather.rainMm.toLocaleString(numberLocale, { maximumFractionDigits: 0 })} mm`
      : null;
  const temps =
    weather.tempMin != null && weather.tempMax != null
      ? `${Math.round(weather.tempMin)}°–${Math.round(weather.tempMax)}°`
      : null;

  const chips: React.ReactNode[] = [];
  if (summary.taskCount > 0) {
    chips.push(
      <SummaryChip
        key="work"
        accent={colors.eventWork}
        soft={colors.eventWorkSoft}
        icon="checkbox-outline"
        kicker={t('monthView.work')}
        title={t('monthView.workShort', { count: summary.taskCount })}
        onPress={onPress}
      />
    );
  }
  if (summary.noteCount > 0) {
    chips.push(
      <SummaryChip
        key="notes"
        accent={colors.eventObservation}
        soft={colors.eventObservationSoft}
        icon="document-text-outline"
        kicker={t('monthView.observationShortLabel')}
        title={highlight || t('monthView.notesShort', { count: summary.noteCount })}
        onPress={onPress}
      />
    );
  }
  if (summary.expenseCount > 0 || summary.expenseTotal > 0) {
    chips.push(
      <SummaryChip
        key="money"
        accent={colors.eventExpense}
        soft={colors.eventExpenseSoft}
        icon="wallet-outline"
        kicker={t('monthView.money')}
        title={t('monthView.expensesShort', {
          amount: formatChronologioMoney(summary.expenseTotal, summary.currency || 'EUR', numberLocale),
        })}
        onPress={onPress}
      />
    );
  }
  if (harvestHasResult(summary)) {
    chips.push(
      <SummaryChip
        key="harvest"
        accent={colors.eventHarvest}
        soft={colors.eventHarvestSoft}
        icon="leaf-outline"
        kicker={t('monthView.harvest')}
        title={
          summary.oilKg > 0
            ? `${summary.oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} ${t('oilUnit')}`
            : `${Math.round(summary.oliveKg).toLocaleString(numberLocale)} ${t('olivesUnit')}`
        }
        onPress={onPress}
      />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: isCurrent ? colors.oliveBorder : colors.borderLight,
          opacity: pressed ? motion.pressOpacity : empty ? 0.88 : 1,
          ...createElevation(colors, 'flat'),
        },
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.spine, { backgroundColor: isCurrent ? colors.primary : colors.oliveBorder }]} />

      <View style={styles.header}>
        <Pressable
          onPress={onOpenDays || onPress}
          hitSlop={4}
          style={({ pressed }) => ({ opacity: pressed ? motion.pressOpacity : 1, flex: 1, minWidth: 0 })}
        >
          <Text
            style={[
              styles.title,
              {
                color: empty ? colors.textSecondary : colors.textPrimary,
                fontSize: 20 * fontScaleMultiplier,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.phase, { color: colors.textTertiary, fontSize: 11 * fontScaleMultiplier }]}>
            {t(`yearView.stages.${phase}`)}
            {isCurrent ? ` · ${t('monthView.currentMonth')}` : ''}
          </Text>
        </Pressable>

        <View style={styles.metaCol}>
          {(rain || temps) && onPressWeather ? (
            <Pressable
              onPress={onPressWeather}
              hitSlop={6}
              style={({ pressed }) => [
                styles.wxChip,
                {
                  backgroundColor: colors.eventWeatherSoft,
                  borderColor: colors.borderLight,
                  opacity: pressed ? motion.pressOpacity : 1,
                },
              ]}
            >
              <Ionicons name="rainy-outline" size={12} color={colors.eventWeather} />
              <Text style={[styles.wxText, { color: colors.eventWeather }]} numberOfLines={1}>
                {[rain, temps].filter(Boolean).join(' · ')}
              </Text>
            </Pressable>
          ) : rain || temps ? (
            <Text style={[styles.metaCount, { color: colors.textSecondary }]} numberOfLines={1}>
              {[rain, temps].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          <Text style={[styles.metaCount, { color: colors.textSecondary }]}>
            {count === 1
              ? t('monthView.recordOne')
              : t('monthView.records', { count })}
          </Text>
        </View>
      </View>

      {summary.dominantWorkLabel ? (
        <Text style={[styles.dominant, { color: colors.textSecondary }]} numberOfLines={1}>
          {t('monthView.dominantWork')}: {summary.dominantWorkLabel}
        </Text>
      ) : highlight && summary.noteCount === 0 ? (
        <Text style={[styles.dominant, { color: colors.textPrimary }]} numberOfLines={1}>
          {highlight}
        </Text>
      ) : null}

      {empty ? (
        <Text style={[styles.empty, { color: colors.textTertiary }]}>{t('monthView.noRecords')}</Text>
      ) : chips.length > 0 ? (
        <View style={styles.chipGrid}>{chips}</View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 16,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
    gap: 10,
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 2,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.35,
    textTransform: 'capitalize',
    lineHeight: 26,
  },
  phase: {
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  metaCol: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '42%',
  },
  metaCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  wxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  wxText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  dominant: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  empty: {
    fontSize: 13,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '46%',
    flexGrow: 1,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBody: { flex: 1, minWidth: 0, gap: 1 },
  chipKicker: {
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chipTitle: {
    fontWeight: '600',
  },
});

export default ChronologioMonthChapterCard;
