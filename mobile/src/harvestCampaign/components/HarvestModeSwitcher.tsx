import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, motion, spacing } from '../../theme';
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
 * Today / Totals — quiet text tabs, not a second chrome layer.
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
      style={[styles.track, { minHeight: Math.max(40, tapMin - 4) }]}
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
                borderBottomColor: selected ? colors.primary : 'transparent',
                opacity: pressed && !selected ? motion.pressOpacity : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.textPrimary : colors.textSecondary,
                  fontSize: 15 * scale,
                  fontWeight: selected ? '700' : '600',
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
    gap: spacing.md,
  },
  option: {
    paddingHorizontal: 2,
    paddingVertical: 6,
    borderBottomWidth: 2,
  },
  label: {
    fontFamily: appFonts.semibold,
    letterSpacing: -0.1,
  },
});
