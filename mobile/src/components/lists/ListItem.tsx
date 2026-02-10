import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, spacingPatterns } from '../../theme';
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
  // Validate variant prop
  const validVariants = ['default', 'selected', 'disabled'];
  if (!validVariants.includes(variant)) {
    console.warn(`Invalid variant prop in ListItem. Received: ${variant}. Using default.`);
    variant = 'default';
  }

  // Props are already correct types, use directly
  const getVariantStyles = () => {
    switch (variant) {
      case 'selected':
        return {
          backgroundColor: colors.primaryLight + '10',
        };
      case 'disabled':
        return {
          opacity: 0.5,
        };
      default:
        return {};
    }
  };

  const Component = onPress && variant !== 'disabled' ? TouchableOpacity : View;
  const isPressable = !!onPress && variant !== 'disabled';
  const isDisabled: boolean = variant === 'disabled';
  
  // Ensure disabled is a strict boolean for native TouchableOpacity component
  const safeDisabled = toBoolean(isDisabled, 'ListItem.disabled');

  return (
    <>
      <Component
        style={[
          styles.container,
          getVariantStyles(),
          isPressable && styles.pressable,
        ]}
        onPress={onPress}
        disabled={safeDisabled}
        {...(isPressable && { activeOpacity: 0.7 })}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              variant === 'disabled' && styles.titleDisabled,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                variant === 'disabled' && styles.subtitleDisabled,
              ]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightContent ? <View style={styles.rightContent}>{rightContent}</View> : null}
        {rightIcon && !rightContent ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </Component>
      {showDivider ? <View style={styles.divider} /> : null}
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
  pressable: {
    // TouchableOpacity styles
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
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs / 2,
  },
  titleDisabled: {
    color: colors.textTertiary,
  },
  subtitle: {
    ...typography.styles.bodySmall,
    color: colors.textSecondary,
  },
  subtitleDisabled: {
    color: colors.textTertiary,
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
    backgroundColor: colors.borderLight,
    marginLeft: spacing.base,
  },
});

export default ListItem;
