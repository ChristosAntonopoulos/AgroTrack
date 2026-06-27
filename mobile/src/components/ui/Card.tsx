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
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
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
