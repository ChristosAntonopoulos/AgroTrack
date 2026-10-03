import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii, motion, createElevation } from '../../theme';

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
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
  const { colors, fontScaleMultiplier } = useTheme();
  const trackBg = colors.surfaceMuted;
  const selectedBg = tone === 'olive' ? colors.surface : colors.surfaceElevated;
  const selectedText = tone === 'olive' ? colors.primary : colors.textPrimary;
  const safeOptions = Array.isArray(options) ? options : [];
  const trackMin = quiet ? 40 : compact ? 36 : 40;
  const segmentMin = quiet ? 34 : compact ? 30 : 34;

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: trackBg,
          borderColor: colors.borderLight,
          minHeight: trackMin,
          padding: 3,
          borderRadius: quiet || compact ? 12 : 14,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel}
    >
      {safeOptions.map((opt) => {
        const selected = opt.value === value;
        const labelColor = selected
          ? selectedText
          : quiet
            ? colors.textTertiary
            : colors.textSecondary;
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
                borderRadius: quiet || compact ? 9 : 11,
                opacity: opt.disabled ? 0.45 : pressed ? motion.pressOpacity : 1,
                backgroundColor: selected ? selectedBg : 'transparent',
                borderWidth: selected ? StyleSheet.hairlineWidth : 0,
                borderColor: selected ? colors.oliveBorder : 'transparent',
                flex: fullWidth ? 1 : undefined,
                ...(selected ? createElevation(colors, 'sm') : null),
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !!opt.disabled }}
            accessibilityLabel={opt.label}
          >
            <View style={styles.segmentInner}>
              {opt.icon ? <View style={styles.iconSlot}>{opt.icon}</View> : null}
              <Text
                style={[
                  styles.label,
                  {
                    color: labelColor,
                    fontSize: (quiet || compact ? 12 : 13) * fontScaleMultiplier,
                    fontWeight: selected ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </View>
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
    gap: 2,
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 9,
  },
  segmentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.styles.caption,
  },
});

export default SegmentedControl;
