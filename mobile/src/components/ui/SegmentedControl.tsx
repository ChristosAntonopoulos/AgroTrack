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
  /** Quiet olive tonal selected (journal language). */
  tone?: 'default' | 'olive';
  /** Tighter height for dense chrome (e.g. Chronologio). */
  compact?: boolean;
  /** About 46px, softer inactive labels. */
  quiet?: boolean;
};

function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  fullWidth = false,
  style,
  tone = 'olive',
  compact = false,
  quiet = false,
}: SegmentedControlProps<T>) {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();
  const trackBg = colors.surfaceMuted;
  const selectedBg = tone === 'olive' ? colors.primaryLight : colors.surface;
  const selectedText = colors.primary;
  const safeOptions = Array.isArray(options) ? options : [];
  const trackMin = quiet ? 46 : compact ? 36 : Math.max(44, tapMin * 0.9);
  const segmentMin = quiet ? 38 : compact ? 30 : Math.max(36, tapMin * 0.75);

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: trackBg,
          borderColor: colors.borderLight,
          minHeight: trackMin,
          padding: quiet || compact ? 2 : 3,
          borderRadius: quiet ? 12 : undefined,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel}
    >
      {safeOptions.map(opt => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            disabled={opt.disabled}
            onPress={() => {
              if (!selected && !opt.disabled) onChange(opt.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              compact && styles.segmentCompact,
              {
                minHeight: segmentMin,
                borderRadius: quiet ? 8 : undefined,
                opacity: opt.disabled ? 0.45 : pressed ? motion.pressOpacity : 1,
                backgroundColor: selected ? selectedBg : 'transparent',
                borderColor: 'transparent',
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
                  color: selected ? selectedText : quiet ? colors.textTertiary : colors.textSecondary,
                  fontSize: (quiet ? 13 : compact ? 12 : 13) * fontScaleMultiplier,
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
    borderRadius: radii.control ?? 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 11,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 9,
  },
  label: {
    ...typography.styles.caption,
  },
});

export default SegmentedControl;
