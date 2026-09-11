import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radii, motion, createElevation } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'muted' | 'featured';
  /** Left accent bar color (4px) — tasks/events */
  accentColor?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

const Card: React.FC<CardProps> = ({
  children,
  onPress,
  variant = 'default',
  accentColor,
  header,
  footer,
  style,
  padding = 'medium',
}) => {
  const { colors } = useTheme();

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'md'),
        };
      case 'outlined':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'muted':
        return {
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.borderLight,
        };
      case 'featured':
        return {
          backgroundColor: colors.primaryLight,
          borderWidth: 1,
          borderColor: colors.oliveBorder,
          ...createElevation(colors, 'sm'),
        };
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        };
    }
  };

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return spacing.sm;
      case 'large':
        return spacing.lg;
      default:
        return spacing.base;
    }
  };

  const cardStyle = [
    styles.card,
    getVariantStyles(),
    { padding: getPadding() },
    accentColor
      ? {
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
        }
      : null,
    style,
  ];

  const content = (
    <>
      {header ? <View style={styles.header}>{header}</View> : null}
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={motion.pressOpacity}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  header: {
    marginBottom: spacing.sm,
  },
  body: {
    flex: 1,
  },
  footer: {
    marginTop: spacing.sm,
  },
});

export default Card;
