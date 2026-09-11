import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii, motion } from '../../theme';

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type SegmentedControlProps<T extends string = string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
};

function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth = false,
  style,
}: SegmentedControlProps<T>) {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.borderLight,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel}
    >
      {options.map(opt => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            disabled={opt.disabled}
            onPress={() => {
              if (!selected && !opt.disabled) onChange(opt.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              {
                minHeight: Math.max(36, tapMin * 0.85),
                opacity: opt.disabled ? 0.45 : pressed ? motion.pressOpacity : 1,
                backgroundColor: selected ? colors.primaryLight : 'transparent',
                borderColor: selected ? colors.oliveBorder : 'transparent',
                flex: fullWidth ? 1 : undefined,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !!opt.disabled }}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.primary : colors.textSecondary,
                  fontSize: 13 * fontScaleMultiplier,
                  fontWeight: selected ? '600' : '500',
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
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    gap: 2,
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.styles.caption,
  },
});

export default SegmentedControl;
