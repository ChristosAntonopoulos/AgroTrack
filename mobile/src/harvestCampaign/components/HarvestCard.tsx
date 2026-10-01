import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, radii, spacing } from '../../theme';

export type HarvestCardTone = 'default' | 'hero' | 'nudge' | 'pending' | 'done' | 'muted';

type Props = {
  children: React.ReactNode;
  tone?: HarvestCardTone;
  /** Left accent stripe (grove / harvest fruit). */
  accent?: boolean;
  /** Tighter padding for rows that should not dominate the page. */
  compact?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared harvest paper island — one radius, border, and elevation language
 * for Today / Fields / Totals / Log / setup cards.
 */
export const HarvestCard: React.FC<Props> = ({
  children,
  tone = 'default',
  accent = false,
  compact = false,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  const palette = (() => {
    if (tone === 'nudge') {
      return {
        backgroundColor: colors.eventHarvestSoft,
        borderColor: 'transparent',
        borderWidth: 0,
        elevation: 'sm' as const,
        accentColor: colors.eventHarvest,
      };
    }
    if (tone === 'pending') {
      return {
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.warning,
        borderWidth: 1.5,
        elevation: 'sm' as const,
        accentColor: colors.warning,
      };
    }
    if (tone === 'done') {
      return {
        backgroundColor: colors.surfaceElevated,
        borderColor: 'transparent',
        borderWidth: 0,
        elevation: 'sm' as const,
        accentColor: colors.success,
      };
    }
    if (tone === 'muted') {
      return {
        backgroundColor: colors.surfaceMuted,
        borderColor: 'transparent',
        borderWidth: 0,
        elevation: 'flat' as const,
        accentColor: colors.textTertiary,
      };
    }
    if (tone === 'hero') {
      return {
        backgroundColor: colors.surfaceElevated,
        borderColor: 'transparent',
        borderWidth: 0,
        elevation: 'sm' as const,
        accentColor: colors.primary,
      };
    }
    return {
      backgroundColor: colors.surfaceElevated,
      borderColor: 'transparent',
      borderWidth: 0,
      elevation: 'sm' as const,
      accentColor: colors.eventHarvest,
    };
  })();

  const body = (
    <View
      style={[
        styles.card,
        accent && styles.withAccent,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          borderWidth: palette.borderWidth,
          ...createElevation(colors, palette.elevation),
        },
        style,
      ]}
    >
      {accent ? <View style={[styles.accent, { backgroundColor: palette.accentColor }]} /> : null}
      <View style={[styles.inner, compact && styles.innerCompact, accent && styles.innerAccent]}>
        {children}
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      {body}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  withAccent: {
    flexDirection: 'row',
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
  },
  inner: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  innerCompact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 0,
  },
  innerAccent: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});

export default HarvestCard;
