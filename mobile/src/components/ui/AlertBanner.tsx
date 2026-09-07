import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii, motion } from '../../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type AlertBannerVariant = 'error' | 'warning';

export interface AlertBannerProps {
  variant: AlertBannerVariant;
  icon: IconName;
  message: string;
  onPress?: () => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ variant, icon, message, onPress }) => {
  const { colors, fontScaleMultiplier, tapMin } = useTheme();
  const isError = variant === 'error';
  const bg = isError ? colors.bannerErrorBg : colors.bannerWarningBg;
  const border = isError ? colors.bannerErrorBorder : colors.bannerWarningBorder;
  const iconColor = isError ? colors.error : colors.warningDark;

  const inner = (
    <View style={[styles.banner, { backgroundColor: bg, borderLeftColor: border }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text
        style={[
          styles.message,
          { color: colors.textPrimary, fontSize: 14 * fontScaleMultiplier, lineHeight: 20 * fontScaleMultiplier },
        ]}
      >
        {message}
      </Text>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={motion.pressOpacity}
        style={[styles.wrap, { minHeight: tapMin }]}
      >
        {inner}
      </TouchableOpacity>
    );
  }
  return <View style={styles.wrap}>{inner}</View>;
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderLeftWidth: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    ...typography.styles.bodySmall,
    flex: 1,
    fontWeight: '600',
    lineHeight: 20,
  },
});

export default AlertBanner;
