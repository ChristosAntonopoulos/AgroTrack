import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, motion, createElevation } from '../../theme';

export interface AccentCardProps {
  children: React.ReactNode;
  accentColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

/** Card with 4px left accent + soft wash — matches web AccentCard */
const AccentCard: React.FC<AccentCardProps> = ({
  children,
  accentColor,
  onPress,
  style,
  padding = 'medium',
}) => {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;
  const pad =
    padding === 'none'
      ? 0
      : padding === 'small'
        ? spacing.sm
        : padding === 'large'
          ? spacing.lg
          : spacing.base;

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: accent,
    borderRadius: radii.xl,
    padding: pad,
    overflow: 'hidden',
    ...createElevation(colors, 'sm'),
  };

  if (onPress) {
    return (
      <TouchableOpacity style={[cardStyle, style]} onPress={onPress} activeOpacity={motion.pressOpacity}>
        <View style={[styles.wash, { backgroundColor: accent + '12' }]} pointerEvents="none" />
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      <View style={[styles.wash, { backgroundColor: accent + '12' }]} pointerEvents="none" />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  wash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
    borderRadius: radii.xl,
  },
});

export default AccentCard;
