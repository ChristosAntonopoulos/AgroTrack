import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

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
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {action ?? (actionLabel && onActionPress ? (
        <TouchableOpacity
          onPress={onActionPress}
          style={[styles.actionChip, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '50' }]}
        >
          <Text style={[styles.actionText, { color: colors.primaryDark }]}>{actionLabel}</Text>
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
    borderRadius: 20,
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
