import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
import { createElevation } from '../../theme/elevation';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface OverviewMetricCardProps {
  icon: IconName;
  value: string | number;
  label: string;
  subtitle?: string;
  subtitleColor?: string;
  accentColor?: string;
  onPress?: () => void;
  /** Override fixed strip width (e.g. 2-column grid on narrow screens). */
  width?: number;
}

const CARD_WIDTH = 158;
const CARD_GAP = spacing.sm;

const OverviewMetricCard: React.FC<OverviewMetricCardProps> = ({
  icon,
  value,
  label,
  subtitle,
  subtitleColor,
  accentColor,
  onPress,
  width,
}) => {
  const { colors } = useTheme();
  const accent = accentColor ?? colors.primaryDark;
  const subColor = subtitleColor ?? colors.textTertiary;

  const body = (
    <>
      <View style={[styles.iconWrap, { backgroundColor: accent + '20' }]}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={2}>
        {label}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: subColor }]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  const cardStyle = [
    styles.card,
    width != null ? { width } : null,
    {
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.borderLight,
      ...createElevation(colors, 'md'),
    },
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8}>
        {body}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{body}</View>;
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    minHeight: 132,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    ...typography.styles.h2,
    fontWeight: '800',
    fontSize: 28,
    letterSpacing: -0.5,
    lineHeight: 32,
    marginBottom: 2,
  },
  label: {
    ...typography.styles.bodySmall,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.styles.caption,
    fontWeight: '600',
    fontSize: 11,
    lineHeight: 14,
  },
});

export const OVERVIEW_METRIC_CARD_WIDTH = CARD_WIDTH;
export const OVERVIEW_METRIC_CARD_GAP = CARD_GAP;
export default OverviewMetricCard;
