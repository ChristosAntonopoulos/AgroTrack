import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { motion, spacing } from '../../theme';

export type ChronologioZoomTabOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string = string> = {
  options: ChronologioZoomTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/**
 * Quiet paper-tray zoom control — Days / Months / Years (web .chrono-view-tabs).
 */
function ChronologioZoomTabs<T extends string = string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const { colors, fontScaleMultiplier } = useTheme();

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.borderLight,
        },
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => {
              if (!selected) onChange(opt.value);
            }}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: selected ? colors.primaryLight : 'transparent',
                borderColor: selected ? colors.oliveBorder : 'transparent',
                opacity: pressed ? motion.pressOpacity : 1,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.textPrimary : colors.textSecondary,
                  fontSize: 14 * fontScaleMultiplier,
                  fontWeight: selected ? '650' as '600' : '500',
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
    alignSelf: 'stretch',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 2,
    marginBottom: spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: -0.1,
  },
});

export default ChronologioZoomTabs;
