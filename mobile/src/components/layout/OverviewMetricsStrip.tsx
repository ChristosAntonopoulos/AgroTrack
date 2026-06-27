import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import OverviewMetricCard, {
  OverviewMetricCardProps,
  OVERVIEW_METRIC_CARD_WIDTH,
  OVERVIEW_METRIC_CARD_GAP,
} from '../ui/OverviewMetricCard';

export interface OverviewMetricsStripProps {
  metrics: OverviewMetricCardProps[];
  greeting?: string;
  dateLabel?: string;
  /** Lighter styling when nested inside another screen (e.g. field detail). */
  embedded?: boolean;
}

const NARROW_BREAKPOINT = 380;

const OverviewMetricsStrip: React.FC<OverviewMetricsStripProps> = ({
  metrics,
  greeting,
  dateLabel,
  embedded = false,
}) => {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const useGrid = screenWidth < NARROW_BREAKPOINT;
  const gridCardWidth = useMemo(() => {
    const horizontalPad = spacing.base * 2;
    const gap = OVERVIEW_METRIC_CARD_GAP;
    return (screenWidth - horizontalPad - gap) / 2;
  }, [screenWidth]);

  const snapOffsets = useMemo(
    () =>
      metrics.map((_, index) => index * (OVERVIEW_METRIC_CARD_WIDTH + OVERVIEW_METRIC_CARD_GAP)),
    [metrics.length]
  );

  if (metrics.length === 0) return null;

  return (
    <View
      style={[
        styles.panel,
        embedded && styles.panelEmbedded,
        {
          backgroundColor: embedded ? 'transparent' : colors.background,
          borderBottomColor: colors.borderLight,
        },
      ]}
    >
      {greeting || dateLabel ? (
        <View style={styles.greetingRow}>
          {greeting ? (
            <Text style={[styles.greeting, { color: colors.textPrimary }]} numberOfLines={1}>
              {greeting}
            </Text>
          ) : null}
          {dateLabel ? (
            <Text style={[styles.date, { color: colors.textSecondary }]} numberOfLines={1}>
              {dateLabel}
            </Text>
          ) : null}
        </View>
      ) : null}

      {useGrid ? (
        <View style={styles.grid}>
          {metrics.map((metric, index) => (
            <OverviewMetricCard key={`${metric.label}-${index}`} {...metric} width={gridCardWidth} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToAlignment="start"
          snapToOffsets={snapOffsets}
        >
          {metrics.map((metric, index) => (
            <OverviewMetricCard key={`${metric.label}-${index}`} {...metric} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    overflow: 'hidden',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  panelEmbedded: {
    paddingTop: 0,
    paddingBottom: spacing.sm,
    borderBottomWidth: 0,
  },
  greetingRow: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  greeting: {
    ...typography.styles.h3,
    fontWeight: '700',
    fontSize: 17,
  },
  date: {
    ...typography.styles.caption,
    marginTop: 2,
  },
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    gap: OVERVIEW_METRIC_CARD_GAP,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    gap: OVERVIEW_METRIC_CARD_GAP,
  },
});

export default OverviewMetricsStrip;
