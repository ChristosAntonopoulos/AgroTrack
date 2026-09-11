import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, radii, motion, createElevation } from '../theme';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  const { colors, tapMin, fontScaleMultiplier } = useTheme();

  return (
    <View style={styles.container}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          {icon}
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: 20 * fontScaleMultiplier }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary, fontSize: 15 * fontScaleMultiplier }]}>
          {description}
        </Text>
      ) : null}
      {action ? (
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.primary,
              minHeight: tapMin,
              ...createElevation(colors, 'sm'),
            },
          ]}
          onPress={action.onPress}
          activeOpacity={motion.pressOpacity}
        >
          <Text style={[styles.actionText, { color: colors.onOlive, fontSize: 16 * fontScaleMultiplier }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 280,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  title: {
    ...typography.styles.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  description: {
    ...typography.styles.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...typography.styles.button,
    fontWeight: '600',
  },
});

export default EmptyState;
