import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, motion, createElevation } from '../../theme';
import { hexToRgba } from '../../utils/hexToRgba';

export interface AccentCardProps {
  children: React.ReactNode;
  /** Primary accent — 4px left bar + faint left wash (~11%, fades by ~28%). */
  accentColor?: string | null;
  /** Optional 2px top hairline (web secondary accent). */
  secondaryColor?: string | null;
  /** Optional very soft right fade — single translucent layer, not stripe bands. */
  endColor?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: 'none' | 'small' | 'medium' | 'large';
  compact?: boolean;
}

/**
 * Limestone accent shell — matches web AccentCard.css.
 * Faint left wash only; do not tint the whole card.
 */
const AccentCard: React.FC<AccentCardProps> = ({
  children,
  accentColor,
  secondaryColor,
  endColor,
  onPress,
  style,
  padding = 'medium',
  compact = false,
}) => {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;

  const pad =
    padding === 'none'
      ? 0
      : padding === 'small' || compact
        ? spacing.sm + 2
        : padding === 'large'
          ? spacing.lg
          : spacing.base;

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: accent,
    borderRadius: compact ? radii.lg : radii.xl,
    padding: pad,
    overflow: 'hidden',
    position: 'relative',
    ...createElevation(colors, 'sm'),
  };

  const washes = (
    <>
      {/* Faint left wash — ~28% width, ~11% tint (web AccentCard) */}
      <View
        pointerEvents="none"
        style={[styles.leftWash, { backgroundColor: hexToRgba(accent, 0.11) }]}
      />
      {secondaryColor ? (
        <View
          pointerEvents="none"
          style={[styles.topHairline, { backgroundColor: secondaryColor, opacity: 0.55 }]}
        />
      ) : null}
      {endColor ? (
        <View
          pointerEvents="none"
          style={[styles.endWash, { backgroundColor: hexToRgba(endColor, 0.08) }]}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        activeOpacity={motion.pressOpacity}
      >
        {washes}
        <View style={styles.content}>{children}</View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {washes}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  leftWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '28%',
    zIndex: 0,
  },
  endWash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '22%',
    zIndex: 0,
  },
  topHairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 1,
  },
  content: {
    zIndex: 2,
    position: 'relative',
  },
});

export default AccentCard;
