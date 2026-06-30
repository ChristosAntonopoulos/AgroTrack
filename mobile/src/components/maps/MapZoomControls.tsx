import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { createElevation } from '../../theme/elevation';

type MapZoomControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
};

const MapZoomControls: React.FC<MapZoomControlsProps> = ({ onZoomIn, onZoomOut }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated + 'E6',
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      <Pressable
        onPress={onZoomIn}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Zoom in"
      >
        <Ionicons name="add" size={20} color={colors.textPrimary} />
      </Pressable>
      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
      <Pressable
        onPress={onZoomOut}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Zoom out"
      >
        <Ionicons name="remove" size={20} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.7,
  },
  divider: {
    height: 1,
  },
});

export default MapZoomControls;
