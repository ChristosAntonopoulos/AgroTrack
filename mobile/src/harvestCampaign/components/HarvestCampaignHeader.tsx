import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, spacing } from '../../theme';

type Props = {
  title: string;
  season: string;
  statusLabel?: string;
  statusTone?: 'live' | 'paused';
  context?: React.ReactNode;
};

/**
 * Harvest chrome — same title row as Χρήματα: one calm title, trailing status.
 */
export function HarvestCampaignHeader({
  title,
  season,
  statusLabel,
  statusTone = 'live',
  context,
}: Props) {
  const { colors, fontScaleMultiplier: scale } = useTheme();
  const paused = statusTone === 'paused';
  const titleSize = 20 * scale;

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.lead}>
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontSize: titleSize,
                lineHeight: titleSize * 1.15,
              },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          <Text
            style={[
              styles.season,
              {
                color: colors.textSecondary,
                fontSize: 14 * scale,
              },
            ]}
            numberOfLines={1}
            accessibilityLabel={season}
          >
            {season}
          </Text>
        </View>

        {statusLabel ? (
          <View style={styles.status}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: paused ? colors.warning : colors.success },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: paused ? colors.warningDark : colors.success,
                  fontSize: 12 * scale,
                },
              ]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {context ? <View style={styles.context}>{context}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  topRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  season: {
    fontFamily: appFonts.semibold,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: appFonts.semibold,
    fontWeight: '600',
  },
  context: {
    gap: 0,
  },
});

export default HarvestCampaignHeader;
