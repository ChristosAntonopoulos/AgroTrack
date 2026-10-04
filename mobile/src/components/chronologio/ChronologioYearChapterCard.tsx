import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioPeriodSummary } from '../../services/chronologioService';
import { formatChronologioMoney } from '../../utils/chronologioGrouping';
import { agriculturalYearRangeLabel } from '../../chronologio/agriculturalYear';
import { harvestHasResult } from '../../chronologio/monthPresentation';
import {
  agriculturalYearState,
  harvestYearCopyKey,
  nextSeasonStageIndex,
  SEASON_STAGES,
  seasonStageIndex,
  yearChapterFacts,
  yearComparison,
  yearHeadline,
  type YearChapterFact,
} from '../../chronologio/yearPresentation';
import ChronologioSeasonTrack from './ChronologioSeasonTrack';
import { createElevation, motion, radii } from '../../theme';
import { hexToRgba } from '../../utils/hexToRgba';

type Props = {
  summary: ChronologioPeriodSummary;
  previous?: ChronologioPeriodSummary | null;
  numberLocale: string;
  isActive?: boolean;
  onPress: () => void;
};

const isRealMedia = (url?: string | null) => {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('unsplash') || u.includes('picsum') || u.includes('placeholder')) return false;
  return (
    u.includes('/uploads/') ||
    u.includes('/api/v1/photos/') ||
    u.startsWith('/') ||
    u.startsWith('file:') ||
    u.startsWith('content:')
  );
};

