import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, motion, radii } from '../../theme';
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
 * Simple Today / Totals segmented control — labels only, dark olive selected.
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
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          minHeight: Math.max(50, tapMin),
          ...createElevation(colors, 'sm'),
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
                minHeight: Math.max(44, tapMin - 4),
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
    gap: 4,
    padding: 4,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  label: {
    fontWeight: '800',
    letterSpacing: -0.15,
  },
});
