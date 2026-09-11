import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { createElevation, motion, radii, touch } from '../../theme';

export type HeaderIconButtonProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  /** Soft fill when the control is “on” (filters active, etc.) */
  active?: boolean;
  badge?: number | string;
  size?: number;
  /** 34pt control for dense journal chrome. */
  compact?: boolean;
};

/** Circular trailing header control — used on tab roots and native headerRight. */
const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  active = false,
  badge,
  size = 20,
  compact = false,
}) => {
  const { colors } = useTheme();
  const dim = compact ? 34 : touch.icon;
  const iconSize = compact ? 18 : size;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btn,
        {
          width: dim,
          height: dim,
          minWidth: compact ? 34 : touch.min * 0.9,
          minHeight: compact ? 34 : touch.min * 0.9,
          backgroundColor: active ? colors.primaryLight : colors.surface,
          borderColor: active ? colors.oliveBorder : colors.borderLight,
          opacity: pressed ? motion.pressOpacity : 1,
          ...createElevation(colors, active ? 'sm' : 'flat'),
        },
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={active ? colors.primary : colors.textSecondary} />
      {badge != null && badge !== 0 && badge !== '0' ? (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={[styles.badgeText, { color: colors.onOlive }]}>
            {typeof badge === 'number' && badge > 99 ? '99+' : String(badge)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default HeaderIconButton;