const FactChip: React.FC<{
  fact: YearChapterFact;
  numberLocale: string;
  soft: string;
  accent: string;
  textPrimary: string;
}> = ({ fact, numberLocale, soft, accent, textPrimary }) => {
  const { t } = useTranslation('chronologio');
  let label = '';
  switch (fact.kind) {
    case 'work':
      label = t('monthView.workShort', { count: fact.count });
      break;
    case 'notes':
      label = t('monthView.notesShort', { count: fact.count });
      break;
    case 'money':
      label = t('monthView.expensesShort', {
        amount: formatChronologioMoney(fact.amount, fact.currency || 'EUR', numberLocale),
      });
      break;
    case 'olives':
      label = `${Math.round(fact.kg).toLocaleString(numberLocale)} ${t('olivesUnit')}`;
      break;
    case 'records':
      label = t('yearView.recordsFact', { count: fact.count });
      break;
  }
  return (
    <View style={[styles.factChip, { backgroundColor: soft, borderColor: accent + '44' }]}>
      <Text style={[styles.factText, { color: textPrimary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

/**
 * Year chapter card — live season track vs closed harvest/compare (web Years feed).
 */
const ChronologioYearChapterCard: React.FC<Props> = ({
  summary,
  previous,
  numberLocale,
  isActive = false,
  onPress,
}) => {
  const { t, i18n } = useTranslation('chronologio');
  const { colors, fontScaleMultiplier } = useTheme();
  const state = agriculturalYearState(summary.periodYear, summary);
  const live = state === 'inProgress' || state === 'harvesting';
  const headline = yearHeadline(summary);
  const facts = yearChapterFacts(summary, live);
  const harvestKey = harvestYearCopyKey(summary);
  const comparison = !live ? yearComparison(summary, previous) : null;
  const hero = !live && isRealMedia(summary.heroMediaUrl) ? summary.heroMediaUrl : undefined;
  const stage = seasonStageIndex();
  const next = nextSeasonStageIndex(stage);
  const range = agriculturalYearRangeLabel(summary.periodYear, i18n.language);

  const pill =
    state === 'harvesting'
      ? t('yearView.harvesting')
      : state === 'inProgress'
        ? t('yearView.inProgress')
        : state === 'awaitingClosure'
          ? t('yearView.awaitingClosure')
          : state === 'upcoming'
            ? t('yearView.upcoming')
            : t('yearView.closed');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        live && styles.cardLive,
        {
          backgroundColor: pressed
            ? colors.surfaceMuted
            : live
              ? colors.primaryLight
              : hexToRgba(colors.primary, 0.08),
          borderColor:
            isActive || live
              ? hexToRgba(colors.primary, 0.55)
              : hexToRgba(colors.primary, 0.36),
          opacity: pressed ? motion.pressOpacity : 1,
          ...createElevation(colors, 'sm'),
        },
      ]}
      accessibilityRole="button"
    >
      <View style={[styles.spine, { backgroundColor: live ? colors.primary : colors.oliveBorder }]} />

      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.kicker, { color: colors.primary }]}>
            {live ? t('yearView.liveYear') : t('yearView.closedYear')}
          </Text>
          <Text
            style={[
              styles.year,
              { color: colors.textPrimary, fontSize: 32 * fontScaleMultiplier },
            ]}
          >
            {summary.periodYear}
          </Text>
          <Text style={[styles.range, { color: colors.textTertiary }]} numberOfLines={1}>
            {range}
          </Text>
        </View>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: live ? colors.surface : colors.surfaceMuted,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text
            style={[
              styles.pillText,
              { color: live ? colors.primary : colors.textSecondary },
            ]}
          >
            {pill}
          </Text>
        </View>
      </View>

      {live ? (
        <>
          <ChronologioSeasonTrack currentIndex={stage} />
          <Text style={[styles.nowLine, { color: colors.textSecondary }]}>
            {next !== stage
              ? t('yearView.nowReading', {
                  stage: t(`yearView.stages.${SEASON_STAGES[stage]}`),
                  next: t(`yearView.stages.${SEASON_STAGES[next]}`),
                })
              : t('yearView.nowStage', {
                  stage: t(`yearView.stages.${SEASON_STAGES[stage]}`),
                })}
          </Text>
        </>
      ) : (
        <>
          {harvestKey === 'result' && harvestHasResult(summary) ? (
            <Text style={[styles.oilHero, { color: colors.eventHarvest }]}>
              {summary.oilKg > 0
                ? `${summary.oilKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} ${t('oilUnit')}`
                : `${Math.round(summary.oliveKg).toLocaleString(numberLocale)} ${t('olivesUnit')}`}
            </Text>
          ) : (
            <Text style={[styles.harvestCopy, { color: colors.textTertiary }]}>
              {harvestKey === 'noResult'
                ? t('monthView.harvestNoResult')
                : t('yearView.harvestNotStarted')}
            </Text>
          )}
          {comparison ? (
            <Text style={[styles.compare, { color: colors.textPrimary }]}>
              {t(`yearView.compare.${comparison.kind}${comparison.percent >= 0 ? 'Up' : 'Down'}`, {
                pct: Math.abs(comparison.percent),
                year: comparison.previousYear,
              })}
            </Text>
          ) : null}
        </>
      )}

      {facts.length > 0 ? (
        <View style={styles.facts}>
          {facts.map((fact, i) => (
            <FactChip
              key={`${fact.kind}-${i}`}
              fact={fact}
              numberLocale={numberLocale}
              soft={colors.surface}
              accent={colors.oliveBorder}
              textPrimary={colors.textPrimary}
            />
          ))}
        </View>
      ) : null}

      {headline ? (
        <Text style={[styles.headline, { color: colors.textPrimary }]} numberOfLines={2}>
          {headline}
        </Text>
      ) : null}

      <Text style={[styles.hint, { color: colors.primary }]}>{t('yearView.openHint')}</Text>

      {hero ? (
        <Image source={{ uri: hero }} style={styles.photo} />
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    paddingLeft: 18,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    gap: 10,
  },
  cardLive: {},
  spine: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    opacity: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  year: {
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  range: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  pill: {
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nowLine: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  oilHero: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  harvestCopy: {
    fontSize: 13,
    fontWeight: '500',
  },
  compare: {
    fontSize: 14,
    fontWeight: '700',
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  factChip: {
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  factText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headline: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  hint: {
    fontSize: 13,
    fontWeight: '600',
  },
  photo: {
    width: '100%',
    height: 140,
    borderRadius: radii.md,
    marginTop: 2,
  },
});

export default ChronologioYearChapterCard;
