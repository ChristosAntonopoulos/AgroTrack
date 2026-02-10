import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import Button from '../ui/Button';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  actions?: Array<{
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'text';
  }>;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  actions,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {actions && actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action, index) => (
            <Button
              key={index}
              title={action.label}
              onPress={action.onPress}
              variant={action.variant || 'primary'}
              size="small"
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.base,
    marginBottom: spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  backButton: {
    marginRight: spacing.base,
    padding: spacing.xs,
  },
  backIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.styles.h2,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export default PageHeader;
