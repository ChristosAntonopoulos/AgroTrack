import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';
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
  const { colors, fontScaleMultiplier } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.primary + '25' }]}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: 18 * fontScaleMultiplier }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 13 * fontScaleMultiplier }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {actionLabel && onActionPress ? (
          <Button title={actionLabel} onPress={onActionPress} variant="text" size="small" />
        ) : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  titleContainer: { flex: 1 },
  title: {
    ...typography.styles.h4,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    ...typography.styles.bodySmall,
    marginTop: 2,
  },
  content: {},
});

export default Section;
