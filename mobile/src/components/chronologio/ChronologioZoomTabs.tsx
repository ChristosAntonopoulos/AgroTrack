import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, createElevation, motion, spacing } from '../../theme';

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
 * Segmented zoom control — Days / Months / Years.
 * Selected pill sits raised on the track for clear outdoor readability.
 */
function ChronologioZoomTabs<T extends string = string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const { colors, fontScaleMultiplier, tapMin } = useTheme();

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
                minHeight: Math.max(40, tapMin - 8),
                backgroundColor: selected ? colors.surfaceElevated : 'transparent',
                opacity: pressed && !selected ? motion.pressOpacity : 1,
              },
              selected ? createElevation(colors, 'sm') : null,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.textPrimary : colors.textSecondary,
                  fontSize: 13.5 * fontScaleMultiplier,
                  fontFamily: selected ? appFonts.bold : appFonts.semibold,
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
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
  },
  tab: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: -0.15,
  },
});

export default ChronologioZoomTabs;
