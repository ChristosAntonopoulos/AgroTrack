import React from 'react';
import { View, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  motif: IconName;
  /** Small icon well in the top-left (launcher style). */
  icon?: IconName;
  /** Warmer gold motif — use sparingly (edit / harvest-adjacent). */
  gold?: boolean;
  /** Compact padding for hero stats. */
  compact?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Launcher-like paper card with a soft Ionicons watermark.
 * Scoped for Field Details only — do not use on field list cards.
 */
const FieldDetailMotifCard: React.FC<Props> = ({
  motif,
  icon,
  gold = false,
  compact = false,
  onPress,
  accessibilityLabel,
  style,
  children,
}) => {
  const { colors, isDark } = useTheme();

  const oliveInk = isDark ? colors.olive : '#52733F';
  const iconInk = isDark ? colors.primary : '#587747';
  const iconTile = isDark ? colors.primaryLight : '#E6EDDE';
  const goldTile = isDark ? 'rgba(180, 138, 71, 0.2)' : '#F2EBDD';
  const goldInk = isDark ? colors.accentGold : '#9A7135';
  const pressedSurface = isDark ? colors.surfaceHover : '#F5F7F0';
  const motifInk = gold ? goldInk : oliveInk;

  const shadow = !isDark
    ? {
        shadowColor: '#273625',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.055,
        shadowRadius: 18,
        elevation: 1,
      }
    : null;

  const content = (pressed: boolean) => (
    <View
      style={[
        styles.shell,
        compact && styles.shellCompact,
        shadow,
        {
          backgroundColor: pressed && onPress ? pressedSurface : colors.surfaceElevated,
          borderColor: gold ? goldInk : colors.border,
          borderWidth: gold ? 1.5 : 1,
          transform: pressed && onPress ? [{ scale: 0.99 }] : undefined,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.motifClip}>
        <Ionicons
          name={motif}
          size={compact ? 56 : 78}
          color={motifInk}
          style={[styles.motif, { opacity: gold ? 0.14 : 0.11 }, compact && styles.motifCompact]}
        />
      </View>
      {icon ? (
        <View style={[styles.iconWell, { backgroundColor: gold ? goldTile : iconTile }]}>
          <Ionicons name={icon} size={18} color={gold ? goldInk : iconInk} />
        </View>
      ) : null}
      <View style={styles.foreground}>{children}</View>
    </View>
  );

  if (!onPress) return content(false);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  shell: {
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  shellCompact: {
    paddingHorizontal: spacing.sm + 2,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    minHeight: 88,
  },
  motifClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    overflow: 'hidden',
  },
  motif: {
    position: 'absolute',
    right: -10,
    bottom: -14,
  },
  motifCompact: {
    right: -8,
    bottom: -10,
  },
  iconWell: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    zIndex: 1,
  },
  foreground: {
    zIndex: 1,
    gap: 6,
  },
});

export default FieldDetailMotifCard;
