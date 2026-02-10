import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import Button from '../ui/Button';

export interface SectionProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  children,
}) => {
  if (__DEV__) {
    console.log('[Section] Rendering - title:', title);
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onActionPress ? (
          <Button
            title={actionLabel}
            onPress={onActionPress}
            variant="text"
            size="small"
          />
        ) : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary + '20',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.styles.h4,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs / 2,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  subtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs / 2,
  },
  content: {
    // Content styles
  },
});

export default Section;
