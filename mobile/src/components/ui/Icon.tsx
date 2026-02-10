import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

export interface IconProps {
  name: string; // Emoji or icon identifier
  size?: number;
  color?: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = colors.textPrimary,
}) => {
  // For now, using emoji/text-based icons
  // Easy to replace with icon library later (e.g., react-native-vector-icons)
  return (
    <Text
      style={[
        styles.icon,
        {
          fontSize: size,
          color: color,
        },
      ]}
    >
      {name}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});

export default Icon;
