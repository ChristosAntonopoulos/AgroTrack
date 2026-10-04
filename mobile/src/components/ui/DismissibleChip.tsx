import React from 'react';
import { Pressable, Text, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { motion, radii } from '../../theme';

type Props = {
  label: string;
  onDismiss: () => void;
  dotColor?: string;
  style?: ViewStyle;
};

/** Soft olive dismissible pill — active filters / scoped month chips. */
const DismissibleChip: React.FC<Props> = ({ label, onDismiss, dotColor, style }) => {
  const { colors, fontScaleMultiplier } = useTheme();

  return (
    <Pressable
      onPress={onDismiss}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: colors.primaryLight,
          borderColor: colors.oliveBorder,
          opacity: pressed ? motion.pressOpacity : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text
        style={[
          styles.label,
          { color: colors.primary, fontSize: 12 * fontScaleMultiplier },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Ionicons name="close" size={14} color={colors.primary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '70%',
  },
  label: {
    fontWeight: '600',
    flexShrink: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

export default DismissibleChip;
