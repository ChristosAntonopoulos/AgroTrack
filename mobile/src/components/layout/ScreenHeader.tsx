import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, radii, motion } from '../../theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  action?: React.ReactNode;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  action,
}) => {
  const { colors, fontScaleMultiplier, tapMin } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: 26 * fontScaleMultiplier }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
                fontSize: 14 * fontScaleMultiplier,
                lineHeight: 20 * fontScaleMultiplier,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ?? (actionLabel && onActionPress ? (
        <TouchableOpacity
          onPress={onActionPress}
          activeOpacity={motion.pressOpacity}
          style={[
            styles.actionChip,
            {
              backgroundColor: colors.primary + '20',
              borderColor: colors.primary + '50',
              minHeight: tapMin,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.primaryDark, fontSize: 12 * fontScaleMultiplier }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  textBlock: { flex: 1 },
  title: {
    ...typography.styles.h2,
    fontWeight: '700',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.styles.body,
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 20,
  },
  actionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  actionText: {
    ...typography.styles.caption,
    fontWeight: '700',
    fontSize: 12,
  },
});

export default ScreenHeader;
