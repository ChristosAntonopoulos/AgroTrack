import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, spacingPatterns } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

const Card: React.FC<CardProps> = ({
  children,
  onPress,
  variant = 'default',
  header,
  footer,
  style,
  padding = 'medium',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.white,
          borderWidth: 0,
          ...spacingPatterns.shadow.lg,
        };
      case 'outlined':
        return {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.border,
          ...spacingPatterns.shadow.sm,
        };
      default:
        return {
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.border,
          ...spacingPatterns.shadow.md,
        };
    }
  };

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return spacing.sm;
      case 'medium':
        return spacing.base;
      case 'large':
        return spacing.lg;
      default:
        return spacing.base;
    }
  };

  const variantStyles = getVariantStyles();
  const cardPadding = getPadding();

  const CardComponent = onPress ? TouchableOpacity : View;
  const isPressable: boolean = !!onPress;

  // Ensure activeOpacity is only spread if isPressable is a strict boolean true
  const touchableProps = isPressable ? { activeOpacity: 0.7 } : {};

  if (__DEV__ && isPressable) {
    // Only log if there's a potential issue
    if (typeof activeOpacity !== 'undefined' && typeof (touchableProps as any).activeOpacity !== 'number') {
      console.warn('[Card] ⚠️ activeOpacity is not a number! Type:', typeof (touchableProps as any).activeOpacity);
    }
  }

  return (
    <CardComponent
      style={[
        styles.card,
        variantStyles,
        { padding: cardPadding },
        style,
      ]}
      onPress={onPress}
      {...touchableProps}
    >
      {header ? <View style={styles.header}>{header}</View> : null}
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: spacingPatterns.borderRadius.lg,
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
