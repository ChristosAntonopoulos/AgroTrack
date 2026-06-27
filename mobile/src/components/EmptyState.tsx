import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, spacingPatterns } from '../theme';
import { createElevation } from '../theme/elevation';

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
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          {icon}
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      ) : null}
      {action ? (
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.primaryDark, ...createElevation(colors, 'sm') },
          ]}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionText, { color: colors.textInverse }]}>{action.label}</Text>
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
    borderRadius: spacingPatterns.borderRadius.md,
    marginTop: spacing.sm,
  },
  actionText: {
    ...typography.styles.button,
    fontWeight: '600',
  },
});

export default EmptyState;
