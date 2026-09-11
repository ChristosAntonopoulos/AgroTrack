import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { MapLayerType } from '../../utils/mapLayers';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';

export interface MapLayerToggleProps {
  value: MapLayerType;
  onChange: (layer: MapLayerType) => void;
  compact?: boolean;
}

const MapLayerToggle: React.FC<MapLayerToggleProps> = ({ value, onChange, compact }) => {
  const { colors } = useTheme();
  const { t } = useTranslation('fields');

  const options: { key: MapLayerType; label: string }[] = [
    { key: 'satellite', label: t('mapLayerSatellite') },
    { key: 'standard', label: t('mapLayerStreet') },
  ];

  return (
    <View
      style={[
        styles.container,
        compact && styles.compact,
        {
          backgroundColor: colors.surfaceElevated + 'E6',
          borderColor: colors.borderLight,
          ...createElevation(colors, 'sm'),
        },
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.btn,
              active && { backgroundColor: colors.primary },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.onOlive : colors.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  compact: {
    borderRadius: 8,
    padding: 2,
  },
  btn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 7,
  },
  label: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 11,
  },
});

export default MapLayerToggle;
