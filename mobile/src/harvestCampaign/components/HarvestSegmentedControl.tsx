import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';

export type HarvestSegmentOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: HarvestSegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
};

export function HarvestSegmentedControl<T extends string>({
  value, options, onChange, ariaLabel,
}: Props<T>) {
  const { colors, tapMin } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={ariaLabel} style={[styles.row, { backgroundColor: colors.eventHarvestSoft }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              styles.option,
              { minHeight: tapMin, borderColor: selected ? colors.eventHarvest : 'transparent', backgroundColor: selected ? colors.surface : 'transparent' },
            ]}
          >
            <Text style={{ color: selected ? colors.eventHarvest : colors.textSecondary, fontWeight: selected ? '800' : '600', textAlign: 'center' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: radii.md, padding: 3, gap: spacing.xs },
  option: { flex: 1, borderWidth: 1, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
});
