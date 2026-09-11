import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing } from '../../theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Trailing controls (prefer HeaderIconButton) */
  action?: React.ReactNode;
  /** Slot under the title row (field pill, search, etc.) */
  context?: React.ReactNode;
  /** Compact mode for collapse-on-scroll */
  compact?: boolean;
  /** @deprecated Prefer `action` with HeaderIconButton */
  actionLabel?: string;
  /** @deprecated Prefer `action` with HeaderIconButton */
  onActionPress?: () => void;
}

/** Large-title chrome for tab roots — quiet, no competing borders. */
const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  action,
  context,
  compact = false,
}) => {
  const { colors, fontScaleMultiplier } = useTheme();
  const titleSize = (compact ? 20 : 28) * fontScaleMultiplier;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.topRow}>
        <View style={styles.textBlock}>
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontSize: titleSize,
                lineHeight: titleSize * 1.2,
              },
            ]}
            numberOfLines={compact ? 1 : 2}
          >
            {title}
          </Text>
          {subtitle && !compact ? (
            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.textSecondary,
                  fontSize: 14 * fontScaleMultiplier,
                  lineHeight: 20 * fontScaleMultiplier,
                },
              ]}
              numberOfLines={3}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action ? <View style={styles.actions}>{action}</View> : null}
      </View>
      {context && !compact ? <View style={styles.context}>{context}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  containerCompact: {
    paddingBottom: spacing.sm,
    minHeight: 44,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textBlock: { flex: 1, minWidth: 0 },
  title: {
    ...typography.styles.h2,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.styles.bodySmall,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  context: {
    gap: spacing.sm,
  },
});

export default ScreenHeader;
