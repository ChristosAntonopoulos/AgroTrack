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
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  const palette = (() => {
    if (tone === 'nudge') {
      return {
        backgroundColor: colors.eventHarvestSoft,
        borderColor: colors.oliveBorder,
        elevation: 'sm' as const,
        accentColor: colors.eventHarvest,
      };
    }
    if (tone === 'pending') {
      return {
        backgroundColor: colors.surface,
        borderColor: colors.warning,
        elevation: 'flat' as const,
        accentColor: colors.warning,
      };
    }
    if (tone === 'done') {
      return {
        backgroundColor: colors.surface,
        borderColor: colors.borderLight,
        elevation: 'flat' as const,
        accentColor: colors.success,
      };
    }
    if (tone === 'muted') {
      return {
        backgroundColor: colors.surfaceMuted,
        borderColor: colors.borderLight,
        elevation: 'flat' as const,
        accentColor: colors.textTertiary,
      };
    }
    if (tone === 'hero') {
      return {
        backgroundColor: colors.surface,
        borderColor: colors.borderLight,
        elevation: 'sm' as const,
        accentColor: colors.eventHarvest,
      };
    }
    return {
      backgroundColor: colors.surface,
      borderColor: colors.borderLight,
      elevation: 'flat' as const,
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
          ...createElevation(colors, palette.elevation),
        },
        style,
      ]}
    >
      {accent ? <View style={[styles.accent, { backgroundColor: palette.accentColor }]} /> : null}
      <View style={[styles.inner, accent && styles.innerAccent]}>{children}</View>
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
    borderWidth: StyleSheet.hairlineWidth,
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
  innerAccent: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});

export default HarvestCard;
