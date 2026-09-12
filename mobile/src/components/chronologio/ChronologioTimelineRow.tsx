import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { ChronologioTimelineRow } from '../../utils/chronologioTimeline';
import { spacing } from '../../theme';

const RAIL_WIDTH = 34;
const LINE_LEFT = 16;

type Props = {
  row: ChronologioTimelineRow;
  children: React.ReactNode;
  dimLabel?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
};

/**
 * Quiet continuous timeline — thin muted rail, small nodes, typography carries hierarchy.
 */
const ChronologioTimelineRowView: React.FC<Props> = ({
  row,
  children,
  dimLabel = false,
  isFirst = false,
  isLast = false,
}) => {
  const { colors } = useTheme();
  const showMarker = row.kind !== 'entry' && row.kind !== 'weatherCluster';
  const lineColor = colors.timeline || colors.oliveBorder;
  const isToday = row.dayKind === 'today';

  return (
    <View style={styles.row}>
      <View style={styles.rail} pointerEvents="none">
        <View
          style={[
            styles.line,
            {
              backgroundColor: lineColor,
              top: isFirst ? (showMarker ? 14 : 0) : 0,
              bottom: isLast ? (showMarker ? 14 : 0) : 0,
            },
          ]}
        />
        {showMarker ? (
          <View style={styles.markerSlot}>
            {row.kind === 'year' ? (
              <View style={[styles.yearNode, { backgroundColor: colors.primary }]} />
            ) : row.kind === 'month' ? (
              <View
                style={[
                  styles.monthNode,
                  { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                ]}
              />
            ) : isToday ? (
              <View style={[styles.todayOuter, { borderColor: colors.primary }]}>
                <View style={[styles.todayInner, { backgroundColor: colors.primary }]} />
              </View>
            ) : (
              <View
                style={[
                  styles.dayNode,
                  { backgroundColor: colors.surfaceMuted, borderColor: lineColor },
                ]}
              />
            )}
          </View>
        ) : (
          <View style={styles.entryTickWrap}>
            <View style={[styles.entryTick, { backgroundColor: lineColor }]} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        {row.kind === 'year' ? (
          <Text style={[styles.yearLabel, { color: colors.textPrimary }]}>{row.label}</Text>
        ) : null}

        {row.kind === 'month' ? (
          <View style={styles.monthBlock}>
            <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>{row.label}</Text>
            <View style={[styles.chapterRule, { backgroundColor: colors.borderLight }]} />
          </View>
        ) : null}

        {row.kind === 'day' ? (
          <View style={[styles.dayBlock, { opacity: dimLabel ? 0.35 : 1 }]}>
            <Text
              style={[
                styles.dayLabel,
                {
                  color: isToday ? colors.primary : colors.textPrimary,
                  fontWeight: isToday || row.dayKind === 'yesterday' ? '700' : '600',
                },
              ]}
            >
              {row.label}
            </Text>
            {row.sublabel ? (
              <Text style={[styles.daySub, { color: colors.textTertiary }]}>{row.sublabel}</Text>
            ) : null}
          </View>
        ) : null}

        {children}
      </View>
    </View>
  );
};

export const TIMELINE_RAIL_WIDTH = RAIL_WIDTH;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
    position: 'relative',
  },
  line: {
    position: 'absolute',
    left: LINE_LEFT,
    width: 1.5,
    borderRadius: 1,
  },
  markerSlot: {
    marginTop: 2,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  yearNode: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  monthNode: {
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  todayOuter: {
    width: 14,
    height: 14,
    borderRadius: 99,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayInner: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  dayNode: {
    width: 9,
    height: 9,
    borderRadius: 99,
    borderWidth: 2,
  },
  entryTickWrap: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  entryTick: {
    width: 5,
    height: 5,
    borderRadius: 99,
    opacity: 0.4,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingLeft: spacing.sm,
    paddingBottom: 2,
  },
  yearLabel: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
  },
  monthBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: 8,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    textTransform: 'capitalize',
  },
  chapterRule: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    opacity: 0.9,
  },
  dayBlock: {
    marginTop: spacing.md,
    marginBottom: 10,
  },
  dayLabel: {
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  daySub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
});

export default ChronologioTimelineRowView;
