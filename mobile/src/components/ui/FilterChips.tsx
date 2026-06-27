import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

export interface FilterChipOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

interface FilterChipsProps<T extends string = string> {
  options: FilterChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

function FilterChips<T extends string = string>({
  options,
  selected,
  onSelect,
}: FilterChipsProps<T>) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map(option => {
        const active = option.value === selected;
        const showCount = option.count !== undefined && option.count >= 0;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primaryDark : colors.surfaceElevated,
                borderColor: active ? colors.primaryDark : colors.border,
                minHeight: 40,
              },
            ]}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.textInverse : colors.textPrimary },
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
                    backgroundColor: active ? colors.textInverse + '25' : colors.surfaceMuted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: active ? colors.textInverse : colors.textSecondary },
                  ]}
                >
                  {option.count}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
  },
  label: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 13,
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
