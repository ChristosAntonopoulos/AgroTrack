import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, radii, spacing } from '../../theme';

type Props = {
  title: string;
  season: string;
  statusLabel?: string;
  statusTone?: 'live' | 'paused';
  context?: React.ReactNode;
};

/**
 * Compact harvest chrome: calm title + season chip, crisp status on the right.
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

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.lead}>
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontSize: 22 * scale,
                lineHeight: 26 * scale,
              },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          <View
            style={[
              styles.seasonChip,
              {
                backgroundColor: colors.primaryLight,
              },
            ]}
            accessibilityLabel={season}
          >
            <Text
              style={[
                styles.seasonText,
                {
                  color: colors.primaryDark,
                  fontSize: 12 * scale,
                },
              ]}
              numberOfLines={1}
            >
              {season}
            </Text>
          </View>
        </View>

        {statusLabel ? (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: paused ? colors.warningLight : colors.successLight,
              },
            ]}
          >
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
    paddingTop: 2,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  lead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    minWidth: 0,
  },
  title: {
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seasonChip: {
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  seasonText: {
    fontFamily: appFonts.bold,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  context: {
    gap: spacing.sm,
  },
});

export default HarvestCampaignHeader;
