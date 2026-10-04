import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { appFonts, radii, spacing } from '../../theme';

export type HarvestSegmentOption<T extends string> = {
  value: T;
  label: string;
  /** Short extra line so the choice is obvious outdoors. */
  detail?: string;
};

type Props<T extends string> = {
  value: T;
  options: HarvestSegmentOption<T>[];
  onChange: (value: T) => void;
  /** Visible section title above the choices (also used for a11y). */
  label?: string;
  ariaLabel?: string;
};

/**
 * Harvest choice control — hard to miss outdoors.
 * Selected = filled dark olive + white text. Idle = white card + dark text + border.
 */
export function HarvestSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  ariaLabel,
}: Props<T>) {
  const { colors, tapMin, fontScaleMultiplier: scale } = useTheme();
  const title = label || ariaLabel;
  const many = options.length > 3;

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={ariaLabel || label} style={styles.wrap}>
      {title ? (
        <Text style={[styles.section, { color: colors.textPrimary, fontSize: 14 * scale }]}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.row, many && styles.rowWrap]}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.option,
                many && styles.optionHalf,
                {
                  minHeight: Math.max(52, tapMin),
                  backgroundColor: selected ? colors.primary : colors.surfaceElevated,
                  borderColor: selected ? colors.primaryDark : colors.border,
                  borderWidth: selected ? 2 : 1.5,
                  opacity: pressed && !selected ? 0.9 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: selected ? colors.onOlive : colors.primary,
                    backgroundColor: selected ? colors.onOlive : 'transparent',
                  },
                ]}
              >
                {selected ? (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                ) : null}
              </View>
              <View style={styles.copy}>
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
                  {option.label}
                </Text>
                {option.detail ? (
                  <Text
                    style={[
                      styles.detail,
                      {
                        color: selected ? 'rgba(255,255,255,0.88)' : colors.textSecondary,
                        fontSize: 12 * scale,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {option.detail}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  section: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowWrap: {
    flexWrap: 'wrap',
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionHalf: {
    minWidth: '47%',
    flexGrow: 1,
    flexBasis: '47%',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  label: {
    fontFamily: appFonts.bold,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  detail: {
    fontFamily: appFonts.semibold,
    fontWeight: '600',
    lineHeight: 16,
  },
});
