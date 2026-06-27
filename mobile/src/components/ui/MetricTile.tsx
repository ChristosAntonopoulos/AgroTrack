import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface MetricTileProps {
  icon: IconName;
  value: string | number;
  label: string;
  accentColor?: string;
  onPress?: () => void;
}

const MetricTile: React.FC<MetricTileProps> = ({
  icon,
  value,
  label,
  accentColor,
  onPress,
}) => {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.primaryDark;

  const content = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.textTertiary}
          style={styles.chevron}
        />
      ) : null}
    </>
  );

  const tileStyle = [
    styles.tile,
    {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.borderLight,
      ...createElevation(colors, 'sm'),
    },
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={tileStyle} onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={tileStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 108,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    ...typography.styles.h3,
    fontWeight: '700',
    fontSize: 22,
    marginBottom: 2,
  },
  label: {
    ...typography.styles.caption,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
  },
  chevron: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
});

export default MetricTile;
