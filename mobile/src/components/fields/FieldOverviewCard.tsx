import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radii, spacing } from '../../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Soft left accent (field colour / olive). */
  accentColor?: string;
};

/** Shared limestone chrome for field overview sections. */
const FieldOverviewCard: React.FC<Props> = ({ children, style, accentColor }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          borderLeftColor: accentColor || colors.borderLight,
          borderLeftWidth: accentColor ? 3 : StyleSheet.hairlineWidth,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
});

export default FieldOverviewCard;
