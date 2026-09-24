import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ChronologioHarvestDetails } from '../../services/chronologioService';
import { formatKg } from '../../utils/harvestUtils';
import { friendlyFieldLabel } from '../../utils/fieldLabels';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';

type JourneyStage = {
  kind: 'harvest' | 'mill' | 'oil';
  value: string;
  unit: string;
  lines: string[];
};

type Props = {
  harvest: ChronologioHarvestDetails;
  numberLocale: string;
  fieldName?: string | null;
  fieldAccent?: string;
  /** Compact horizontal chain for the timeline card. */
  compact?: boolean;
};

const stageTitle = (kind: JourneyStage['kind'], t: (key: string) => string) => {
  if (kind === 'harvest') return t('harvestCampaign.flow.sacks');
  if (kind === 'mill') return t('harvestCampaign.flow.fruit');
  return t('harvestCampaign.flow.oil');
};

/**
 * Day slice of the harvest journey — same language as Η διαδρομή της συγκομιδής:
 * σάκοι → ελαιόκαρπος → λάδι.
 */
const HarvestDayJourney: React.FC<Props> = ({
  harvest,
  fieldName,
  fieldAccent,
  compact = false,
}) => {
  const { t } = useTranslation('fields');
  const { colors } = useTheme();

  const stages = useMemo(() => {
    const out: JourneyStage[] = [];
    const fieldLine = fieldName ? friendlyFieldLabel(fieldName) : null;
    const sacks = harvest.sackCount ?? 0;
    const olives = harvest.oliveKg ?? 0;
    const oil = harvest.oilKg ?? 0;

    if (sacks > 0) {
      out.push({
        kind: 'harvest',
        value: String(sacks),
        unit: t('harvestCampaign.flow.unitSacks'),
        lines: [
          fieldLine,
          harvest.hasOfficialWeight === false && olives > 0
            ? t('harvestCampaign.flow.approxOlives', {
                kg: formatKg(olives),
              })
            : null,
        ].filter(Boolean) as string[],
      });
    }

    if (olives > 0 && harvest.hasOfficialWeight !== false) {
      out.push({
        kind: 'mill',
        value: formatKg(olives),
        unit: t('harvestCampaign.flow.unitFruit'),
        lines: [
          fieldLine,
          sacks > 0 ? t('harvestCampaign.flow.fromSacks', { count: sacks }) : null,
        ].filter(Boolean) as string[],
      });
    }

    if (oil > 0) {
      out.push({
        kind: 'oil',
        value: formatKg(oil),
        unit: t('harvestCampaign.flow.unitOil'),
        lines: [
          fieldLine,
          olives > 0
            ? t('harvestCampaign.flow.fromOlives', {
                kg: formatKg(olives),
              })
            : null,
          harvest.oilYieldPercent != null && harvest.oilYieldPercent > 0
            ? t('harvestCampaign.flow.yieldBadge', {
                yield: formatKg(harvest.oilYieldPercent),
              })
            : null,
        ].filter(Boolean) as string[],
      });
    }

    return out;
  }, [fieldName, harvest, t]);

  if (stages.length === 0) return null;

  const accent = fieldAccent || colors.eventHarvest;

  if (compact) {
    return (
      <View style={styles.compact} accessibilityLabel={t('harvestCampaign.flow.title')}>
        <Text style={[styles.lead, { color: colors.textSecondary }]}>
          {t('harvestCampaign.flow.steps')}
        </Text>
        <View style={styles.chain}>
          {stages.map((stage, index) => (
            <React.Fragment key={stage.kind}>
              {index > 0 ? (
                <Text style={[styles.sep, { color: colors.textTertiary }]} aria-hidden>
                  →
                </Text>
              ) : null}
              <View
                style={[
                  styles.pill,
                  {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: accent,
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: colors.textPrimary }]}>
                  {stage.value} {stage.unit}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.full} accessibilityLabel={t('harvestCampaign.flow.title')}>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        {t('harvestCampaign.flow.lead')}
      </Text>
      <View style={styles.stack}>
        {stages.map((stage) => (
          <View
            key={stage.kind}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderLeftColor: accent,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
              {stageTitle(stage.kind, t)}
            </Text>
            <Text style={[styles.cardMetric, { color: colors.textPrimary }]}>
              {stage.value}{' '}
              <Text style={[styles.cardUnit, { color: colors.textSecondary }]}>{stage.unit}</Text>
            </Text>
            {stage.lines.map((line) => (
              <Text key={line} style={[styles.cardLine, { color: colors.textSecondary }]}>
                {line}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  compact: { marginTop: spacing.xs, gap: 4 },
  full: { marginBottom: spacing.sm, gap: 8 },
  lead: { fontSize: 13, lineHeight: 18 },
  chain: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  sep: { fontSize: 12, fontWeight: '600' },
  pill: {
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pillText: { fontSize: 13, fontWeight: '700' },
  stack: { gap: 8 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  cardMetric: { fontSize: 20, fontWeight: '700' },
  cardUnit: { fontSize: 13, fontWeight: '500' },
  cardLine: { fontSize: 13, lineHeight: 18 },
});

export default HarvestDayJourney;
