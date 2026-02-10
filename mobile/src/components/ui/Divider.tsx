import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'small' | 'medium' | 'large';
  color?: string;
  thickness?: number;
}

const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  spacing: spacingProp = 'medium',
  color = colors.border,
  thickness = 1,
}) => {
  const getSpacing = () => {
    switch (spacingProp) {
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

  const spacingValue = getSpacing();

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          {
            width: thickness,
            backgroundColor: color,
            marginHorizontal: spacingValue,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          height: thickness,
          backgroundColor: color,
          marginVertical: spacingValue,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  vertical: {
    height: '100%',
  },
});

export default Divider;
