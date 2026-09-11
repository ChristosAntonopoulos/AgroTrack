import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, motion } from '../../theme';
import Button from '../ui/Button';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  action?: React.ReactNode;
  actions?: Array<{
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'ghost';
  }>;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  action,
  actions,
}) => {
  const { colors, fontScaleMultiplier, tapMin } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {showBackButton ? (
          <TouchableOpacity
            style={[styles.backButton, { minWidth: tapMin, minHeight: tapMin }]}
            onPress={onBackPress}
            activeOpacity={motion.pressOpacity}
          >
            <Text style={[styles.backIcon, { color: colors.primary }]}>←</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              { color: colors.textPrimary, fontSize: 24 * fontScaleMultiplier },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary, fontSize: 14 * fontScaleMultiplier },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
      {actions && actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a, index) => (
            <Button
              key={index}
              title={a.label}
              onPress={a.onPress}
              variant={a.variant || 'primary'}
              size="small"
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.base,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.styles.h2,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...typography.styles.body,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default PageHeader;
