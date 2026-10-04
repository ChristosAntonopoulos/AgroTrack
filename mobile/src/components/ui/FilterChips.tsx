import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii, motion } from '../../theme';

export interface FilterChipOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  /** Optional colour tip (e.g. field colour). */
  dotColor?: string;
}

interface FilterChipsProps<T extends string = string> {
  options: FilterChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  /** Horizontal scroll (default) or wrapping row. */
  wrap?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Shared selection chips — Fields, Tasks, Chronologio filters, Dashboard periods.
 */
function FilterChips<T extends string = string>({
  options,
  selected,
  onSelect,
  wrap = false,
  compact = false,
  style,
  contentStyle,
}: FilterChipsProps<T>) {
  const { colors, fontScaleMultiplier, tapMin } = useTheme();
  const minHeight = compact ? Math.max(32, tapMin * 0.65) : tapMin;

  const chips = options.map(option => {
    const active = option.value === selected;
    const showCount = option.count !== undefined && option.count >= 0;
    return (
      <TouchableOpacity
        key={option.value}
        onPress={() => onSelect(option.value)}
        style={[
          styles.chip,
          compact && styles.chipCompact,
          {
            backgroundColor: active ? colors.primaryLight : colors.surface,
            borderColor: active ? colors.oliveBorder : colors.border,
            minHeight,
          },
        ]}
        activeOpacity={motion.pressOpacity}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        {option.dotColor ? (
          <View style={[styles.dot, { backgroundColor: option.dotColor }]} />
        ) : null}
        <Text
          style={[
            styles.label,
            {
              color: active ? colors.primary : colors.textPrimary,
              fontSize: (compact ? 12 : 13) * fontScaleMultiplier,
              fontWeight: active ? '700' : '600',
            },
          ]}
          numberOfLines={1}
        >
          {option.label}
        </Text>
        {showCount ? (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: active ? colors.primary + '22' : colors.surfaceMuted,
              },
            ]}
          >
            <Text
              style={[
                styles.countText,
                {
                  color: active ? colors.primary : colors.textSecondary,
                  fontSize: 11 * fontScaleMultiplier,
                },
              ]}
            >
              {option.count}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  });

  if (wrap) {
    return (
      <View style={[styles.wrapRow, contentStyle, style]} accessibilityRole="tablist">
        {chips}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={[styles.row, compact && styles.rowCompact, contentStyle]}
    >
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  rowCompact: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  chipCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 36,
  },
  label: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 13,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default FilterChips;
