import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { typography, spacing, motion } from '../../theme';
import { toBoolean } from '../../utils/booleanConverter';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'selected' | 'disabled';
  showDivider?: boolean;
}

const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  rightContent,
  onPress,
  variant = 'default',
  showDivider = true,
}) => {
  const { colors } = useTheme();
  const safeVariant = ['default', 'selected', 'disabled'].includes(variant) ? variant : 'default';

  const getVariantStyles = () => {
    switch (safeVariant) {
      case 'selected':
        return { backgroundColor: colors.surfaceSelected };
      case 'disabled':
        return { opacity: 0.5 };
      default:
        return {};
    }
  };

  const isPressable = !!onPress && safeVariant !== 'disabled';
  const safeDisabled = toBoolean(safeVariant === 'disabled');

  const content = (
    <>
      {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: safeVariant === 'disabled' ? colors.textTertiary : colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              { color: safeVariant === 'disabled' ? colors.textTertiary : colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightContent ? <View style={styles.rightContent}>{rightContent}</View> : null}
      {rightIcon && !rightContent ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
    </>
  );

  return (
    <>
      {isPressable ? (
        <TouchableOpacity
          style={[styles.container, getVariantStyles()]}
          onPress={onPress}
          disabled={safeDisabled}
          activeOpacity={motion.pressOpacity}
        >
          {content}
        </TouchableOpacity>
      ) : (
        <View style={[styles.container, getVariantStyles()]}>{content}</View>
      )}
      {showDivider ? (
        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
    minHeight: 56,
  },
  leftIcon: {
    marginRight: spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.styles.body,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  subtitle: {
    ...typography.styles.bodySmall,
  },
  rightContent: {
    marginLeft: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginLeft: spacing.base,
  },
});

export default ListItem;
