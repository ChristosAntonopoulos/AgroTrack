import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, motion, radii, spacing } from '../../theme';
import type { HarvestModeView } from '../types';

type Props = {
  value: HarvestModeView;
  onChange: (value: HarvestModeView) => void;
  todayLabel: string;
  todayHint: string;
  seasonLabel: string;
  seasonHint: string;
  ariaLabel?: string;
};

/**
 * Today / Totals — clear segmented choice, readable outdoors and in dark mode.
 */
export function HarvestModeSwitcher({
  value,
  onChange,
  todayLabel,
  todayHint,
  seasonLabel,
  seasonHint,
  ariaLabel,
}: Props) {
  const { colors, tapMin, fontScaleMultiplier: scale } = useTheme();

  const options: {
    id: HarvestModeView;
    label: string;
    hint: string;
  }[] = [
    { id: 'today', label: todayLabel, hint: todayHint },
    { id: 'season', label: seasonLabel, hint: seasonHint },
  ];

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel}
      style={[
        styles.track,
        {
          minHeight: Math.max(44, tapMin - 4),
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
        },
      ]}
    >
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => {
              if (!selected) onChange(opt.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${opt.label}. ${opt.hint}`}
            style={({ pressed }) => [
              styles.option,
              {
                minHeight: Math.max(36, tapMin - 12),
                backgroundColor: selected ? colors.primary : 'transparent',
                opacity: pressed && !selected ? motion.pressOpacity : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.onOlive : colors.textPrimary,
                  fontSize: 15 * scale,
                  fontWeight: selected ? '800' : '700',
                },
              ]}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    padding: 4,
    borderRadius: radii.lg,
    borderWidth: 1.5,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  label: {
    fontFamily: appFonts.bold,
    letterSpacing: -0.1,
  },
});
