import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import {
  SummaryChip,
  FieldsSummaryChipProps,
} from '../fields/FieldsSummaryHeader';

export interface OverviewMetricsStripProps {
  metrics: FieldsSummaryChipProps[];
  greeting?: string;
  dateLabel?: string;
  /** Lighter styling when nested inside another screen (e.g. field detail). */
  embedded?: boolean;
}

const OverviewMetricsStrip: React.FC<OverviewMetricsStripProps> = ({
  metrics,
  greeting,
  dateLabel,
  embedded = false,
}) => {
  const { colors } = useTheme();

  if (metrics.length === 0) return null;

  return (
    <View
      style={[
        styles.panel,
        embedded && styles.panelEmbedded,
        { borderBottomColor: colors.borderLight },
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {metrics.map((metric) => (
          <SummaryChip key={metric.label} {...metric} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    overflow: 'hidden',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelEmbedded: {
    paddingTop: 0,
    paddingBottom: spacing.xs,
    borderBottomWidth: 0,
  },
  greetingRow: {
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  greeting: {
    ...typography.styles.h3,
    fontWeight: '700',
    fontSize: 20,
  },
  date: {
    ...typography.styles.caption,
    marginTop: 3,
    lineHeight: 18,
  },
  chipsRow: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
    flexDirection: 'row',
  },
});

export default OverviewMetricsStrip;
