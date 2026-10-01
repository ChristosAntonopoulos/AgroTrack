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
  primaryMonthHighlight,
  type MonthChapterFocus,
} from '../../chronologio/monthPresentation';
import { createElevation, motion, radii } from '../../theme';
import { hexToRgba } from '../../utils/hexToRgba';

type Props = {
  summary: ChronologioMonthSummary;
  numberLocale: string;
  isCurrent?: boolean;
  onPress: () => void;
  onOpenDays?: () => void;
  onPressWeather?: () => void;
  onPressFocus?: (focus: MonthChapterFocus) => void;
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
 * Month chapter card — weather and activity chips (web ChronologioMonthSection).
 */
const ChronologioMonthChapterCard: React.FC<Props> = ({
  summary,
  numberLocale,
  isCurrent = false,
  onPress,
  onOpenDays,
  onPressWeather,
  onPressFocus,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors, fontScaleMultiplier } = useTheme();

  const count = periodEventCount(summary);
  const empty = count === 0 && !buildMonthWeatherView(summary).hasAny;
  const weather = buildMonthWeatherView(summary);
  const highlight = primaryMonthHighlight(summary);
  const title = new Date(Date.UTC(summary.year, summary.month - 1, 1)).toLocaleDateString(
    i18n.language,
    { month: 'long', year: 'numeric', timeZone: 'UTC' }
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
        onPress={() => (onPressFocus ? onPressFocus('work') : onPress())}
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
        onPress={() => (onPressFocus ? onPressFocus('observation') : onPress())}
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
        onPress={() => (onPressFocus ? onPressFocus('money') : onPress())}
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
        onPress={() => (onPressFocus ? onPressFocus('harvest') : onPress())}
      />
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed
            ? colors.surfaceMuted
            : hexToRgba(colors.primary, isCurrent ? 0.14 : 0.08),
          borderColor: isCurrent
            ? hexToRgba(colors.primary, 0.55)
            : hexToRgba(colors.primary, 0.36),
          opacity: pressed ? motion.pressOpacity : empty ? 0.88 : 1,
          ...createElevation(colors, 'sm'),
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
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                {
                  color: empty ? colors.textSecondary : colors.textPrimary,
                  fontSize: 20 * fontScaleMultiplier,
                  flexShrink: 1,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {isCurrent ? (
              <Text
                style={[
                  styles.nowBadge,
                  {
                    color: colors.primary,
                    backgroundColor: colors.primaryLight,
                    fontSize: 10 * fontScaleMultiplier,
                  },
                ]}
              >
                {t('yearView.here')}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Text style={[styles.metaCount, { color: colors.textSecondary }]}>
          {count === 1 ? t('monthView.recordOne') : t('monthView.records', { count })}
        </Text>
      </View>

      {rain || temps ? (
        <Pressable
          onPress={onPressWeather}
          disabled={!onPressWeather}
          hitSlop={6}
          style={({ pressed }) => [
            styles.wxRow,
            { opacity: pressed && onPressWeather ? motion.pressOpacity : 1 },
          ]}
        >
          {rain ? (
            <View style={[styles.wxChip, { backgroundColor: colors.eventWeatherSoft, borderColor: colors.borderLight }]}>
              <Ionicons name="rainy-outline" size={12} color={colors.eventWeather} />
              <Text style={[styles.wxText, { color: colors.eventWeather }]}>{rain}</Text>
            </View>
          ) : null}
          {temps ? (
            <View style={[styles.wxChip, { backgroundColor: colors.eventWeatherSoft, borderColor: colors.borderLight }]}>
              <Ionicons name="thermometer-outline" size={12} color={colors.eventWeather} />
              <Text style={[styles.wxText, { color: colors.eventWeather }]}>{temps}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

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
    borderWidth: 1,
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
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.35,
    textTransform: 'capitalize',
    lineHeight: 26,
  },
  nowBadge: {
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  metaCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  wxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
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
